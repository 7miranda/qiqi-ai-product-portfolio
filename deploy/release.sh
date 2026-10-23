#!/usr/bin/env bash
# Same-host Linux deployment only; Docker daemon and Jenkins agent share host paths.
set -euo pipefail
set +x
cd "$(dirname "$0")/.."
: "${CROSSBOUND_IMAGE:?Set image tag}"
: "${RELEASE_ID:?Set release ID}"
: "${APP_ENV_FILE:?Bind Jenkins runtime Secret file}"
[[ "$RELEASE_ID" =~ ^[0-9]+-[a-f0-9]{7,40}$ ]] || { echo 'Invalid RELEASE_ID' >&2; exit 2; }
config_dir=/data/crossbound/config
release_dir="/data/www/releases/crossbound/$RELEASE_ID"
live=/data/www/crossbound
for dir in "$config_dir" /data/www /data/www/releases/crossbound; do
  [[ -d "$dir" && -w "$dir" ]] || { echo "Prepare writable directory: $dir" >&2; exit 1; }
done
exec 9>"$config_dir/deploy.lock"
flock -n 9 || { echo 'Another Crossbound deployment is active' >&2; exit 1; }
[[ ! -e "$live" || -L "$live" ]] || { echo '/data/www/crossbound must be absent or a release symlink; preserve/move the existing directory first.' >&2; exit 1; }
[[ ! -e "$release_dir" ]] || { echo 'Release already exists; use a new build number' >&2; exit 1; }
test -f dist/crossbound/index.html
bash deploy/preflight.sh schema
export CROSSBOUND_ENV_FILE="$config_dir/runtime.env"
compose=(docker compose --project-name crossbound -f deploy/compose.yaml)
previous_image=''
previous_link=$(readlink "$live" || true)
previous_env="$config_dir/runtime.before-$RELEASE_ID.env"
if [[ -f "$CROSSBOUND_ENV_FILE" ]]; then
  cp -p "$CROSSBOUND_ENV_FILE" "$previous_env"
  cid=$("${compose[@]}" ps -q backend)
  if [[ -n "$cid" ]]; then previous_image=$(docker inspect --format '{{.Config.Image}}' "$cid"); fi
fi
changed=false
linked=false
rollback() {
  status=$?
  trap - EXIT
  if [[ "$status" != 0 && "$changed" == true ]]; then
    echo 'Release failed. Restoring previous application/config if available. Database migrations are NOT rolled back.' >&2
    if [[ "$linked" == true ]]; then
      if [[ -n "$previous_link" ]]; then
        ln -sfn "$previous_link" "$live.rollback"
        mv -Tf "$live.rollback" "$live"
      else
        # This path was verified as our newly-created release symlink.
        [[ -L "$live" ]] && unlink "$live"
      fi
    fi
    if [[ -n "$previous_image" && -f "$previous_env" ]]; then
      cp -p "$previous_env" "$CROSSBOUND_ENV_FILE"
      CROSSBOUND_IMAGE="$previous_image" "${compose[@]}" up -d --no-build --wait --wait-timeout 120 || echo 'Rollback failed; engineer intervention required.' >&2
    else
      echo 'No previous release; keep failed containers for diagnosis. No successful deployment recorded.' >&2
    fi
  fi
  exit "$status"
}
trap rollback EXIT
umask 077
install -m 600 "$APP_ENV_FILE" "$CROSSBOUND_ENV_FILE.next"
mv -f "$CROSSBOUND_ENV_FILE.next" "$CROSSBOUND_ENV_FILE"
changed=true
"${compose[@]}" config --quiet
"${compose[@]}" up -d --no-build --wait --wait-timeout 120
curl --fail --silent --show-error --max-time 15 http://127.0.0.1:5017/crossbound/api/health >/dev/null
mkdir -m 755 "$release_dir"
cp -R dist/crossbound/. "$release_dir/"
chmod -R a+rX "$release_dir"
ln -sfn "$release_dir" "$live.next"
mv -Tf "$live.next" "$live"
linked=true
# Public URL is non-secret. Do not source the credentials file as shell code.
origin=$(sed -n 's/^CROSSBOUND_PUBLIC_ORIGIN=//p' "$CROSSBOUND_ENV_FILE" | tr -d '\r')
curl --fail --silent --show-error --max-time 30 "$origin/crossbound/api/health" | grep -Eq '"database"[[:space:]]*:[[:space:]]*"mysql"'
curl --fail --silent --show-error --max-time 30 "$origin/crossbound/" >/dev/null
curl --fail --silent --show-error --max-time 30 "$origin/crossbound/runtime-config.js" | cmp - dist/crossbound/runtime-config.js
install -m 600 deploy/compose.yaml "$config_dir/compose.yaml"
printf '%s\n' "$CROSSBOUND_IMAGE" > "$config_dir/current-image.txt"
printf '%s\n' "$previous_image" > "$config_dir/previous-image.txt"
echo 'PASS: backend/worker running, MySQL health verified, frontend and public API reachable.'
