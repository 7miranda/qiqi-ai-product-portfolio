"""One-way, read-only SQLite import into MySQL. SQLite is never used by the server."""
import argparse
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from server import Store, badge_number

TABLES=('users','events','round_reports','quiz_answers','feedback','leads','assessments',
        'reward_claims','releases','feedback_reviews','admin_audit','consent_records','report_deliveries')

def import_legacy(path, store):
    path=Path(path).resolve()
    stamp=datetime.now(timezone.utc).isoformat(timespec='milliseconds')
    backup=path.with_name(path.name+'.mysql-import-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.bak')
    source=sqlite3.connect(path.as_uri()+'?mode=ro',uri=True)
    try:
        target=sqlite3.connect(backup)
        try: source.backup(target)
        finally: target.close()
    finally: source.close()
    digest=hashlib.sha256(backup.read_bytes()).hexdigest()
    source=sqlite3.connect(backup.as_uri()+'?mode=ro',uri=True)
    counts={}
    try:
        with store.connect() as db:
            if db.execute('SELECT 1 FROM import_batches WHERE source_sha256=%s',(digest,)).fetchone():
                return {'already_imported':True}
            if any(db.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0] for t in TABLES):
                raise ValueError('Import requires an empty MySQL database; existing rows are never overwritten')
            for table in TABLES:
                columns=[r[1] for r in source.execute(f'PRAGMA table_xinfo({table})') if r[6]==0]
                if not columns:
                    counts[table]=0
                    continue
                rows=source.execute(f'SELECT {",".join(columns)} FROM {table}').fetchall()
                for row in rows:
                    value=dict(zip(columns,row))
                    if table=='users':
                        value['badge_number']=value.get('badge_number') or badge_number(value['id'])
                        value['last_seen_at']=value['first_seen']
                    if table=='leads':
                        data=json.loads(value['data'])
                        if not data.get('contact_value'): data=store.contacts.seal(data)
                        value['data']=json.dumps(data,ensure_ascii=False)
                    if table=='feedback':
                        data=json.loads(value['data']);data.setdefault('survey_version','legacy-v1')
                        value['data']=json.dumps(data,ensure_ascii=False)
                    if table=='assessments':
                        data=json.loads(value['data'])
                        data.update({s['key']+'_score':s['value'] for s in data.get('scores',[])})
                        value['data']=json.dumps(data,ensure_ascii=False)
                    if table=='reward_claims':
                        value.update(reward_type='deep_feedback_points' if value['id'].endswith(':deep') else 'feedback_points',ref_id=value['id'],created_at=stamp)
                    db.execute(f'INSERT INTO {table} ({",".join("`"+k+"`" for k in value)}) VALUES ({",".join(["%s"]*len(value))})',tuple(value.values()))
                actual=db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
                if actual!=len(rows): raise ValueError('Count mismatch: '+table)
                counts[table]=actual
            db.execute('INSERT INTO import_batches VALUES (%s,%s,%s)',(digest,json.dumps(counts),stamp))
        manifest={'source_sha256':digest,'backup':str(backup),'tables':counts,'imported_at':stamp}
        backup.with_suffix('.manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
        return manifest
    finally: source.close()

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',required=True,type=Path)
    args=parser.parse_args()
    print(json.dumps(import_legacy(args.source,Store()),indent=2))
