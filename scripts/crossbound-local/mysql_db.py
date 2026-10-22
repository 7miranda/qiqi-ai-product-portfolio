"""MySQL-only storage and immutable migrations. Credentials stay outside git."""
import hashlib
import json
import os
import re
from contextlib import contextmanager
from pathlib import Path
import pymysql

ROOT = Path(__file__).resolve().parents[2]

class Row(tuple):
    def __new__(cls, values, names):
        obj = super().__new__(cls, values)
        obj.names = names
        return obj
    def __getitem__(self, key):
        return super().__getitem__(self.names.index(key) if isinstance(key, str) else key)
    def keys(self):
        return self.names

class Result:
    def __init__(self, cursor):
        self.rowcount = cursor.rowcount
        names = [c[0] for c in cursor.description] if cursor.description else []
        self.rows = [Row(row, names) for row in cursor.fetchall()] if names else []
    def fetchone(self):
        return self.rows[0] if self.rows else None
    def fetchall(self):
        return self.rows
    def __iter__(self):
        return iter(self.rows)

class Connection:
    def __init__(self, connection):
        self.raw = connection
    def execute(self, sql, args=None):
        with self.raw.cursor() as cursor:
            cursor.execute(sql, args)
            return Result(cursor)

def config(path=None):
    path = Path(path or ROOT / '.crossbound-local/mysql.json')
    result = json.loads(path.read_text()) if path.exists() else {}
    for key in ('host', 'port', 'user', 'password', 'database'):
        value = os.environ.get('CROSSBOUND_MYSQL_' + key.upper())
        if value is not None:
            result[key] = int(value) if key == 'port' else value
    if not all(result.get(k) for k in ('host', 'user', 'password', 'database')):
        raise ValueError('Configure MySQL in .crossbound-local/mysql.json or CROSSBOUND_MYSQL_* environment variables')
    return result

@contextmanager
def connect(settings):
    raw = pymysql.connect(**settings, charset='utf8mb4', autocommit=False,
                          connect_timeout=10, read_timeout=20, write_timeout=20)
    try:
        with raw.cursor() as cursor:
            cursor.execute("SET time_zone='+00:00'")
        yield Connection(raw)
        raw.commit()
    except Exception:
        raw.rollback()
        raise
    finally:
        raw.close()

def migrate(settings):
    with connect(settings) as db:
        db.execute('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(160) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at VARCHAR(40) NOT NULL) ENGINE=InnoDB')
        if db.execute("SELECT GET_LOCK('crossbound-schema',30)").fetchone()[0] != 1:
            raise RuntimeError('Migration already running')
        try:
            for path in sorted((ROOT/'database/mysql').glob('*.sql')):
                source = path.read_text(encoding='utf-8')
                digest = hashlib.sha256(source.encode()).hexdigest()
                old = db.execute('SELECT checksum FROM schema_migrations WHERE name=%s', (path.name,)).fetchone()
                if old:
                    if old[0] != digest:
                        raise ValueError('Applied migration changed: ' + path.name)
                    continue
                # Migration files contain ordinary DDL only, no stored programs or delimiters.
                source = re.sub(r'^\s*--.*$', '', source, flags=re.M)
                for statement in source.split(';'):
                    if statement.strip():
                        db.execute(statement)
                db.execute("INSERT INTO schema_migrations VALUES (%s,%s,DATE_FORMAT(UTC_TIMESTAMP(6),'%%Y-%%m-%%dT%%H:%%i:%%s.%%fZ'))", (path.name, digest))
        finally:
            db.execute("SELECT RELEASE_LOCK('crossbound-schema')")
