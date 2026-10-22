"""Validate deployment settings without ever echoing credential values."""
import os
import re
from urllib.parse import urlsplit
from cryptography.fernet import Fernet

class ConfigurationError(ValueError):
    pass

def validate_environment(env=None, migration=False):
    env = os.environ if env is None else env
    errors = []
    required = ['CROSSBOUND_MYSQL_' + k for k in ('HOST', 'PORT', 'DATABASE', 'USER', 'PASSWORD')]
    if not migration:
        required += ['CROSSBOUND_PUBLIC_ORIGIN', 'CROSSBOUND_ADMIN_TOKEN', 'CROSSBOUND_CONTACT_KEY']
    for key in required:
        value = env.get(key, '')
        if not value or value.lower().startswith(('replace-', 'change-me', '<')):
            errors.append(key + ': required (replace template value)')
    for key, default, maximum in [('CROSSBOUND_MYSQL_PORT','3306',65535), ('PORT','5017',65535),
                                  ('CROSSBOUND_SMTP_PORT','587',65535)]:
        try:
            if not 1 <= int(env.get(key, default)) <= maximum: raise ValueError()
        except ValueError:
            errors.append(key + ': invalid port')
    if not migration:
        origin = urlsplit(env.get('CROSSBOUND_PUBLIC_ORIGIN', ''))
        if (origin.scheme not in ('http','https') or not origin.hostname or origin.path
                or origin.query or origin.fragment or origin.username or origin.password
                or origin.hostname.endswith('example.com')):
            errors.append('CROSSBOUND_PUBLIC_ORIGIN: use the actual scheme://host[:port], without a path')
        if not re.fullmatch(r'(?:/[A-Za-z0-9_-]+)+', env.get('CROSSBOUND_CONTEXT_PATH','/crossbound')):
            errors.append('CROSSBOUND_CONTEXT_PATH: invalid path')
        if len(env.get('CROSSBOUND_ADMIN_TOKEN','')) < 32:
            errors.append('CROSSBOUND_ADMIN_TOKEN: minimum 32 characters')
        try:
            Fernet(env.get('CROSSBOUND_CONTACT_KEY','').encode())
        except (ValueError, TypeError):
            errors.append('CROSSBOUND_CONTACT_KEY: invalid Fernet key')
        if env.get('CROSSBOUND_SMTP_HOST'):
            for key in ('CROSSBOUND_SMTP_FROM','CROSSBOUND_SMTP_USER','CROSSBOUND_SMTP_PASSWORD'):
                if not env.get(key): errors.append(key + ': required when SMTP is enabled')
    if bool(env.get('CROSSBOUND_MYSQL_SSL_CERT')) != bool(env.get('CROSSBOUND_MYSQL_SSL_KEY')):
        errors.append('CROSSBOUND_MYSQL_SSL_CERT / CROSSBOUND_MYSQL_SSL_KEY: configure together')
    if (env.get('CROSSBOUND_MYSQL_SSL_CERT') or env.get('CROSSBOUND_MYSQL_SSL_KEY')) and not env.get('CROSSBOUND_MYSQL_SSL_CA'):
        errors.append('CROSSBOUND_MYSQL_SSL_CA: required with client certificate')
    if errors:
        raise ConfigurationError('\n'.join(dict.fromkeys(errors)))

def read_env_file(path):
    """Docker raw env-file syntax: literal values, never shell-evaluated/interpolated."""
    values = {}
    for number, line in enumerate(path.read_text(encoding='utf-8-sig').splitlines(), 1):
        if not line.strip() or line.lstrip().startswith('#'): continue
        key, separator, value = line.partition('=')
        if not separator or not re.fullmatch(r'[A-Z][A-Z0-9_]*',key) or key in values:
            raise ConfigurationError(f'env file line {number}: invalid or duplicate key')
        if key not in ('PORT','TZ') and not key.startswith('CROSSBOUND_'):
            raise ConfigurationError(f'env file line {number}: unsupported key')
        values[key] = value
    return values
