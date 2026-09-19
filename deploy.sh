#!/bin/bash
# Заливка сайта на camp.derzayvdesign.com
# Запуск:  ./deploy.sh
set -u

HOST="87.236.19.14"
USER="elianora21"
PASS="Vvl3PFJC2ves"
DIR="camp.derzayvdesign.com/public_html"
FILES="cold.html index.html cold.css script.js styles.css oferta.html doc.css"

cd "$(dirname "$0")" || exit 1

command -v lftp >/dev/null || { echo "Нет lftp. Установите:  brew install lftp"; exit 1; }

echo "Заливаю на $DIR"
echo

lftp -u "$USER,$PASS" "$HOST" <<LFTP
set ftp:passive-mode true
set ftp:prefer-epsv false
set ftp:fix-pasv-address true
set net:timeout 30
set net:max-retries 3
cd $DIR
mput $FILES
bye
LFTP

echo
echo "Готово. Откройте сайт и нажмите Cmd+Shift+R"
