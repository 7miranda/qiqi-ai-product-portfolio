"""Loopback-only preview and local analytics. No third-party data transmission."""
from contextlib import contextmanager
import argparse
import csv
import io
import json
import secrets
import sqlite3
from collections import Counter
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
TABLES = ('events', 'round_reports', 'quiz_answers', 'feedback', 'leads', 'assessments')


class Store:
    def __init__(self, path):
        self.path = path
        with self.connect() as db:
            for table in TABLES:
                constraint = " CHECK (length(trim(coalesce(json_extract(data, '$.comment'), ''))) = 0 OR length(trim(json_extract(data, '$.comment'))) BETWEEN 15 AND 100)" if table == 'feedback' else ''
                db.execute(f'CREATE TABLE IF NOT EXISTS {table} (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, data TEXT NOT NULL{constraint}, updated_at TEXT NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, first_seen TEXT NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS reward_claims (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, points INTEGER NOT NULL)')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path)
        try:
            with db:
                yield db
        finally:
            db.close()

    def ingest(self, records):
        if not isinstance(records, list) or len(records) > 100:
            raise ValueError('Invalid batch')
        accepted = []
        with self.connect() as db:
            for row in records:
                table, key, data, stamp = (row.get(k) for k in ('type', 'id', 'data', 'at'))
                if table not in TABLES or not isinstance(key, str) or len(key) > 240 or not isinstance(data, dict):
                    continue
                user = data.get('user_id')
                if not isinstance(user, str) or not 1 <= len(user) <= 128 or not key.startswith(user + ':') or not isinstance(stamp, str):
                    continue
                if table == 'round_reports' and (type(data.get('completed')) is not bool or not isinstance(data.get('round'), int) or not 0 <= data.get('exit_stage', -1) <= 6):
                    continue
                if table == 'leads' and (not data.get('consent') or '@' not in data.get('email', '') or not all(data.get(k) for k in ('category', 'followers', 'platform', 'consent_at'))):
                    continue
                if table == 'feedback':
                    comment = str(data.get('comment', '')).strip()
                    deep = bool(data.get('deep'))
                    wins = [json.loads(x[0]) for x in db.execute('SELECT data FROM round_reports WHERE user_id=?', (user,))]
                    if sum(x.get('completed') is True for x in wins) < (3 if deep else 1):
                        continue
                    if comment and not 15 <= len(comment) <= 100:
                        continue
                    if not deep and (len(data.get('answers', [])) != 3 or any(type(x) is not int or not 0 <= x <= 3 for x in data['answers'])):
                        continue
                    points = (30 if comment else 0) if deep else 50 + (20 if comment else 0)
                    db.execute('INSERT OR IGNORE INTO reward_claims VALUES (?,?,?)', (key, user, points))
                db.execute('INSERT OR IGNORE INTO users VALUES (?,?)', (user, stamp))
                sql = f'INSERT INTO {table} VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at WHERE excluded.updated_at >= {table}.updated_at'
                if table in ('events', 'quiz_answers', 'feedback'):
                    sql = f'INSERT OR IGNORE INTO {table} VALUES (?,?,?,?)'
                db.execute(sql, (key, user, json.dumps(data, ensure_ascii=False), stamp))
                if table == 'leads':
                    db.execute('INSERT OR REPLACE INTO assessments VALUES (?,?,?,?)', (key, user, json.dumps(data.get('assessment', {}), ensure_ascii=False), stamp))
                accepted.append(key)
        return accepted

    def rows(self, table):
        if table not in TABLES:
            raise ValueError('Invalid table')
        with self.connect() as db:
            return [dict(json.loads(data), record_id=key, updated_at=stamp) for key, data, stamp in db.execute(f'SELECT id,data,updated_at FROM {table}')]

    def summary(self):
        rounds = self.rows('round_reports')
        complete = [r for r in rounds if r.get('completed')]
        answers = self.rows('quiz_answers')
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
        return dict(by_round=by_round, quiz_by_task=quiz_by_task,
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
        if self.path != '/api/records' or not self.allowed():
            return self.reply(403, {'error': 'Local origin required'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 2_000_000:
                raise ValueError('Batch too large')
            payload = json.loads(self.rfile.read(length))
            self.reply(200, {'accepted': self.store.ingest(payload.get('records'))})
        except (ValueError, TypeError, AttributeError):
            self.reply(400, {'error': 'Invalid records'})

    def do_GET(self):
        if not self.allowed():
            return self.reply(403, {'error': 'Local host required'})
        if self.path == '/local-admin':
            return self.reply(200, (Path(__file__).parent / 'admin.html').read_text(encoding='utf-8'), 'text/html; charset=utf-8')
        if self.path.startswith('/api/admin/'):
            if not secrets.compare_digest(self.headers.get('X-Admin-Token', ''), self.token):
                return self.reply(401, {'error': 'Enter the token from .crossbound-local/admin-token.txt'})
            if self.path == '/api/admin/summary':
                return self.reply(200, self.store.summary())
            table = urlparse(self.path).path.rsplit('/', 1)[-1]
            if table not in TABLES:
                return self.reply(404, {'error': 'Unknown export'})
            rows = self.store.rows(table)
            if table == 'leads':
                rows.sort(key=lambda r: r.get('score', 0), reverse=True)
            return self.reply(200, rows)
        return super().do_GET()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--data-dir', type=Path, default=ROOT / '.crossbound-local')
    args = parser.parse_args()
    args.data_dir.mkdir(parents=True, exist_ok=True)
    token_path = args.data_dir / 'admin-token.txt'
    if not token_path.exists():
        token_path.write_text(secrets.token_urlsafe(32), encoding='utf-8')
    store = Store(args.data_dir / 'records.sqlite3')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, store=store, token=token_path.read_text().strip()))
    print(f'Preview: http://127.0.0.1:{server.server_port}/previews/crossbound/preview.html', flush=True)
    print(f'Local data: {args.data_dir}', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
