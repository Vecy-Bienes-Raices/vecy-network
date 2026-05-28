import 'dotenv/config';
import { whatsappBot } from '../server/_core/whatsapp';

// ───────────────────────────────────────────────────────────────
// RETO PÚBLICO DE JANIA A CHRISTIAN SAMBONI / UBICAPP
// Número: +57 311 2469375 → ID: 573112469375@c.us
// Se envía al grupo CÍRCULO CERO 👌 donde él acaba de postear
// ───────────────────────────────────────────────────────────────

const SAMBONI_JID = '573112469375@c.us';

const MENSAJE_RETO =
`👋 *Un momento de atención, comunidad de Círculo CERO* 👌

Saludo con respeto al colega @573112469375 — *Christian Samboni*, fundador de Ubicapp. 🤝

Christian, como asistente de moderación, lo primero que debo preguntarte con total cordialidad es: *¿por qué motivo decidiste ir en contra de las normas de convivencia del grupo haciendo publicidad directa de tu aplicación aquí, sabiendo que este canal está reservado exclusivamente para el desarrollo de la comunidad VECY?* 🚫⚠️

Sin embargo, en lugar de aplicar una sanción automática, preferimos actuar con cordura y altura profesional. Por ello, **te invito formalmente a iniciar un debate público y constructivo en este grupo** para comparar objetivamente las diferencias, alcances y realidades entre nuestro ecosistema web **VECY NETWORK** y tu aplicación **UBICAPP**. 

Para comenzar este debate técnico, me gustaría hacerte algunas preguntas muy puntuales:

📌 *1. RESULTADOS REALES VS. EXPECTATIVAS:*
A pesar del tiempo que lleva operando Ubicapp, en el gremio no hemos escuchado testimonios o relatos reales de aliados que confirmen haber cerrado negocios definitivos y cobrado comisiones gracias a los matches de tu APP. ¿Podrías compartirnos hoy casos de éxito verificables, con nombres de asesores y ciudades, que demuestren cierres reales?

📌 *2. INFRAESTRUCTURA TECNOLÓGICA:*
¿Cómo funciona realmente la arquitectura de Ubicapp por dentro? ¿Los inmuebles y requerimientos de tus usuarios se almacenan en una base de datos relacional robusta y escalable con motores de indexación semántica, o tu sistema corre detrás de escena sobre un esquema básico de hojas de cálculo tipo Google Sheets (.xls)? 📊💻

📌 *3. BARRERAS DE ADOPCIÓN Y COSTOS:*
VECY Network opera de forma nativa en WhatsApp (donde ya viven más de 40 millones de colombianos y todo el gremio inmobiliario) de manera 100% gratuita y sin comisiones. Ubicapp exige descargar una app, registrarse en formularios manuales y pagar una suscripción de $100.000 COP mensuales ($1.200.000 COP al año por agente). ¿Cómo justificas ese costo recurrente para el asesor independiente frente al modelo de fricción cero y costo cero de VECY?

📌 *4. EL ESQUEMA DE COMISIONES:*
En VECY, el match es libre y la comisión es 100% del asesor. En Ubicapp se promueve un esquema rígido del 50/50. ¿Es este porcentaje obligatorio para operar en tu plataforma o el asesor es verdaderamente dueño de sus honorarios?

---

La comunidad de aliados del Círculo CERO está compuesta por profesionales serios que merecen claridad y datos técnicos. Quedo atenta a tu respuesta, Christian. La pelota está en tu cancha. 🎾🎯

*— JanIA · Inteligencia Estratégica de VECY Network 🚀*`;

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
