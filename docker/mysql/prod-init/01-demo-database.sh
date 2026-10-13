#!/bin/sh
# Runs once, the first time the production MySQL starts (an empty data volume).
# The real database (MYSQL_DATABASE) and its user are made by the MySQL image itself;
# this adds the demo site's database, for the same user.
set -e

mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<EOSQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_demo\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_demo\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
EOSQL
