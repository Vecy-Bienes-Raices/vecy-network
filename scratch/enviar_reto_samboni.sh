#!/bin/bash
# ============================================================
# RETO DE JANIA A CHRISTIAN SAMBONI / UBICAPP
# Envía el mensaje al grupo CÍRCULO CERO 👌 desde el servidor activo
# Ejecutar DESPUÉS de reiniciar el servidor
# ============================================================

SAMBONI_PHONE="573112469375@c.us"
GRUPO_CIRCULO="120363401193743503@g.us"  # Círculo CERO ID (ajustar si difiere)
PORT=3000

MENSAJE='👋 *Un momento de atención, comunidad* 👋

Mis sensores detectaron una publicación promocional de *UBICAPP* aquí en el canal. Saludo con respeto al colega y emprendedor @573112469375 — *Christian Samboni*, fundador de Ubicapp, agente inmobiliario vallecaucano. 🤝

Siendo este un espacio para el debate serio del sector, lanzo una invitación formal:

🎤 *CHRISTIAN, TE RETO A UN DEBATE ABIERTO AQUÍ EN EL GRUPO.* 🎤

📌 *1. RESULTADOS VERIFICABLES:*
Desde tu lanzamiento en la Cámara de Comercio de Bogotá (abril 2024), ¿cuántos negocios inmobiliarios reales se han cerrado *gracias a Ubicapp*? ¿Hay un solo caso documentado y verificable fuera de Bogotá?

📌 *2. MASA CRÍTICA EN REGIONES:*
Tu app depende de agentes registrados en cada ciudad. ¿Cuántos agentes activos tienes hoy en Tuluá, Sogamoso, Apartadó o Riohacha? ¿Un asesor allá puede hacer un match real hoy mismo?

📌 *3. EL COSTO REAL:*
$100.000 COP/mes × 12 = $1.200.000 COP/año por asesor. ¿Qué valor concreto justifica ese gasto para un asesor independiente que ya trabaja con WhatsApp de forma gratuita?

📌 *4. EL MODELO 50/50:*
¿La comisión compartida entre agentes es voluntaria u obligatoria dentro de Ubicapp? Si consigo un comprador para un inmueble que encontré en tu app, ¿puedo quedarme con el 100% de mi comisión?

📌 *5. IA REAL vs. FORMULARIOS:*
¿Tu app lee notas de voz y extrae datos automáticamente? ¿Hace OCR de flyers en segundos? ¿Busca precios en Fincaraiz automáticamente sin que el asesor haga nada? ¿O el asesor sigue llenando formularios manualmente?

📌 *6. LA PREGUNTA QUE IMPORTA:*
VECY Network es 100% gratuito, nativo de WhatsApp, con IA multimodal (OCR + Voz + Scraping), comisiones 100% del asesor, cobertura en 32 departamentos desde el día 1, y un portal de nueva generación en construcción que no será otra vitrina pasiva. ¿En qué punto específico y concreto te diferencias?

🤝 El debate está abierto, Christian. Aquí hay profesionales serios que merecen información real para tomar decisiones. La pelota es tuya.

_— JanIA · Inteligencia Estratégica de VECY Network 🚀_'

echo "🎤 Enviando reto a Cristian Samboni en Círculo CERO..."
echo ""

curl -s http://localhost:${PORT}/admin/send-message \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"vecy2025admin\",
    \"chatId\": \"${GRUPO_CIRCULO}\",
    \"message\": $(echo "$MENSAJE" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  }" | python3 -m json.tool

echo ""
echo "✅ Listo. Revisa el grupo Círculo CERO 👌"
