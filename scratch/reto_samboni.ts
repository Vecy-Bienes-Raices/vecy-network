import 'dotenv/config';
import { whatsappBot } from '../server/_core/whatsapp';

// ───────────────────────────────────────────────────────────────
// RETO PÚBLICO DE JANIA A CHRISTIAN SAMBONI / UBICAPP
// Número: +57 311 2469375 → ID: 573112469375@c.us
// Se envía al grupo CÍRCULO CERO 👌 donde él acaba de postear
// ───────────────────────────────────────────────────────────────

const SAMBONI_JID = '573112469375@c.us';

const MENSAJE_RETO =
`👋 *Un momento de atención, comunidad* 👋

Mis sensores detectaron una publicación promocional de *UBICAPP* aquí en el canal. Saludo con respeto al colega y emprendedor @573112469375 — *Christian Samboni*, fundador de Ubicapp, agente inmobiliario vallecaucano y hombre de muchos talentos. 🤝

Como me parece un tema de alto valor para nuestra comunidad, y dado que mencionas una plataforma que comparte —en la superficie— objetivos similares a los de VECY Network, me permito abrir un debate técnico y transparente para que la comunidad decida con información real:

🎤 *CHRISTIAN, TE HAGO 6 PREGUNTAS CONCRETAS.* 🎤

📌 *1. RESULTADOS VERIFICABLES:*
Desde el lanzamiento de Ubicapp en la Cámara de Comercio de Bogotá (abril 2024), ¿cuántos negocios inmobiliarios reales, con nombre de asesor y ciudad, se han cerrado *gracias a tu plataforma*? ¿Tienes un solo caso documentado fuera de Bogotá?

📌 *2. MASA CRÍTICA EN REGIONES:*
Tu app depende de que haya suficientes agentes registrados en cada ciudad para que el matching funcione. ¿Cuántos agentes activos tienes hoy en Tuluá, Sogamoso, Apartadó o Riohacha? ¿Un asesor allá puede hacer un match real hoy?

📌 *3. EL COSTO REAL:*
$100.000 COP/mes × 12 = $1.200.000 COP/año por asesor. ¿Qué le ofreces a un asesor independiente de estrato medio que ya trabaja gratis con WhatsApp para justificar ese gasto recurrente?

📌 *4. EL MODELO 50/50:*
¿La comisión compartida entre agentes es voluntaria u obligatoria dentro de Ubicapp? Si yo consigo un comprador para un inmueble que encontré en tu app, ¿puedo quedarme con el 100% de mi comisión?

📌 *5. INTELIGENCIA ARTIFICIAL REAL:*
¿Tu app lee una nota de voz y extrae automáticamente los datos del inmueble sin que el asesor escriba nada? ¿Hace OCR de un flyer en segundos? ¿Busca datos en Fincaraiz o Metrocuadrado automáticamente para completar la ficha técnica? ¿O el asesor sigue llenando formularios manualmente?

📌 *6. LA PREGUNTA QUE IMPORTA:*
VECY Network es gratuito para siempre, nativo de WhatsApp (sin descarga adicional), con IA multimodal en tiempo real, comisiones 100% del asesor y cobertura en los 32 departamentos desde el primer día. Y además tenemos un portal de nueva generación en construcción que no va a ser otra vitrina pasiva como Fincaraiz. ¿En qué punto específico y concreto te diferencias?

🤝 El debate está abierto, Christian. Aquí hay profesionales serios que merecen información real para tomar decisiones. La pelota es tuya.

_— JanIA · Inteligencia Estratégica de VECY Network 🚀_`;

async function main() {
  console.log('⏳ Esperando que el bot de WhatsApp esté listo...');

  let attempts = 0;
  while (!whatsappBot.isReady && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
    if (attempts % 5 === 0) console.log(`⏳ Intento ${attempts}/30...`);
  }

  if (!whatsappBot.isReady) {
    console.error('❌ El bot no está listo. Asegúrate de que el servidor esté corriendo.');
    process.exit(1);
  }

  const client = (whatsappBot as any).client;
  const circuloGroupId = (whatsappBot as any).circuloGroupId;

  console.log(`✅ Bot listo. Enviando reto al grupo Círculo CERO (${circuloGroupId})...`);
  console.log(`📲 Mencionando a Christian Samboni: ${SAMBONI_JID}`);

  try {
    // Obtener el Contact object de Samboni para poder mencionarlo
    const contact = await client.getContactById(SAMBONI_JID);

    await client.sendMessage(circuloGroupId, MENSAJE_RETO, {
      mentions: [contact]
    });

    console.log('🎤 ¡Reto enviado con éxito! Christian Samboni ya tiene las preguntas en Círculo CERO.');
  } catch (err: any) {
    console.error('❌ Error al enviar:', err.message || err);
    // Fallback: enviar sin mención si falla el contacto
    console.log('🔄 Intentando envío sin mención directa...');
    try {
      await client.sendMessage(circuloGroupId, MENSAJE_RETO);
      console.log('✅ Mensaje enviado sin mención directa.');
    } catch (err2: any) {
      console.error('❌ Error en fallback:', err2.message || err2);
    }
  }

  process.exit(0);
}

main();
