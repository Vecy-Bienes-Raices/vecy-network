#!/bin/bash
# Script vigilante para mantener los túneles inversos a la Procuraduría y ADRES / BDUA activos
# Conecta el VPS con la salida local (Colombia) para eludir el geobloqueo de MinTIC / Azure / Cloud

VPS_HOST="13.140.149.144"

# 1. Túnel Procuraduría General de la Nación (SIRI)
PORT_PGN="18443"
DEST_PGN="apps.procuraduria.gov.co:443"
if ! pgrep -f "ssh.*-R $PORT_PGN:$DEST_PGN" > /dev/null; then
    echo "[$(date)] Iniciando túnel SSH reverso Procuraduría hacia $VPS_HOST:$PORT_PGN..."
    ssh -f -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -R $PORT_PGN:$DEST_PGN root@$VPS_HOST
else
    echo "[$(date)] Túnel SSH hacia $VPS_HOST:$PORT_PGN (Procuraduría) ya se encuentra activo."
fi

# 2. Túnel ADRES / BDUA (Ministerio de Salud)
PORT_ADRES="28443"
DEST_ADRES="aplicaciones.adres.gov.co:443"
if ! pgrep -f "ssh.*-R $PORT_ADRES:$DEST_ADRES" > /dev/null; then
    echo "[$(date)] Iniciando túnel SSH reverso ADRES hacia $VPS_HOST:$PORT_ADRES..."
    ssh -f -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -R $PORT_ADRES:$DEST_ADRES root@$VPS_HOST
else
    echo "[$(date)] Túnel SSH hacia $VPS_HOST:$PORT_ADRES (ADRES) ya se encuentra activo."
fi

