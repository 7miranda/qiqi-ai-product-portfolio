"""Read-only deployment preflight; errors expose field names/types, not values."""
import argparse
import os
from pathlib import Path
import sys
from configuration import ConfigurationError, read_env_file, validate_environment

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--env-file', type=Path)
    parser.add_argument('--migration', action='store_true')
    parser.add_argument('--compare-runtime', type=Path)
    parser.add_argument('--connect', action='store_true')
    parser.add_argument('--schema', action='store_true')
    parser.add_argument('--expected-database')
    args = parser.parse_args()
    try:
        if args.env_file: os.environ.update(read_env_file(args.env_file))
        validate_environment(migration=args.migration)
        if args.expected_database and os.environ.get('CROSSBOUND_MYSQL_DATABASE') != args.expected_database:
            raise ConfigurationError('CROSSBOUND_MYSQL_DATABASE: does not match the deployment database')
        if args.compare_runtime:
            runtime = read_env_file(args.compare_runtime)
            for field in ('HOST','PORT','DATABASE'):
                key = 'CROSSBOUND_MYSQL_' + field
                if runtime.get(key) != os.environ.get(key):
                    raise ConfigurationError(key + ': migration and runtime target differ')
        if args.connect or args.schema:
            sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts/crossbound-local'))
            from mysql_db import config, connect
            settings = config()
            with connect(settings) as db:
                db.execute('SELECT 1')
                version = db.execute('SELECT VERSION()').fetchone()[0]
                import re
                match = re.match(r'^(\d+)\.(\d+)\.(\d+)', version)
                if not match or 'MariaDB' in version or tuple(map(int,match.groups())) < (8,0,21):
                    raise ConfigurationError('MySQL 8.0.21 or newer is required')
                if args.schema:
                    from app import verify_schema
                    from types import SimpleNamespace
                    verify_schema(SimpleNamespace(connect=lambda: connect(settings)))
                    expected_tables = set('users events round_reports quiz_answers feedback reward_claims leads assessments consent_records report_deliveries releases feedback_reviews admin_audit collection_deletions import_batches schema_migrations'.split())
                    expected_views = set('lead_followup_queue feedback_inbox round_statistics default_adoption_by_stage questionnaire_segments event_funnel'.split())
                    objects = dict(db.execute('SELECT TABLE_NAME,TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=%s',(settings['database'],)))
                    missing = sorted([name for name in expected_tables if objects.get(name) != 'BASE TABLE'] + [name for name in expected_views if objects.get(name) != 'VIEW'])
                    if missing: raise ConfigurationError('Missing database objects: ' + ', '.join(missing))
        print('PASS: deployment configuration' + (' / MySQL connection' if args.connect or args.schema else '') + (' / migration checksums' if args.schema else ''))
        return 0
    except ConfigurationError as exc:
        print(str(exc), file=sys.stderr)
    except Exception as exc:
        code = f' (code={exc.args[0]})' if exc.args and isinstance(exc.args[0],int) else ''
        print('Deployment check failed: ' + type(exc).__name__ + code + '. Check DB connectivity, credentials, TLS and migrations.', file=sys.stderr)
    return 1

if __name__ == '__main__':
    raise SystemExit(main())
