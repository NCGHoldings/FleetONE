#!/usr/bin/env bash
set -euo pipefail

wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /usr/share/keyrings/pgdg-archive-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/pgdg-archive-keyring.asc] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list > /dev/null
sudo apt-get update -qq
sudo apt-get install -y postgresql-client-16
