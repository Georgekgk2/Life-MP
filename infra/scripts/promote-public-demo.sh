#!/usr/bin/env bash
# Only the hash-bound merged-main runner may invoke this payload.
set -Eeuo pipefail
set +x
umask 077

OPERATION=${1:?operation required}
CANDIDATE_BASE64=${2:?approved Compose required}
DIR=/opt/life-mp/current/deploy
STATE=/var/backups/life-mp/demo-7226ce7
COMMERCE='ghcr.io/georgekgk2/life-commerce@sha256:6b2f29cdb2e03ae83f2733a273ac2c9ba26c39b75ad5d1b4bee2b4bdd1952b7d'
STOREFRONT='ghcr.io/georgekgk2/life-storefront@sha256:79297bfd19e71622dad6fc86d463272a3d46c8d52c19a40531b6dad775ace7fb'
case "$OPERATION" in discovery|promote|verify|rollback) ;; *) exit 2 ;; esac

test "$(uname -m)" = x86_64
cd "$DIR"
test -r .env.production
test -f docker-compose.prod.yml
test ! -L docker-compose.prod.yml
test -S /var/run/docker.sock
# The SSH host, not an inherited Docker context or TCP endpoint, owns this stack.
unset DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH
export DOCKER_HOST=unix:///var/run/docker.sock
for tool in docker jq curl sha256sum base64 flock; do command -v "$tool" >/dev/null; done

# Read-only operations do not create files or acquire a host mutation lock.
compose() {
  docker compose -p life-mp --project-directory "$DIR" \
    --env-file "$DIR/.env.production" -f "$1" "${@:2}"
}
validate_host() {
  compose "$DIR/docker-compose.prod.yml" config --quiet
  compose "$DIR/docker-compose.prod.yml" config --format json |
    jq -e '.services.storefront.environment.LIFE_RUNTIME_ENV=="public-demo" and
      .services.storefront.environment.CATALOG_SOURCE=="fixtures" and
      .services.storefront.environment.ALLOW_PUBLIC_DEMO_CATALOG=="true" and
      .services.storefront.environment.ALLOW_SYNTHETIC_CATALOG=="false"' >/dev/null
  local name memory cpus pids limit present
  for name in commerce storefront postgres redis; do
    if [[ "$OPERATION" == rollback && ( "$name" == commerce || "$name" == storefront ) ]]; then
      present=$(docker ps -a --filter "name=^/life-mp-$name$" --format '{{.Names}}')
      # Compose recreation can remove an app before failing to create its replacement.
      if [[ -z "$present" ]]; then continue; fi
      test "$present" = "life-mp-$name"
    fi
    test "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "life-mp-$name")" = life-mp
    test "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "life-mp-$name")" = "$DIR"
    test "$(docker inspect --format '{{.HostConfig.NetworkMode}}' "life-mp-$name")" = life-mp-net
    test "$(docker inspect --format '{{.HostConfig.Privileged}}' "life-mp-$name")" = false
    memory=$(docker inspect --format '{{.HostConfig.Memory}}' "life-mp-$name")
    cpus=$(docker inspect --format '{{.HostConfig.NanoCpus}}' "life-mp-$name")
    pids=$(docker inspect --format '{{.HostConfig.PidsLimit}}' "life-mp-$name")
    case "$name" in commerce) limit=805306368 ;; storefront|postgres) limit=536870912 ;; redis) limit=201326592 ;; esac
    [[ "$memory" =~ ^[0-9]+$ && "$cpus" =~ ^[0-9]+$ && "$pids" =~ ^[0-9]+$ ]]
    (( memory > 0 && memory <= limit && cpus > 0 && cpus <= 1000000000 && pids > 0 && pids <= 150 ))
  done
  test -z "$(docker port life-mp-postgres)"
  test -z "$(docker port life-mp-redis)"
}
health() {
  local c s path
  c=$(docker port life-mp-commerce 9000/tcp)
  s=$(docker port life-mp-storefront 3000/tcp)
  [[ "$c" =~ ^127\.0\.0\.1:[0-9]+$ && "$s" =~ ^127\.0\.0\.1:[0-9]+$ ]] || return 1
  curl -fsS --max-time 15 "http://$c/health" >/dev/null || return 1
  for path in / /catalog /checkout; do
    curl -fsS --max-time 15 "http://$s$path" >/dev/null || return 1
  done
  for path in / /catalog /checkout /api/health; do
    curl -fsS --max-time 20 "https://life-mp.pp.ua$path" >/dev/null || return 1
  done
}
refs() {
  docker inspect --format '{{.Config.Image}}' life-mp-commerce
  docker inspect --format '{{.Config.Image}}' life-mp-storefront
}
assert_service_runtime() {
  local service=$1 image=$2
  test "$(docker inspect --format '{{.Config.Image}}' "life-mp-$service")" = "$image" || return 1
  test "$(docker inspect --format '{{.Image}}' "life-mp-$service")" = \
    "$(docker image inspect --format '{{.Id}}' "$image")" || return 1
}
assert_runtime() {
  assert_service_runtime commerce "$1" || return 1
  assert_service_runtime storefront "$2" || return 1
}
runtime_ref() {
  local service=$1 present
  present=$(docker ps -a --filter "name=^/life-mp-$service$" --format '{{.Names}}') || return 1
  if [[ -n "$present" ]]; then
    test "$present" = "life-mp-$service" || return 1
    docker inspect --format '{{.Config.Image}}' "life-mp-$service"
  fi
}
start_apps() {
  compose "$DIR/docker-compose.prod.yml" up -d --no-deps --no-build --pull never \
    --wait --wait-timeout 180 commerce || return 1
  compose "$DIR/docker-compose.prod.yml" up -d --no-deps --no-build --pull never \
    --wait --wait-timeout 180 storefront || return 1
}

