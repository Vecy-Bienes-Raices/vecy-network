#!/bin/bash
# Mantiene los dos túneles SSH reversos en primer plano (supervisados por systemd)
VPS_HOST="13.140.149.144"
SSH_KEY="${HOME}/.ssh/id_vps"

echo "[$(date)] Iniciando túneles SSH reversos PGN (18443) y ADRES (28443) hacia $VPS_HOST..."
exec ssh -N \
  -o ServerAliveInterval=15 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -o StrictHostKeyChecking=accept-new \
  -o BatchMode=yes \
  -i "$SSH_KEY" \
  -R 18443:apps.procuraduria.gov.co:443 \
  -R 28443:aplicaciones.adres.gov.co:443 \
  root@$VPS_HOST
