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
PM2_DATA=$(node -e 'try { const list = JSON.parse(require("child_process").execSync("pm2 jlist").toString()); const s = list.find(x => x.name === "jania-server"); if (!s) { console.log("not_found 0"); } else { const uptimeSec = Math.floor((Date.now() - s.pm2_env.pm_uptime) / 1000); console.log(s.pm2_env.status + " " + uptimeSec); } } catch(e) { console.log("error 0"); }')

PM2_STATUS=$(echo "$PM2_DATA" | awk '{print $1}')
PM2_UPTIME_SEC=$(echo "$PM2_DATA" | awk '{print $2}')

if [ "$PM2_STATUS" != "online" ]; then
    log "⚠️ jania-server no está online (estado: $PM2_STATUS). Reiniciando..."
    pm2 restart jania-server
    log "🔄 jania-server reiniciado por watchdog."
    exit 0
fi

# 3. Periodo de gracia tras arranque (120 segundos)
if [ -n "$PM2_UPTIME_SEC" ] && [ "$PM2_UPTIME_SEC" -lt 120 ]; then
    # El servidor acaba de iniciar; darle tiempo para cargar índices y socket sin reiniciar prematuramente
    exit 0
fi

# 4. Verificar respuesta HTTP en endpoint /api/health (timeout 10s con doble verificación)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:3000/api/health")

if [ "$HTTP_CODE" != "200" ]; then
    # Primer intento falló, esperar 5 segundos y reintentar para descartar picos transitorios
    sleep 5
    RETRY_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:3000/api/health")
    if [ "$RETRY_CODE" != "200" ]; then
        log "⚠️ Endpoint /api/health no respondió tras 2 intentos (códigos: $HTTP_CODE, $RETRY_CODE). Posible asfixia de Event Loop. Reiniciando..."
        pm2 restart jania-server
        log "🔄 jania-server reiniciado por falla confirmada en sondeo HTTP."
        exit 0
    fi
fi
