#!/bin/sh
set -e
BACKEND_URL=${BACKEND_URL:-http://backend:8000}
PORT=${PORT:-80}
export BACKEND_URL PORT
envsubst '${BACKEND_URL} ${PORT}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
