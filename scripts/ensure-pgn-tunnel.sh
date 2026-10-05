#!/bin/bash
# Script vigilante para mantener el túnel inverso a la Procuraduría activo
# Conecta el VPS (Francia) con la salida local (Colombia) para eludir el geobloqueo de MinTIC / Azure

VPS_HOST="13.140.149.144"
TARGET_PORT="18443"
REMOTE_DEST="apps.procuraduria.gov.co:443"

if ! pgrep -f "ssh.*-R $TARGET_PORT:$REMOTE_DEST" > /dev/null; then
    echo "[$(date)] Iniciando túnel SSH reverso hacia $VPS_HOST:$TARGET_PORT..."
    ssh -f -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -R $TARGET_PORT:$REMOTE_DEST root@$VPS_HOST
else
    echo "[$(date)] Túnel SSH hacia $VPS_HOST:$TARGET_PORT ya se encuentra activo."
fi