validate_host
case "$OPERATION" in
  discovery)
    docker compose version
    docker ps --filter label=com.docker.compose.project=life-mp --format '{{.Names}}\t{{.Image}}\t{{.Status}}'
    free -h
    df -h "$DIR" /var/backups/life-mp
    refs
    health
    echo 'Discovery passed; host identity still relies on the independently trusted SSH host key.'
    exit 0
    ;;
  verify)
    assert_runtime "$COMMERCE" "$STOREFRONT"
    health
    refs
    echo 'HTTP and image verification passed; operator must also inspect the browser surface.'
    exit 0
    ;;
esac

# Serialize mutations across terminals without touching other projects.
test -w /var/backups/life-mp
exec 9>/var/backups/life-mp/demo-7226ce7.lock
flock -n 9
TEMP=$(mktemp -d "$DIR/.demo-update.XXXXXX")
AUTH_CONFIG=
MUTATED=0
OLD_C=
OLD_S=

atomic_compose() {
  cp "$1" "$TEMP/compose.next.yml" || return 1
  chmod 600 "$TEMP/compose.next.yml" || return 1
  mv -f "$TEMP/compose.next.yml" "$DIR/docker-compose.prod.yml" || return 1
}
rollback_apps() {
  atomic_compose "$STATE/compose.before.yml" || return 1
  start_apps || return 1
  assert_runtime "$OLD_C" "$OLD_S" || return 1
  health || return 1
  touch "$STATE/ROLLBACK_COMPLETE" || return 1
}
finish() {
  local rc=$?
  trap - EXIT
  trap '' INT TERM HUP
  set +e
  # Rollback uses already-local images. Delete temporary registry credentials first.
  if [[ -n "$AUTH_CONFIG" ]]; then
    DOCKER_CONFIG="$AUTH_CONFIG" docker logout ghcr.io >/dev/null 2>&1
    rm -rf -- "$AUTH_CONFIG"
    unset DOCKER_CONFIG
  fi
  if (( rc != 0 && MUTATED == 1 )); then
    if rollback_apps; then
      echo 'Promotion failed; captured prior images restored.' >&2
    else
      echo 'STOP: rollback verification failed. No DB restore/prune is permitted.' >&2
    fi
  fi
  rm -rf -- "$TEMP"
  exit "$rc"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

printf '%s' "$CANDIDATE_BASE64" | base64 --decode > "$TEMP/candidate.yml"
compose "$TEMP/candidate.yml" config --quiet
compose "$DIR/docker-compose.prod.yml" config --format json > "$TEMP/active.json"
compose "$TEMP/candidate.yml" config --format json > "$TEMP/candidate.json"
jq -e --arg c "$COMMERCE" --arg s "$STOREFRONT" \
  '.services.commerce.image==$c and .services.storefront.image==$s' "$TEMP/candidate.json" >/dev/null
# Same project directory ensures relative paths resolve identically for both files.
# Materialize both sides: process-substitution failures must not compare as empty output.
jq -S 'del(.services.commerce.image,.services.storefront.image)' "$TEMP/active.json" > "$TEMP/active.normalized.json"
jq -S 'del(.services.commerce.image,.services.storefront.image)' "$TEMP/candidate.json" > "$TEMP/candidate.normalized.json"
cmp -s "$TEMP/active.normalized.json" "$TEMP/candidate.normalized.json"

if [[ "$OPERATION" == rollback ]]; then
  test -d "$STATE"
  test ! -L "$STATE"
  test -f "$STATE/BACKUP_COMPLETE"
  test ! -e "$STATE/ROLLBACK_COMPLETE"
  (cd "$STATE" && sha256sum -c CHECKSUMS.sha256 >/dev/null)
  sha256sum -c "$STATE/environment.sha256" >/dev/null
  mapfile -t OLD < "$STATE/runtime.before.txt"
  test "${#OLD[@]}" = 2
  OLD_C=${OLD[0]}
  OLD_S=${OLD[1]}
  [[ "$OLD_C" =~ ^ghcr\.io/georgekgk2/life-commerce@sha256:[a-f0-9]{64}$ ]]
  [[ "$OLD_S" =~ ^ghcr\.io/georgekgk2/life-storefront@sha256:[a-f0-9]{64}$ ]]
  # Permit recovery from a partial failed cutover, but never undo a later release.
  CURRENT_C=$(runtime_ref commerce)
  CURRENT_S=$(runtime_ref storefront)
  [[ -z "$CURRENT_C" || "$CURRENT_C" == "$COMMERCE" || "$CURRENT_C" == "$OLD_C" ]]
  [[ -z "$CURRENT_S" || "$CURRENT_S" == "$STOREFRONT" || "$CURRENT_S" == "$OLD_S" ]]
  if [[ -n "$CURRENT_C" ]]; then assert_service_runtime commerce "$CURRENT_C"; fi
  if [[ -n "$CURRENT_S" ]]; then assert_service_runtime storefront "$CURRENT_S"; fi
  docker image inspect "$OLD_C" "$OLD_S" >/dev/null
  rollback_apps
  echo 'Rollback passed; no database restore performed.'
  exit 0
fi

check_pre_cutover_resume() {
  RESUMING=0
  if [[ -e "$STATE" || -L "$STATE" ]]; then
    test -d "$STATE"
    test ! -L "$STATE"
    test -f "$STATE/BACKUP_COMPLETE"
    test ! -e "$STATE/CUTOVER_STARTED"
    test ! -e "$STATE/PROMOTION_COMPLETE"
    test ! -e "$STATE/ROLLBACK_COMPLETE"
    (cd "$STATE" && sha256sum -c CHECKSUMS.sha256 >/dev/null)
    sha256sum -c "$STATE/environment.sha256" >/dev/null
    cmp -s "$DIR/docker-compose.prod.yml" "$STATE/compose.before.yml"
    mapfile -t CAPTURED < "$STATE/runtime.before.txt"
    test "${#CAPTURED[@]}" = 2
    test "${CAPTURED[0]}" = "$OLD_C"
    test "${CAPTURED[1]}" = "$OLD_S"
    RESUMING=1
  fi
}

# One actual cutover. An authentication abort may resume only its untouched capture.
health
OLD_C=$(docker inspect --format '{{.Config.Image}}' life-mp-commerce)
OLD_S=$(docker inspect --format '{{.Config.Image}}' life-mp-storefront)
[[ "$OLD_C" =~ ^ghcr\.io/georgekgk2/life-commerce@sha256:[a-f0-9]{64}$ ]]
[[ "$OLD_S" =~ ^ghcr\.io/georgekgk2/life-storefront@sha256:[a-f0-9]{64}$ ]]
assert_runtime "$OLD_C" "$OLD_S"
jq -e --arg c "$OLD_C" --arg s "$OLD_S" \
  '.services.commerce.image==$c and .services.storefront.image==$s' "$TEMP/active.json" >/dev/null
check_pre_cutover_resume

# Interactive operator credentials live only in a temporary Docker config.
# Headless use keeps the existing credential helper; never searches for tokens.
if [[ -t 0 && -t 1 ]]; then
  AUTH_CONFIG=$(mktemp -d)
  export DOCKER_CONFIG="$AUTH_CONFIG"
  read -r -s -p 'GHCR classic PAT (read:packages): ' TOKEN </dev/tty
  printf '\n' >&2
  printf '%s' "$TOKEN" | docker login ghcr.io -u Georgekgk2 --password-stdin
  unset TOKEN
fi

if (( RESUMING == 0 )); then
  mkdir -m 700 "$STATE"
  cp docker-compose.prod.yml "$STATE/compose.before.yml"
  printf '%s\n%s\n' "$OLD_C" "$OLD_S" > "$STATE/runtime.before.txt"
  sha256sum "$DIR/.env.production" > "$STATE/environment.sha256"
  DB_USER=$(jq -er '.services.postgres.environment.POSTGRES_USER' "$TEMP/active.json")
  DB_NAME=$(jq -er '.services.postgres.environment.POSTGRES_DB' "$TEMP/active.json")
  docker exec life-mp-postgres pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$STATE/database.dump"
  test -s "$STATE/database.dump"
  docker exec -i life-mp-postgres pg_restore -l < "$STATE/database.dump" >/dev/null
  (cd "$STATE" && sha256sum compose.before.yml runtime.before.txt environment.sha256 database.dump > CHECKSUMS.sha256 && sha256sum -c CHECKSUMS.sha256 >/dev/null)
  touch "$STATE/BACKUP_COMPLETE"
else
  echo 'Continuing the captured pre-cutover attempt; existing backup evidence retained.'
fi

docker pull "$COMMERCE"
docker pull "$STOREFRONT"
test "$(docker image inspect --format '{{.Architecture}}' "$COMMERCE")" = amd64
test "$(docker image inspect --format '{{.Architecture}}' "$STOREFRONT")" = amd64

# Stop if operator configuration changed during backup/pull.
cmp -s docker-compose.prod.yml "$STATE/compose.before.yml"
sha256sum -c "$STATE/environment.sha256" >/dev/null
assert_runtime "$OLD_C" "$OLD_S"
# Irreversible attempt marker: no automatic/manual re-promotion after cutover begins.
touch "$STATE/CUTOVER_STARTED"
MUTATED=1
atomic_compose "$TEMP/candidate.yml"
start_apps
assert_runtime "$COMMERCE" "$STOREFRONT"
health
touch "$STATE/PROMOTION_COMPLETE"
MUTATED=0
refs
echo 'Promotion passed; inspect /, /catalog and /checkout in the browser before customer communication.'
