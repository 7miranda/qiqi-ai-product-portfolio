#!/usr/bin/env bash
set -euo pipefail
set +x
cd "$(dirname "$0")/.."
: "${CROSSBOUND_IMAGE:?Set the immutable image tag}"
: "${APP_ENV_FILE:?Bind Jenkins runtime Secret file}"
APP_ENV_FILE=$(realpath "$APP_ENV_FILE")
# Read-only preflight runs as root only to read Jenkins' mode-0600 temporary file.
# Runtime backend/worker still run as UID 10001.
check=(docker run --rm --read-only --user 0:0 --cap-drop ALL --cap-add DAC_OVERRIDE --security-opt no-new-privileges:true
  --mount "type=bind,src=$APP_ENV_FILE,dst=/run/runtime.env,readonly"
  --mount 'type=bind,src=/data/crossbound/backend,dst=/app/data,readonly')
case "${1:-runtime}" in
  runtime)
    "${check[@]}" "$CROSSBOUND_IMAGE" python backend/check_config.py --env-file /run/runtime.env --expected-database au-crossbound --connect
    ;;
  schema)
    "${check[@]}" "$CROSSBOUND_IMAGE" python backend/check_config.py --env-file /run/runtime.env --expected-database au-crossbound --schema
    ;;
  migrate)
    : "${MIGRATION_ENV_FILE:?Bind Jenkins migration Secret file}"
    MIGRATION_ENV_FILE=$(realpath "$MIGRATION_ENV_FILE")
    "${check[@]}" --mount "type=bind,src=$MIGRATION_ENV_FILE,dst=/run/migration.env,readonly" \
      "$CROSSBOUND_IMAGE" python backend/check_config.py --env-file /run/migration.env --migration --expected-database au-crossbound --compare-runtime /run/runtime.env --connect
    docker run --rm --env-file "$MIGRATION_ENV_FILE" --read-only --tmpfs /tmp:size=64m,mode=1777 \
      --mount 'type=bind,src=/data/crossbound/backend,dst=/app/data,readonly' \
      "$CROSSBOUND_IMAGE" python scripts/crossbound-local/server.py --data-dir /tmp/migration --migrate-only
    ;;
  *) echo 'Usage: preflight.sh runtime|schema|migrate' >&2; exit 2 ;;
esac
