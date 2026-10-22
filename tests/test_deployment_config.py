import os
from pathlib import Path
import sys
import tempfile
import io
from contextlib import redirect_stderr
import unittest
from unittest.mock import patch
ROOT = Path('/app') if Path('/app/backend/configuration.py').exists() else Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend'))
sys.path.insert(0,str(ROOT/'scripts/crossbound-local'))
from configuration import ConfigurationError, read_env_file, validate_environment
from cryptography.fernet import Fernet
import mysql_db

class DeploymentConfigurationTests(unittest.TestCase):
    def settings(self):
        return dict(CROSSBOUND_MYSQL_HOST='db.internal',CROSSBOUND_MYSQL_PORT='3306',
                    CROSSBOUND_MYSQL_DATABASE='au-crossbound',CROSSBOUND_MYSQL_USER='runtime',
                    CROSSBOUND_MYSQL_PASSWORD='dollar$VALUE#;literal',CROSSBOUND_PUBLIC_ORIGIN='https://game.internal',
                    CROSSBOUND_ADMIN_TOKEN='a'*40,CROSSBOUND_CONTACT_KEY=Fernet.generate_key().decode())

    def test_runtime_and_hyphenated_schema(self):
        env=self.settings()
        validate_environment(env)
        with patch.dict(os.environ,env,clear=True):
            settings=mysql_db.config('/nonexistent-mysql-config.json')
        self.assertEqual(settings['database'],'au-crossbound')
        self.assertEqual(settings['password'],'dollar$VALUE#;literal')

    def test_missing_config_names_without_secret_values(self):
        env=self.settings();env['CROSSBOUND_MYSQL_USER']='replace-with-user'
        env['CROSSBOUND_CONTACT_KEY']='secret-invalid-key'
        with self.assertRaises(ConfigurationError) as result: validate_environment(env)
        self.assertIn('CROSSBOUND_MYSQL_USER',str(result.exception))
        self.assertIn('CROSSBOUND_CONTACT_KEY',str(result.exception))
        self.assertNotIn('secret-invalid-key',str(result.exception))
        self.assertNotIn(env['CROSSBOUND_MYSQL_PASSWORD'],str(result.exception))

    def test_raw_credentials_never_interpolate_or_execute(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'runtime.env'
            password='literal$HOME${TOKEN}#$(echo do-not-execute)'
            path.write_text('CROSSBOUND_MYSQL_PASSWORD='+password+'\n',encoding='utf-8')
            self.assertEqual(read_env_file(path)['CROSSBOUND_MYSQL_PASSWORD'],password)
            path.write_text('CROSSBOUND_MYSQL_USER=a\nCROSSBOUND_MYSQL_USER=b\n')
            with self.assertRaises(ConfigurationError): read_env_file(path)
            path.write_text('export CROSSBOUND_MYSQL_USER=a\n')
            with self.assertRaises(ConfigurationError): read_env_file(path)

    def test_migration_only_needs_db_credentials(self):
        env={key:value for key,value in self.settings().items() if key.startswith('CROSSBOUND_MYSQL_')}
        validate_environment(env,migration=True)
        with self.assertRaises(ConfigurationError): validate_environment(env)

    def test_invalid_origin_port_and_smtp_fail_before_deployment(self):
        for update in ({'CROSSBOUND_PUBLIC_ORIGIN':'https://game.example.com'},
                       {'CROSSBOUND_PUBLIC_ORIGIN':'https://game.internal/crossbound'},
                       {'CROSSBOUND_MYSQL_PORT':'0'}, {'CROSSBOUND_SMTP_HOST':'smtp.internal'}):
            with self.subTest(update=update), self.assertRaises(ConfigurationError):
                validate_environment({**self.settings(),**update})

    def test_tls_verifies_certificate_and_hostname(self):
        env={**self.settings(),'CROSSBOUND_MYSQL_SSL_CA':'/app/data/tls/ca.pem'}
        validate_environment(env)
        with patch.dict(os.environ,env,clear=True):
            settings=mysql_db.config('/nonexistent-mysql-config.json')
        self.assertTrue(settings['ssl_verify_identity'])
        self.assertTrue(settings['ssl_verify_cert'])
        env['CROSSBOUND_MYSQL_SSL_CERT']='/app/data/tls/client.pem'
        with self.assertRaises(ConfigurationError): validate_environment(env)

    def test_wrong_target_database_rejected_before_any_connection(self):
        import check_config
        output=io.StringIO()
        with patch.dict(os.environ,self.settings(),clear=True), patch.object(sys,'argv',['check_config','--expected-database','wrong-target']), redirect_stderr(output):
            self.assertEqual(check_config.main(),1)
        self.assertIn('CROSSBOUND_MYSQL_DATABASE',output.getvalue())
        self.assertNotIn('dollar',output.getvalue())

if __name__ == '__main__': unittest.main()
