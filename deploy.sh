#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DamgaPanel — tek komutluk deploy  (proje içinde: damga-panel/deploy.sh)
# GitHub'dan çek → bağımlılıkları kur → DB migrate → build → pm2 restart.
#
# KULLANIM (sunucuda):   /opt/damga-panel/deploy.sh
# ÖNKOŞUL:               Değişikliklerin GitHub 'main' dalına push edilmiş olması.
#
# Güvenli: herhangi bir adım başarısız olursa deploy durur ve sistem önceki
# (çalışan) sürümde kalır. Sonda geri-alma (rollback) komutu yazdırılır.
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail

# Script repo içinde olduğu için 'git reset' sırasında kendini değiştirebilir.
# Bunu önlemek için kendini /tmp'e kopyalayıp oradan çalışır; uygulama dizinini
# ilk (repo içindeki) konumundan belirleyip yeni sürece aktarır.
if [ "${DEPLOY_REEXEC:-}" != "1" ]; then
  SELF="$(readlink -f "$0")"
  APP_DIR="$(cd "$(dirname "$SELF")" && pwd)"
  cp "$SELF" /tmp/damga-deploy-run.sh
  exec env DEPLOY_REEXEC=1 DEPLOY_APP_DIR="$APP_DIR" bash /tmp/damga-deploy-run.sh "$@"
fi

APP_DIR="${DEPLOY_APP_DIR:?uygulama dizini belirlenemedi}"
BRANCH="main"
# pm2 uygulamaları node v20.20.2 (nvm) ile çalışıyor — build de AYNI sürümle yapılmalı.
NODE_BIN="/root/.nvm/versions/node/v20.20.2/bin"
[ -d "$NODE_BIN" ] && export PATH="$NODE_BIN:$PATH"

c_blue='\033[1;36m'; c_red='\033[1;31m'; c_grn='\033[1;32m'; c_dim='\033[2m'; c_off='\033[0m'
step() { echo -e "\n${c_blue}▶ $*${c_off}"; }
ok()   { echo -e "${c_grn}✔ $*${c_off}"; }
die()  { echo -e "\n${c_red}✖ HATA: $*${c_off}" >&2; exit 1; }
trap 'die "Bir adım başarısız oldu (satır $LINENO). Deploy durduruldu; sistem önceki sürümde çalışmaya devam ediyor."' ERR

cd "$APP_DIR" || die "Uygulama dizini bulunamadı: $APP_DIR"

step "Node sürümü (pm2 ile aynı olmalı)"
node -v

step "Sürüm bilgisi"
PREV="$(git rev-parse HEAD)"
echo -e "Önceki commit: ${c_dim}${PREV}${c_off}"

step "GitHub'dan son değişiklikler çekiliyor ($BRANCH)"
git fetch --prune origin "$BRANCH"
git checkout "$BRANCH" >/dev/null 2>&1 || git checkout -B "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"
NEW="$(git rev-parse HEAD)"
echo -e "Yeni commit:   ${c_dim}${NEW}${c_off}"
if [ "$PREV" = "$NEW" ]; then
  echo "(Değişiklik yok — yine de kurulum/build/restart yapılacak.)"
fi

step "Bağımlılıklar kuruluyor (npm ci — dev dahil)"
npm ci --include=dev

step "Prisma client üretiliyor"
npx prisma generate

step "Veritabanı migration'ları uygulanıyor (migrate deploy)"
# Not: 'deploy' modu sadece bekleyen migration'ları uygular; veriyi silmez.
npx prisma migrate deploy

step "Proje derleniyor (next build)"
npm run build

step "Uygulamalar yeniden başlatılıyor (pm2)"
pm2 restart damga-web damga-worker --update-env
pm2 save >/dev/null 2>&1 || true

step "Servis durumu"
sleep 3
pm2 status

echo
ok "Deploy tamamlandı:  ${PREV:0:7} → ${NEW:0:7}"
echo -e "${c_dim}Geri almak gerekirse:${c_off}"
echo -e "  cd $APP_DIR && git reset --hard $PREV && npm ci --include=dev && npm run build && pm2 restart damga-web damga-worker"
