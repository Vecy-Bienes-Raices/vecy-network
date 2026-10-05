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

# 3. Periodo de gracia tras arranque (600 segundos / 10 minutos)
if [ -n "$PM2_UPTIME_SEC" ] && [ "$PM2_UPTIME_SEC" -lt 600 ]; then
    # El servidor requiere tiempo para cargar índices geográficos, Divipola y sincronizar 26k archivos de Baileys sin reiniciar prematuramente
    exit 0
fi

# 4. Verificar respuesta HTTP en endpoint /api/health (IPv4 estricto 127.0.0.1, timeout 30s con triple verificación)
HTTP_CODE=$(curl --ipv4 -s -o /dev/null -w "%{http_code}" --max-time 30 "http://127.0.0.1:3000/api/health")

if [ "$HTTP_CODE" != "200" ]; then
    # Primer intento falló, esperar 20 segundos y reintentar para descartar picos de procesamiento de mensajes WhatsApp
    sleep 20
    RETRY_CODE_1=$(curl --ipv4 -s -o /dev/null -w "%{http_code}" --max-time 30 "http://127.0.0.1:3000/api/health")
    if [ "$RETRY_CODE_1" != "200" ]; then
        sleep 20
        RETRY_CODE_2=$(curl --ipv4 -s -o /dev/null -w "%{http_code}" --max-time 30 "http://127.0.0.1:3000/api/health")
        if [ "$RETRY_CODE_2" != "200" ]; then
            log "⚠️ Endpoint /api/health no respondió tras 3 intentos espaciados (códigos: $HTTP_CODE, $RETRY_CODE_1, $RETRY_CODE_2). Reiniciando..."
            pm2 restart jania-server
            log "🔄 jania-server reiniciado por falla confirmada en sondeo HTTP."
            exit 0
        fi
    fi
fi
