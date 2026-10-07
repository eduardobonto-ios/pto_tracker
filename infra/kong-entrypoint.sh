#!/bin/sh
set -e
: "${ENV_DOMAIN:?ENV_DOMAIN must be set to the Container Apps environment default domain}"
mkdir -p /home/kong
# Only ENV_DOMAIN is substituted; $ in the config is otherwise literal.
sed "s|\${ENV_DOMAIN}|${ENV_DOMAIN}|g" /tmp/kong.yml.template > /home/kong/kong.yml
exec /docker-entrypoint.sh kong docker-start
