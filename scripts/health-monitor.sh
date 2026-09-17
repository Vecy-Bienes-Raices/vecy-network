#!/bin/bash
# ==============================================================================
# VECY NETWORK — WATCHDOG Y SUPERVISOR AUTÓNOMO DE SALUD (VPS)
# ==============================================================================
# Verifica periódicamente el estado de salud de los servicios críticos:
# 1. Proceso PM2 (jania-server)
# 2. Conexión a PostgreSQL local
# 3. Respuesta HTTP del servidor tRPC / Express
# ==============================================================================

LOG_FILE="/var/log/vecy-health-monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

# 1. Verificar PostgreSQL local
if ! pg_isready -h localhost -p 5432 -q; then
    log "⚠️ PostgreSQL no responde en localhost:5432. Reiniciando servicio..."
    systemctl restart postgresql
    sleep 2
    if pg_isready -h localhost -p 5432 -q; then
        log "✅ PostgreSQL restablecido exitosamente."
    else
        log "❌ Error crítico: PostgreSQL sigue sin responder."
    fi
fi

# 2. Verificar estado en PM2
PM2_STATUS=$(node -e 'try { const list = JSON.parse(require("child_process").execSync("pm2 jlist").toString()); const s = list.find(x => x.name === "jania-server"); console.log(s ? s.pm2_env.status : "not_found"); } catch(e) { console.log("error"); }')

if [ "$PM2_STATUS" != "online" ]; then
    log "⚠️ jania-server no está online (estado: $PM2_STATUS). Reiniciando..."
    pm2 restart jania-server
    log "🔄 jania-server reiniciado por watchdog."
    exit 0
fi

# 3. Verificar respuesta HTTP en endpoint local (timeout 5s)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:3000/api/trpc/janIA.getBotStatus?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D")

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "400" ]; then
    log "⚠️ Endpoint local HTTP no respondió adecuadamente (código: $HTTP_CODE). Posible asfixia de Event Loop. Reiniciando..."
    pm2 restart jania-server
    log "🔄 jania-server reiniciado por falla en sondeo HTTP."
    exit 0
fi
