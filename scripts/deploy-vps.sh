#!/usr/bin/env bash
# ==============================================================================
# VECY NETWORK — Script Asistido de Despliegue en VPS Contabo
# Uso local: npm run deploy:vps
# ==============================================================================
set -e

# Configuración por defecto (sobrescribible por variables de entorno)
VPS_HOST="${VPS_HOST:-13.140.149.144}"
VPS_USER="${VPS_USER:-root}"
VPS_DIR="${VPS_DIR:-/var/www/vecy-network}"
VPS_PORT="${VPS_PORT:-22}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_vps}"

echo "================================================================="
echo "🚀 VECY NETWORK — INICIANDO DESPLIEGUE EN CONTABO VPS"
echo "================================================================="
echo "📍 Servidor destino: ${VPS_USER}@${VPS_HOST}:${VPS_PORT}"
echo "📁 Directorio app:   ${VPS_DIR}"
echo "🔑 Llave SSH:        ${SSH_KEY}"
echo "-----------------------------------------------------------------"

# Verificar existencia de llave SSH
if [ ! -f "$SSH_KEY" ]; then
  echo "⚠️ Advertencia: No se encontró la llave SSH en $SSH_KEY."
  echo "Intentando conexión con el agente SSH por defecto..."
  SSH_CMD="ssh -p ${VPS_PORT} -o ConnectTimeout=10 -o BatchMode=yes ${VPS_USER}@${VPS_HOST}"
else
  SSH_CMD="ssh -i ${SSH_KEY} -p ${VPS_PORT} -o ConnectTimeout=10 -o BatchMode=yes ${VPS_USER}@${VPS_HOST}"
fi

# Ejecutar comandos de despliegue de forma atómica en el VPS
$SSH_CMD bash -c "'
  set -e
  echo \"📥 [1/4] Descargando últimos cambios desde origin/main...\"
  cd \"${VPS_DIR}\"
  git pull origin main

  echo \"📦 [2/4] Verificando dependencias (pnpm / npm)...\"
  if command -v pnpm &> /dev/null; then
    pnpm install
  else
    npm install --omit=dev || npm install
  fi

  echo \"🔨 [3/4] Compilando frontend Vite y backend Node...\"
  npm run build

  echo \"🔄 [4/4] Recargando servidor con PM2 (Zero-Downtime)...\"
  pm2 reload jania-server --update-env || pm2 reload all

  echo \"-----------------------------------------------------------------\"
  echo \"📊 ESTADO EN VIVO DE PM2 EN VPS:\"
  pm2 status
  echo \"-----------------------------------------------------------------\"
  echo \"✅ Despliegue en VPS completado con éxito a las \$(date)\"
'"

echo "🎉 [VECY-DEPLOY] ¡Despliegue finalizado exitosamente!"
