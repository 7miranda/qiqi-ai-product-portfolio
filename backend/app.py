"""Production WSGI adapter. Domain writes remain in the tested MySQL Store."""
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import secrets
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/crossbound-local'))
import pymysql
from server import Store, TABLES

log = logging.getLogger('gunicorn.error')
STATUS = {200:'OK',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',405:'Method Not Allowed',413:'Payload Too Large',500:'Internal Server Error',503:'Service Unavailable'}
ACTIONS = {'review', 'release', 'delete-user', 'lead-status', 'retry-delivery', 'export-leads'}

def verify_schema(store):
    """Fail startup if migration history differs; serving never needs DDL privileges."""
    with store.connect() as db:
        applied = dict(db.execute('SELECT name,checksum FROM schema_migrations'))
        for file in sorted((ROOT/'database/mysql').glob('*.sql')):
            digest = hashlib.sha256(file.read_text(encoding='utf-8').encode()).hexdigest()
            if applied.get(file.name) != digest:
                raise RuntimeError('Apply database migrations before starting the backend: ' + file.name)

def create_app(store=None, token=None, context=None, origin=None):
    context = context if context is not None else os.environ.get('CROSSBOUND_CONTEXT_PATH', '/crossbound')
    if not re.fullmatch(r'(?:/[A-Za-z0-9_-]+)+', context):
        raise ValueError('CROSSBOUND_CONTEXT_PATH must be a path without a trailing slash')
    origin = origin or os.environ.get('CROSSBOUND_PUBLIC_ORIGIN', '')
    parsed = urlsplit(origin)
    if parsed.scheme not in ('http','https') or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or parsed.username:
        raise ValueError('Set CROSSBOUND_PUBLIC_ORIGIN to the exact public origin (no path or trailing slash)')
    token = token or os.environ.get('CROSSBOUND_ADMIN_TOKEN', '')
    if len(token) < 32:
        raise ValueError('CROSSBOUND_ADMIN_TOKEN must have at least 32 characters')
    if store is None:
        from configuration import validate_environment
        validate_environment()
        if not os.environ.get('CROSSBOUND_CONTACT_KEY'):
            raise ValueError('Set and securely back up CROSSBOUND_CONTACT_KEY before deployment')
        data_dir = Path(os.environ.get('CROSSBOUND_DATA_DIR', '/app/data'))
        data_dir.mkdir(parents=True, exist_ok=True)
        store = Store(data_dir=data_dir, auto_migrate=False)
        verify_schema(store)
    api = context + '/api/'
    local_health_hosts = {'127.0.0.1:' + os.environ.get('PORT','5017'), 'localhost:' + os.environ.get('PORT','5017')}

    def app(environ, start_response):
        path = environ.get('PATH_INFO','')
        method = environ.get('REQUEST_METHOD','GET')
        def reply(code, data, mime='application/json; charset=utf-8'):
            body = data.encode('utf-8') if isinstance(data,str) else json.dumps(data,ensure_ascii=False,default=str).encode('utf-8')
            start_response(f'{code} {STATUS[code]}', [('Content-Type',mime),('Content-Length',str(len(body))),('Cache-Control','no-store'),('X-Content-Type-Options','nosniff'),('X-Frame-Options','DENY'),('Referrer-Policy','no-referrer')])
            return [body]
        host = environ.get('HTTP_HOST','')
        request_origin = environ.get('HTTP_ORIGIN')
        if host != parsed.netloc and not (path == api+'health' and method=='GET' and host in local_health_hosts):
            return reply(403, {'error':'Host not allowed'})
        if request_origin is not None and request_origin != origin:
            return reply(403, {'error':'Origin not allowed'})
        if method not in ('GET','POST'):
            return reply(405, {'error':'Method not allowed'})
        is_admin = path.startswith(api+'admin/')
        if is_admin and not secrets.compare_digest(environ.get('HTTP_X_ADMIN_TOKEN',''), token):
            return reply(401, {'error':'管理口令不正确'})
        try:
            if method == 'GET':
                if path == api+'health':
                    with store.connect() as db: db.execute('SELECT 1')
                    return reply(200, {'status':'ok','database':'mysql'})
                if path == api+'community/adoptions':
                    return reply(200, {'releases':store.public_adoptions()})
                if path == context+'/admin':
                    page = (ROOT/'scripts/crossbound-local/admin.html').read_text(encoding='utf-8')
                    page = page.replace("'/api/admin/'", json.dumps(api+'admin/'))
                    return reply(200, page, 'text/html; charset=utf-8')
                if is_admin:
                    resource = path[len(api+'admin/'):]
                    if resource == 'summary': return reply(200, store.summary())
                    if resource == 'releases': return reply(200, store.releases())
                    if resource == 'deliveries':
                        with store.connect() as db:
                            return reply(200, [dict(r) for r in db.execute('SELECT * FROM report_deliveries ORDER BY created_at DESC LIMIT 500')])
                    if resource in TABLES: return reply(200, store.rows(resource))
                return reply(404, {'error':'Unknown endpoint'})
            action = path[len(api+'admin/'):] if is_admin else None
            if path != api+'records' and action not in ACTIONS:
                return reply(404, {'error':'Unknown endpoint'})
            length = int(environ.get('CONTENT_LENGTH') or 0)
            if length > 2_000_000: return reply(413, {'error':'Batch too large'})
            if length <= 0 or environ.get('CONTENT_TYPE','').split(';')[0].strip() != 'application/json':
                return reply(400, {'error':'JSON body required'})
            payload = json.loads(environ['wsgi.input'].read(length))
            if not isinstance(payload,dict): return reply(400, {'error':'JSON object required'})
            if action == 'export-leads': return reply(200, store.export_leads())
            if action: return reply(200, store.administer(action,payload))
            return reply(200, {'accepted':store.ingest(payload.get('records'))})
        except (ValueError, TypeError, AttributeError, pymysql.IntegrityError):
            return reply(400, {'error':'Invalid request'})
        except pymysql.MySQLError:
            log.warning('database_unavailable')
            return reply(503, {'error':'Database temporarily unavailable; records remain queued'})
        except Exception as exc:
            # Never log request bodies, contacts, tokens or raw database exceptions.
            log.error('request_failed exception_type=%s', type(exc).__name__)
            return reply(500, {'error':'Request failed'})
    return app
