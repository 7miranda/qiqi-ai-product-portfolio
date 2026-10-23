"""Loopback-only preview and local analytics. No third-party data transmission."""
import argparse
import json
import secrets
import pymysql
import sys
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))
from mysql_db import connect, config, migrate
from privacy import Contacts
from contract import valid as valid_record, canonical_time, SEGMENTS, INTENTS, INSIGHTS
import hashlib
import re
from datetime import datetime, timezone
from collections import Counter
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
TABLES = ('events', 'round_reports', 'quiz_answers', 'feedback', 'leads', 'assessments')
MIGRATIONS = ROOT / 'database/mysql'


def now():
    return datetime.now(timezone.utc).isoformat()


def badge_number(user):
    return 'CO-' + hashlib.sha256(user.encode()).hexdigest()[:16].upper()


class Store:
    def __init__(self, settings=None, data_dir=None, auto_migrate=True):
        self.settings = settings or config()
        self.data_dir = Path(data_dir or ROOT / '.crossbound-local')
        self.contacts = Contacts(self.data_dir)
        if auto_migrate:
            migrate(self.settings)

    def connect(self):
        return connect(self.settings)

    def ingest(self, records):
        if not isinstance(records, list) or len(records) > 100:
            raise ValueError('Invalid batch')
        accepted = []
        with self.connect() as db:
            db.execute('START TRANSACTION')
            for row in records:
                if not isinstance(row, dict):
                    continue
                table, key, data, stamp = (row.get(k) for k in ('type', 'id', 'data', 'at'))
                if table not in TABLES or not isinstance(key, str) or len(key) > 240 or not isinstance(data, dict):
                    continue
                user = data.get('user_id')
                if not isinstance(user, str) or not 1 <= len(user) <= 128 or not key.startswith(user + ':') or not isinstance(stamp, str):
                    continue
                try:
                    stamp = canonical_time(stamp)
                except (ValueError, TypeError):
                    continue
                if not re.fullmatch(r'[A-Za-z0-9_.:-]{1,128}',user) or not re.fullmatch(r'[A-Za-z0-9_.:-]{1,240}',key) or not valid_record(table,data):
                    continue
                if db.execute('SELECT 1 FROM collection_deletions WHERE user_hash=%s',(hashlib.sha256(user.encode()).hexdigest(),)).fetchone():
                    accepted.append(key)
                    continue
                if table == 'round_reports' and (type(data.get('completed')) is not bool or type(data.get('round')) is not int or data['round']<1 or type(data.get('exit_stage')) is not int or not 0 <= data['exit_stage'] <= 6):
                    continue
                if table == 'leads' and (data.get('consent') is not True or not isinstance(data.get('email'), str) or len(data['email'])>160 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', data['email']) or not all(isinstance(data.get(k), str) and data[k] for k in ('category', 'followers', 'platform', 'consent_at'))):
                    continue
                if table=='leads':
                    try: canonical_time(data['consent_at'])
                    except (ValueError,TypeError): continue
                    if len(str(data.get('wechat','')))>80 or not isinstance(data.get('assessment'),dict): continue
                if table == 'feedback':
                    comment = str(data.get('comment', '')).strip()
                    deep = bool(data.get('deep'))
                    wins = [json.loads(x[0]) for x in db.execute('SELECT data FROM round_reports WHERE user_id=%s', (user,))]
                    if sum(x.get('completed') is True for x in wins) < (3 if deep else 1):
                        continue
                    if comment and not 15 <= len(comment) <= 100:
                        continue
                    if not deep and (not isinstance(data.get('answers'),list) or len(data['answers']) != 3 or any(type(x) is not int or not 0 <= x <= 3 for x in data['answers'])):
                        continue
                    kind = 'deep' if deep else 'first'
                    # A different client record id must not create a second claim.
                    existing = db.execute('SELECT id FROM feedback WHERE user_id=%s AND feedback_kind=%s', (user,kind)).fetchone()
                    if existing:
                        accepted.append(key)
                        continue
                    data = dict(data, comment=comment)
                    data['survey_version'] = data.get('survey_version','legacy-v1')
                    if not deep and data['survey_version']=='v2':
                        data.update(player_segment=SEGMENTS[data['answers'][0]],intent_shift=INTENTS[data['answers'][1]],insight_moment=INSIGHTS[data['answers'][2]])
                        for deprecated in ('fun_score','stuck_step','want_most'): data.pop(deprecated,None)
                    elif not deep:
                        data.update(fun_score=4-data['answers'][0],stuck_step=data['answers'][1],want_most=data['answers'][2])
                    data['rounds_played'] = sum(x.get('completed') is True for x in wins)
                    points = (30 if comment else 0) if deep else 50 + (20 if comment else 0)
                db.execute('INSERT IGNORE INTO users (id,first_seen,badge_number) VALUES (%s,%s,%s)', (user, stamp, badge_number(user)))
                db.execute('UPDATE users SET last_seen_at=GREATEST(COALESCE(last_seen_at,%s),%s),run_seed=COALESCE(run_seed,%s),source=COALESCE(source,%s),game_version=COALESCE(%s,game_version) WHERE id=%s', (stamp,stamp,data.get('run_seed') if type(data.get('run_seed')) is int else None,str(data.get('source','direct'))[:255],data.get('game_version'),user))
                if table == 'leads':
                    if not db.execute('SELECT 1 FROM round_reports WHERE user_id=%s AND completed=1 LIMIT 1',(user,)).fetchone():
                        continue
                    data = self.contacts.seal(data)
                if table == 'feedback':
                    db.execute('INSERT IGNORE INTO reward_claims (id,user_id,points,reward_type,ref_id,created_at) VALUES (%s,%s,%s,%s,%s,%s)', (key,user,points,'deep_feedback_points' if deep else 'feedback_points',key,stamp))
                    if not deep or points:
                        db.execute('INSERT IGNORE INTO reward_claims (id,user_id,points,reward_type,ref_id,created_at) VALUES (%s,%s,0,%s,%s,%s)', (user+':badge:'+kind,user,'deep_cobuilder_badge' if deep else 'cobuilder_badge',key,stamp))
                sql = f'INSERT INTO {table} (id,user_id,data,updated_at) VALUES (%s,%s,%s,%s) ON DUPLICATE KEY UPDATE data=IF(VALUES(updated_at)>=updated_at,VALUES(data),data),updated_at=GREATEST(updated_at,VALUES(updated_at))'
                if table in ('events', 'quiz_answers', 'feedback', 'leads'):
                    sql = f'INSERT INTO {table} (id,user_id,data,updated_at) VALUES (%s,%s,%s,%s) ON DUPLICATE KEY UPDATE id=id'
                changed = db.execute(sql, (key, user, json.dumps(data, ensure_ascii=False), stamp)).rowcount
                if table == 'leads' and changed:
                    db.execute('INSERT INTO assessments (id,user_id,data,updated_at) VALUES (%s,%s,%s,%s) ON DUPLICATE KEY UPDATE data=VALUES(data),updated_at=VALUES(updated_at)', (key, user, json.dumps(data.get('assessment', {}), ensure_ascii=False), stamp))
                    consent_id = hashlib.sha256((user+data['consent_at']).encode()).hexdigest()
                    db.execute('INSERT IGNORE INTO consent_records (id,user_id,purpose,policy_version,consent_at) VALUES (%s,%s,%s,%s,%s)', (consent_id,user,'cooperation_and_report',data.get('policy_version','local-v1'),data['consent_at']))
                    for channel,status in [('page','available'),('email','pending')]:
                        db.execute('INSERT IGNORE INTO report_deliveries (id,lead_id,assessment_id,channel,status,created_at,updated_at) VALUES (%s,%s,%s,%s,%s,%s,%s)', (key+':'+channel,key,key,channel,status,stamp,stamp))
                accepted.append(key)
            for user,round_number in db.execute("SELECT DISTINCT e.user_id,e.round_number FROM events e JOIN round_reports r ON r.user_id=e.user_id AND r.round_number=e.round_number AND r.completed=1 WHERE e.event_name='completed' AND e.round_number IN (1,2)"):
                reward='tutorial_licensed' if round_number==1 else 'tutorial_independent'
                db.execute('INSERT IGNORE INTO reward_claims (id,user_id,points,reward_type,created_at) VALUES (%s,%s,%s,%s,%s)',(user+':'+reward,user,20 if round_number==1 else 0,reward,now()))
        return accepted

    def rows(self, table):
        if table not in TABLES:
            raise ValueError('Invalid table')
        with self.connect() as db:
            if table == 'leads':
                return [dict({k:v for k,v in json.loads(data).items() if k not in ('contact_value','contact_hash')},record_id=key,updated_at=stamp,badge_number=badge,status=status,deep_contributor=bool(deep),followup_priority='深度共建者优先' if deep else '按评估分跟进') for key,data,stamp,badge,deep,status in db.execute('SELECT id,data,updated_at,badge_number,deep_contributor,status FROM lead_followup_queue ORDER BY deep_contributor DESC,coalesce(score,0) DESC,updated_at DESC,id')]
            if table == 'feedback':
                return [dict(json.loads(data),record_id=key,updated_at=stamp,badge_number=badge,review_status=status,release_version=version,public_summary=summary,internal_note=note) for key,data,stamp,badge,status,version,summary,note in db.execute('SELECT id,data,updated_at,badge_number,review_status,release_version,public_summary,internal_note FROM feedback_inbox ORDER BY updated_at DESC,id')]
            return [dict(json.loads(data), record_id=key, updated_at=stamp) for key, data, stamp in db.execute(f'SELECT id,data,updated_at FROM {table}')]

    def releases(self):
        with self.connect() as db:
            return [dict(r) for r in db.execute('SELECT * FROM releases ORDER BY updated_at DESC')]

    def administer(self, action, value):
        stamp = now()
        with self.connect() as db:
            db.execute('START TRANSACTION')
            if action == 'delete-user':
                users=[value.get('user_id')] if value.get('user_id') else [r[0] for r in db.execute('SELECT DISTINCT user_id FROM leads WHERE contact_hash=%s',(self.contacts.fingerprint(value.get('email','')),))]
                for user in users:
                    if not user: continue
                    digest=hashlib.sha256(user.encode()).hexdigest()
                    deliveries=db.execute('SELECT d.id FROM report_deliveries d JOIN leads l ON l.id=d.lead_id WHERE l.user_id=%s',(user,)).fetchall()
                    for delivery, in deliveries:
                        preview=self.data_dir/'mail-preview'/(hashlib.sha256(delivery.encode()).hexdigest()+'.eml')
                        preview.unlink(missing_ok=True)
                    db.execute('DELETE d FROM report_deliveries d JOIN leads l ON l.id=d.lead_id WHERE l.user_id=%s',(user,))
                    db.execute('DELETE a FROM admin_audit a JOIN feedback f ON f.id=a.target_id WHERE f.user_id=%s',(user,))
                    for table in ('consent_records','reward_claims','feedback','leads','assessments','quiz_answers','round_reports','events'):
                        db.execute(f'DELETE FROM {table} WHERE user_id=%s',(user,))
                    db.execute('DELETE FROM users WHERE id=%s',(user,))
                    db.execute('INSERT IGNORE INTO collection_deletions VALUES (%s,%s)',(digest,stamp))
                return {'deleted':len(users)}
            if action == 'retry-delivery':
                db.execute("UPDATE report_deliveries SET status='pending',attempts=0 WHERE id=%s AND status='failed'",(value.get('id'),))
                return {'saved':True}
            if action == 'lead-status':
                if value.get('status') not in ('new','contacted','cooperating','invalid'): raise ValueError('Invalid status')
                db.execute('UPDATE leads SET status=%s WHERE id=%s',(value['status'],value.get('id')))
                return {'saved':True}
            if action == 'release':
                key = str(value.get('version','')).strip()
                title = str(value.get('title','')).strip()
                status = value.get('status')
                if not re.fullmatch(r'[A-Za-z0-9._-]{1,80}',key) or not 1<=len(title)<=120 or status not in ('draft','published'):
                    raise ValueError('请填写版本号、标题和发布状态')
                before = db.execute('SELECT * FROM releases WHERE version=%s',(key,)).fetchone()
                published = (before['published_at'] if before and before['status']=='published' else stamp) if status=='published' else None
                db.execute('INSERT INTO releases VALUES (%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE title=VALUES(title),status=VALUES(status),published_at=VALUES(published_at),updated_at=VALUES(updated_at)',(key,title,status,published,stamp))
            elif action == 'review':
                key = value.get('feedback_id')
                status = value.get('status')
                version = value.get('release_version') or None
                summary = str(value.get('public_summary','')).strip()
                note = str(value.get('internal_note','')).strip()
                feedback = db.execute('SELECT * FROM feedback WHERE id=%s',(key,)).fetchone()
                if not feedback or status not in ('pending','adopted','rejected') or len(summary)>200 or len(note)>1000:
                    raise ValueError('建议不存在或审核内容无效')
                before = db.execute('SELECT * FROM feedback_reviews WHERE feedback_id=%s',(key,)).fetchone()
                versions = {version,before['release_version'] if before else None}-{None}
                for v in versions:
                    release = db.execute('SELECT status FROM releases WHERE version=%s',(v,)).fetchone()
                    if not release or release[0]=='published':
                        raise ValueError('请先建立草稿版本；修改已发布公示前请撤回为草稿')
                if status=='adopted' and (not version or not summary or not (feedback['comment'] or '').strip()):
                    raise ValueError('采纳需有文字建议、所属草稿版本和公开摘要')
                db.execute('INSERT INTO feedback_reviews VALUES (%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE status=VALUES(status),release_version=VALUES(release_version),public_summary=VALUES(public_summary),internal_note=VALUES(internal_note),updated_at=VALUES(updated_at)',(key,status,version,summary,note,stamp))
            else:
                raise ValueError('Unknown action')
            db.execute('INSERT INTO admin_audit (action,target_id,before_json,after_json,created_at) VALUES (%s,%s,%s,%s,%s)',(action,key,json.dumps(dict(before)) if before else None,json.dumps(value,ensure_ascii=False),stamp))
        return {'saved':True}

    def export_leads(self):
        with self.connect() as db:
            rows=[]
            for key,data,status,deep in db.execute('SELECT id,data,status,deep_contributor FROM lead_followup_queue ORDER BY deep_contributor DESC,score DESC,updated_at DESC'):
                data=json.loads(data)
                rows.append({k:v for k,v in dict(data,**self.contacts.open(data),record_id=key,status=status,deep_contributor=bool(deep)).items() if k not in ('contact_value','contact_hash','assessment')})
            db.execute('INSERT INTO admin_audit (action,target_id,after_json,created_at) VALUES (%s,%s,%s,%s)',('export-leads','all',json.dumps({'count':len(rows)}),now()))
            return rows

    def public_adoptions(self):
        with self.connect() as db:
            # Deliberate allowlist: never return original feedback, identity, contacts or notes.
            return [dict(version=v,title=t,published_at=at,items=[dict(badge_number=b,summary=s) for b,s in db.execute("SELECT u.badge_number,r.public_summary FROM feedback_reviews r JOIN feedback f ON f.id=r.feedback_id JOIN users u ON u.id=f.user_id WHERE r.release_version=%s AND r.status='adopted' ORDER BY r.updated_at,r.feedback_id",(v,))]) for v,t,at in db.execute("SELECT version,title,published_at FROM releases WHERE status='published' ORDER BY published_at DESC,version DESC LIMIT 20")]

    def summary(self):
        rounds = self.rows('round_reports')
        complete = [r for r in rounds if r.get('completed')]
        answers = [a for a in self.rows('quiz_answers') if type(a.get('correct')) is bool]
        def counts(field):
            return dict(Counter(str(r.get(field) or '未选择') for r in rounds))
        by_round = {}
        for number in sorted(set(r['round'] for r in complete)):
            members = [r for r in complete if r['round'] == number]
            by_round[str(number)] = dict(count=len(members), average_profit=round(sum(r.get('profit', 0) for r in members)/len(members), 2), pass_rate=sum(bool(r.get('passed')) for r in members)/len(members))
        quiz_by_task = {}
        for task in set(a.get('task_id') for a in answers):
            attempts = [a for a in answers if a.get('task_id') == task]
            quiz_by_task[str(task)] = dict(attempts=len(attempts), accuracy=sum(a.get('correct') is True for a in attempts)/len(attempts))
        feedback = self.rows('feedback')
        events = self.rows('events')
        tutorial_users={e['user_id'] for e in events if e.get('event')=='tutorial_started'}
        skipped={e['user_id'] for e in events if e.get('event')=='step_skipped'}
        finished={e['user_id'] for e in events if e.get('event')=='completed' and e.get('round')==1}
        third={r['user_id'] for r in rounds if r['round']>=3}
        groups={name:{'users':len(members),'third_round_users':len(members&third),'third_round_rate':len(members&third)/len(members) if members else None} for name,members in [('guided',tutorial_users&finished-skipped),('skipped',tutorial_users&skipped)]}
        steps=Counter((e.get('step'),e.get('event')) for e in events if e.get('event') in ('step_viewed','step_completed','step_skipped'))
        return dict(by_round=by_round, quiz_by_task=quiz_by_task,
                    questionnaire_segments=dict(Counter(x.get('player_segment','legacy')+' / '+x.get('intent_shift','legacy') for x in feedback if not x.get('deep'))),
                    insight_moments=dict(Counter(x.get('insight_moment') for x in feedback if x.get('survey_version')=='v2' and not x.get('deep'))),
                    event_funnel={name:len({e['user_id'] for e in events if e.get('event')==name}) for name in {e.get('event') for e in events}},
                    tutorial_groups=groups,tutorial_steps={str(step)+' / '+event:count for (step,event),count in steps.items()},
                    first_settlement_ms=[e['first_settlement_ms'] for e in events if e.get('event')=='completed' and 'first_settlement_ms' in e],
                    secondary_choices=dict(Counter(str(d.get('promotionChoice', {}).get('id')) for r in rounds for d in r.get('decisions', []) if d.get('promotionChoice'))),
                    stuck_steps=dict(Counter(str(x.get('stuck_step')) for x in feedback if 'stuck_step' in x)),
                    wanted_features=dict(Counter(str(x.get('want_most')) for x in feedback if 'want_most' in x)),
                    rounds=len(rounds), completed=len(complete), incomplete=len(rounds)-len(complete),
                    average_profit=round(sum(r.get('profit', 0) for r in complete)/max(1, len(complete)), 2),
                    pass_rate=sum(bool(r.get('passed')) for r in complete)/max(1, len(complete)),
                    quiz_attempts=len(answers), quiz_accuracy=sum(r.get('correct') is True for r in answers)/max(1, len(answers)),
                    default_decisions=sum(x is True for r in rounds for x in r.get('used_default', [])),
                    markets=counts('market'), products=counts('product'), channels=counts('channel'),
                    exit_stages=dict(Counter(str(r.get('exit_stage')) for r in rounds if not r.get('completed'))))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, store, token, **kwargs):
        self.store, self.token = store, token
        super().__init__(*args, directory=str(ROOT / 'public'), **kwargs)

    def allowed(self):
        # Reject cross-origin forms, DNS rebinding and requests from public hosts.
        expected = f'127.0.0.1:{self.server.server_port}'
        local = f'localhost:{self.server.server_port}'
        if self.headers.get('Host') not in (expected, local):
            return False
        origin = self.headers.get('Origin')
        return not origin or origin in (f'http://{expected}', f'http://{local}')

    def reply(self, code, data, kind='application/json; charset=utf-8'):
        body = data.encode('utf-8') if isinstance(data, str) else json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', kind)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if not self.allowed():
            return self.reply(403, {'error': 'Local origin required'})
        admin_action = {'/api/admin/review':'review','/api/admin/release':'release','/api/admin/delete-user':'delete-user','/api/admin/lead-status':'lead-status','/api/admin/retry-delivery':'retry-delivery','/api/admin/export-leads':'export-leads'}.get(self.path)
        if admin_action and not secrets.compare_digest(self.headers.get('X-Admin-Token', ''), self.token):
            return self.reply(401, {'error':'管理口令不正确'})
        if not admin_action and self.path != '/api/records':
            return self.reply(404, {'error':'Unknown endpoint'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 2_000_000:
                raise ValueError('Batch too large')
            payload = json.loads(self.rfile.read(length))
            if admin_action:
                if admin_action=='export-leads': return self.reply(200,self.store.export_leads())
                return self.reply(200, self.store.administer(admin_action,payload))
            self.reply(200, {'accepted': self.store.ingest(payload.get('records'))})
        except (ValueError, TypeError, AttributeError, pymysql.IntegrityError) as error:
            self.reply(400, {'error': str(error) if admin_action else 'Invalid records'})
        except pymysql.MySQLError:
            self.reply(503, {'error':'Database temporarily unavailable; records remain queued'})

    def do_GET(self):
        if not self.allowed():
            return self.reply(403, {'error': 'Local host required'})
        if self.path == '/local-admin':
            return self.reply(200, (Path(__file__).parent / 'admin.html').read_text(encoding='utf-8'), 'text/html; charset=utf-8')
        if self.path == '/api/community/adoptions':
            return self.reply(200, {'releases': self.store.public_adoptions()})
        if self.path == '/api/health':
            with self.store.connect() as db:
                version=db.execute('SELECT VERSION()').fetchone()[0]
            return self.reply(200,{'database':'mysql','version':version,'mail':'smtp' if __import__('os').environ.get('CROSSBOUND_SMTP_HOST') else 'local-preview'})
        if self.path.startswith('/api/admin/'):
            if not secrets.compare_digest(self.headers.get('X-Admin-Token', ''), self.token):
                return self.reply(401, {'error': 'Enter the token from .crossbound-local/admin-token.txt'})
            if self.path == '/api/admin/summary':
                return self.reply(200, self.store.summary())
            if self.path == '/api/admin/releases':
                return self.reply(200, self.store.releases())
            if self.path == '/api/admin/deliveries':
                with self.store.connect() as db:
                    return self.reply(200,[dict(r) for r in db.execute('SELECT * FROM report_deliveries ORDER BY created_at DESC LIMIT 500')])
            table = urlparse(self.path).path.rsplit('/', 1)[-1]
            if table not in TABLES:
                return self.reply(404, {'error': 'Unknown export'})
            rows = self.store.rows(table)
            return self.reply(200, rows)
        return super().do_GET()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--data-dir', type=Path, default=ROOT / '.crossbound-local')
    parser.add_argument('--migrate-only', action='store_true')
    args = parser.parse_args()
    args.data_dir.mkdir(parents=True, exist_ok=True)
    token_path = args.data_dir / 'admin-token.txt'
    if not token_path.exists():
        token_path.write_text(secrets.token_urlsafe(32), encoding='utf-8')
    store = Store(data_dir=args.data_dir)
    if args.migrate_only:
        print('Database migrations applied. Existing records preserved.', flush=True)
        return
    import threading
    from mail_delivery import deliver
    def mail_loop():
        import time
        while True:
            try: deliver(store)
            except (pymysql.MySQLError, OSError): pass
            time.sleep(20)
    threading.Thread(target=mail_loop,daemon=True).start()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, store=store, token=token_path.read_text().strip()))
    print(f'Preview: http://127.0.0.1:{server.server_port}/previews/crossbound/preview.html', flush=True)
    print(f'Local data: {args.data_dir}', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
