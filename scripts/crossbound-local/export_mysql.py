"""Consistent MySQL data backup. Import after applying the same schema migrations."""
import argparse, hashlib, json
from pathlib import Path
from mysql_db import config, connect

TABLES=('users','events','round_reports','quiz_answers','feedback','leads','assessments','reward_claims',
        'releases','feedback_reviews','admin_audit','consent_records','report_deliveries','collection_deletions','import_batches')
def literal(value):
    if value is None:return 'NULL'
    if isinstance(value,(int,float)):return str(value)
    return "CONVERT(X'"+str(value).encode('utf-8').hex()+"' USING utf8mb4)"
def export(settings,output):
    output=Path(output)
    if output.exists():raise ValueError('Choose a new backup filename')
    output.parent.mkdir(parents=True,exist_ok=True)
    statements=['SET NAMES utf8mb4;','START TRANSACTION;'];counts={}
    with connect(settings) as db:
        db.execute('START TRANSACTION WITH CONSISTENT SNAPSHOT')
        for table in TABLES:
            columns=[r[0] for r in db.execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s AND EXTRA NOT LIKE '%%GENERATED%%' ORDER BY ORDINAL_POSITION",(table,))]
            if not columns:raise ValueError('Missing table: '+table)
            rows=db.execute(f'SELECT {",".join("`"+c+"`" for c in columns)} FROM {table}').fetchall();counts[table]=len(rows)
            for row in rows:statements.append(f'INSERT INTO `{table}` ({",".join("`"+c+"`" for c in columns)}) VALUES ({",".join(literal(v) for v in row)});')
    statements.append('COMMIT;');content='\n'.join(statements)+'\n'
    with output.open('x',encoding='utf-8') as file:file.write(content)
    manifest={'tables':counts,'sha256':hashlib.sha256(content.encode()).hexdigest()}
    output.with_suffix('.manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    return manifest
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();print(json.dumps(export(config(),args.output),indent=2))
