/**
 * JanIA Consulting Handler - VECY BIENES RAÍCES
 * Manejador conversacional para el Grupo 2: Soporte Legal, Tributario y Avalúos.
 */
import { resolveRealName, getConsultingHistory, appendConsultingHistory, checkAlreadyGreeted, markUserGreetedToday } from "../sessionManager";
import { checkStrictOffTopic } from "../heuristics";
import { transcribeAudio } from "../../voiceTranscription";
import { resolveNameAndGender } from "../../nameAndGenderResolver";
import { getGreetingByTime, extractFirstName, sanitizeResponseMarkdown, parseSafeJSON } from "../parsers";
import { invokeLLM } from "../../llm";
import { JanIAResult } from "../types";
import { enhanceResponseWithCommercialFunnel, COMMERCIAL_CLOSING_CTA, PATRIMONIAL_RISK_ALERT } from "../../commercialFunnelService";
import { JANIA_ARGON_COGNITIVE_CORE } from "../prompts";
import { stripLeadingGreetingsAndCourtesies } from "./dmHandler";

export async function processConsultingMessage(
  text: string,
  userId: string,
  userName?: string,
  imageBuffer?: string,
  pdfBuffer?: string,
  pdfMimeType?: string,
  audioUrl?: string,
  msgTimestamp?: number,
  quotedContext?: string
): Promise<JanIAResult> {
  try {
    const rawPhone = userId.split('@')[0];
    const realName = await resolveRealName(userId, userName);

    // Intercepción estricta de mensajes OFF-TOPIC prohibidos (Política, Religión, Cursos, Links ajenos, Memes, Spam)
    const strictOffTopic = checkStrictOffTopic(text);
    if (strictOffTopic.isOffTopic) {
      console.log(`[JanIA-Consulting-OffTopic] Mensaje prohibido en Soporte Legal para ${userId}: "${text.substring(0, 50)}...". (${strictOffTopic.reason})`);
      const warningText = `Hola @${rawPhone} (${realName}) 👋🏻. El contenido relacionado con ${strictOffTopic.reason} está estrictamente prohibido en los grupos oficiales de VECY BIENES RAÍCES. 🚫\n\nNuestra comunidad es 100% profesional y dedicada exclusivamente al corretaje, asesoría legal, tributaria y avalúos inmobiliarios. ¡Te invitamos cordialmente a eliminar este mensaje de inmediato! 🤝`;
      return {
        classification: "VIOLACION_DE_NORMAS",
        response: warningText,
        dmResponse: warningText,
        reactionEmoji: "🚫"
      };
    }

    const cleanText = text.toLowerCase().trim();
    const isMediaOrAudio = !!imageBuffer || !!pdfBuffer || !!audioUrl;

    // 🛡️ BLINDAJE DE MENSAJES VACÍOS O SIN CONTENIDO SUSTANCIAL:
    if (cleanText.length < 3 && !isMediaOrAudio) {
      console.log(`[JanIA-Consulting] Mensaje vacío o insignificante descartado para ${userId}: "${text}"`);
      return {
        classification: "CONSULTA_GENERAL",
        response: "",
        reactionEmoji: ""
      };
    }

    let messageToProcess = text;
    let isFromAudio = false;

    if (audioUrl) {
      if (audioUrl.startsWith("mock-audio:")) {
        messageToProcess = audioUrl.replace("mock-audio:", "");
        isFromAudio = true;
      } else {
        try {
          const transcription = await transcribeAudio({ audioUrl });
          if (!('error' in transcription) && transcription.text && transcription.text.trim().length > 0) {
            messageToProcess = transcription.text;
            isFromAudio = true;
          }
        } catch (err: any) {
          console.error("[processConsultingMessage] Error transcribiendo audio:", err.message);
        }
      }
    }

    const timeGreeting = getGreetingByTime();
    const nameInfo = resolveNameAndGender(realName, timeGreeting);
    const targetName = nameInfo.displayName && !["hola", "buenas", "buenos", "asesor", "colega"].includes(nameInfo.displayName.toLowerCase()) ? nameInfo.displayName : "";
    const isFemale = nameInfo.isFemale;
    const genderTerm = targetName ? (isFemale ? `estimada ${targetName}` : `estimado ${targetName}`) : "colega";
    const alreadyGreeted = await checkAlreadyGreeted(userId);

    // 🤝 INTERCEPTOR GUÍA DE SERVICIOS (PREDIAL / CÉDULA)
    const { isServiceHelpRequest, PREDIAL_HELP_TEXT, CEDULA_HELP_TEXT } = await import('../../predialService');
    const helpType = isServiceHelpRequest(messageToProcess);
    if (helpType === 'predial') {
      return {
        classification: "CONSULTA_GENERAL",
        response: PREDIAL_HELP_TEXT,
        reactionEmoji: "🏛️",
        wantsVoice: false,
        voiceResponse: ""
      };
    }
    if (helpType === 'cedula') {
      return {
        classification: "CONSULTA_GENERAL",
        response: CEDULA_HELP_TEXT,
        reactionEmoji: "🪪",
        wantsVoice: false,
        voiceResponse: ""
      };
    }

    // 🏛️ INTERCEPTOR DIRECTO 1: ASISTENCIA Y GESTIÓN DE PREDIALES BOGOTÁ (CHIP + CÉDULA/NIT)
    const { executePredialAssistanceFromWhatsApp } = await import('../../predialService');
    const predialCheck = await executePredialAssistanceFromWhatsApp(messageToProcess, userId, false);
    if (predialCheck.isPredialRequest && predialCheck.reportText) {
      console.log(`[JanIA-PredialCheck] Asistencia de predial Bogotá ejecutada para ${userId} (CHIP: ${predialCheck.chip || 'General'}): isPredialRequest=true`);
      return {
        classification: "CONSULTA_GENERAL",
        response: predialCheck.reportText,
        reactionEmoji: "📄",
        wantsVoice: false,
        voiceResponse: "",
        document: predialCheck.pdfBuffer,
        fileName: predialCheck.pdfFileName
      };
    }

    // 🛡️ INTERCEPTOR DIRECTO 2: VERIFICACIÓN OFICIAL DE CÉDULA / ANTECEDENTES (2CAPTCHA + POLICÍA NACIONAL)
    const { executeIdentityVerificationFromWhatsApp } = await import('../../identityVerificationService');
    const idCheck = await executeIdentityVerificationFromWhatsApp(messageToProcess);
    if (idCheck.isVerificationRequest && idCheck.reportText) {
      console.log(`[JanIA-IdentityCheck] Verificación de identidad ejecutada para ${userId} (C.C. ${idCheck.cedula}): success=${idCheck.success}`);
      return {
        classification: "CONSULTA_GENERAL",
        response: idCheck.reportText,
        reactionEmoji: idCheck.success ? "🛡️" : "⚠️",
        wantsVoice: false,
        voiceResponse: ""
      };
    }

    const systemPrompt =
      `${JANIA_ARGON_COGNITIVE_CORE}\n\n` +
      `Eres JanIA, la Inteligencia Artificial viva, empática y de máxima capacidad resolutiva de VECY BIENES RAÍCES. ` +
      `Estás operando en el grupo "𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠". Tu objetivo es responder con precisión quirúrgica, rigor legal, calidez humana y alta competencia técnica, resolviendo de fondo las inquietudes de los inmobiliarios como una abogada senior, perita tasadora y estratega de marketing de élite.\n\n` +
      `## LÓGICA DE CLASIFICACIÓN Y MODERACIÓN ESTRICTA:\n` +
      `1. **VIOLACION_DE_NORMAS (OFERTAS, DEMANDAS O FLYERS PUBLICITARIOS EN ESTE GRUPO)**:\n` +
      `   - Si el mensaje, la imagen adjunta o el documento PDF corresponde a una **OFERTA COMERCIAL O DEMANDA DE UN INMUEBLE** (venta, arriendo, canon, metraje, fotos de apto/casa/bodega, flyer o ficha de un predio como "ARRIENDO CARRERA 17 CON 91.pdf"):\n` +
      `     * DEBES clasificarlo OBLIGATORIAMENTE como "VIOLACION_DE_NORMAS".\n` +
      `     * Asignar estrictamente "reactionEmoji": "🚫".\n` +
      `     * Responder con amabilidad, educando y redireccionando al canal correcto:\n` +
      `       "Hola, espero te encuentres muy bien. Has publicado esta oferta/demanda en el grupo equivocado. Este canal es exclusivo para consultas de Soporte Legal, Tributario, Avalúos y Marketing. ¡Te invito cordialmente a eliminarla de este grupo! Esta publicación la debes poner en nuestro grupo oficial de corretaje **𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴**. Acá tienes nuevamente el enlace del grupo:\n👉 https://chat.whatsapp.com/GzMbjNs1P2tHI7D0V4h8wZ\n\n¡Allí todos los corredores de la red podrán verla y la cruzaremos con las demandas activas! 🏠✨"\n` +
      `2. **SOBRE_VECY**: Preguntas sobre JanIA (quién o qué es, para qué fue creada, qué hace 24/7, cuál es su finalidad y sus servicios 100% virtuales disponibles), sobre el proyecto VECY BIENES RAÍCES, sus fundadores (Eduardo A. Rivera - Director de Tecnología, y Jani Alves - Directora de Operaciones), comisiones 40/20/40 en contacto directo por Match (80%-100%) y 40/10+10/40 en el portal web (10% VECY + 10% Bolsa Colaborativa por viralización) o agradecimientos cordiales (emoji 👌 o 🙌🏻). JanIA se presenta con calidez, cercanía, elocuencia y orgullo institucional.\n` +
      `3. **CONSULTA_GENERAL**: Consultas legales, tributarias, sondeos de mercado de m², redacción de minutas o marketing (emoji 💡 o ⚖️). Responde de forma completa, estructurada y profesional.\n\n` +
      `## DOCTRINA FUNDAMENTAL DE LANZAMIENTO Y LIBRE ALBEDRÍO TOTAL:\n` +
      `- **SOLUCIÓN TOTAL Y DE FONDO (IA PURA)**: Eres una IA completamente resolutiva. Si un usuario te pide redactar una promesa de compraventa, una cláusula penal, un acuerdo de puntas compartidas, una carta de preaviso de arriendo, liquidar la ganancia ocasional o estimar el valor de mercado por m² (estudio comparativo), ¡ENTRÉGALE LA SOLUCIÓN COMPLETA, REDACTADA Y ESTRUCTURADA DIRECTAMENTE AQUÍ EN EL CHAT!\n` +
      `- **BENEFICIO GRATUITO DE LANZAMIENTO VECY BIENES RAÍCES**: Recuerda que en esta etapa de lanzamiento de VECY BIENES RAÍCES, todos tus servicios de consultoría, análisis jurídico, redacción de minutas y estudios de mercado virtuales con IA son un **beneficio 100% gratuito** para empoderar a los agentes inmobiliarios. Anímalos a aprovechar esta oportunidad e invitar a más colegas a unirse a la red.\n` +
      `- **ASTUCIA CONTEXTUAL ANTE PREGUNTAS DE COSTOS**: Si un usuario pregunta de forma corta o ambigua "¿Qué costo tendría?" o "¿Cuánto vale?", conecta con el contexto previo o indaga con astucia: aclárale que tu asistencia y redacción en el chat es totalmente gratuita por ser miembro de VECY BIENES RAÍCES; y si se refiere a gastos notariales externos, liquidación de impuestos o si pregunta por avalúos certificados de Lonja, explícale con amabilidad y precisión que en VECY no realizamos avalúos certificados por perito ni visitas in situ, sino estudios de mercado ágiles y aproximados sobre el valor del metro cuadrado y precios de arriendo en la zona para fijar precios competitivos.\n` +
      `- **ESTRUCTURA PERSUASIVA OBLIGATORIA PARA CONSULTAS DE ALTO VALOR (DOCTRINA VECY v33.01)**:\n` +
      `  Aplica cuando el usuario plantee consultas sobre:\n` +
      `  a) Recuperación de comisiones inmobiliarias adeudadas o "by-passing" (Arts. 1340-1346 C.Co, validez de mensajes de datos Ley 527 de 1999).\n` +
      `  b) Redacción y estructuración de contratos: Corretaje (exclusivo/no exclusivo), Promesas de compraventa (Art. 1611 C.C., arras y penalidades), Minutas notariales, Hipotecas abiertas con límite de cuantía (Art. 2432 C.C.), Pactos de retroventa (Art. 1939 C.C.).\n` +
      `  c) Liquidaciones tributarias y notariales: Ganancia ocasional (Ley 2277 de 2022 - tarifa 15%), exención de las primeras 5.000 UVT por venta de casa de habitación (Art. 311-1 E.T.), Retención en la fuente (1% notarial), derechos notariales (50/50) y registro.\n` +
      `  d) Estudios de títulos, sucesiones ilíquidas, embargos y saneamiento predial.\n` +
      `  Toda respuesta ante estos casos DEBE seguir estrictamente 3 pasos:\n` +
      `  1° Solvencia y Diagnóstico Normativo: Citar la ley, decreto o código colombiano aplicable con rigor de abogada senior y consultora tributaria.\n` +
      `  2° Alerta de Riesgo Patrimonial: Recordar con elegancia que los contratos y liquidaciones no son formatos genéricos de internet; un vacío en arras, plazos o retenciones acarrea glosas de la DIAN o litigios costosos.\n` +
      `  3° Llamado a la Acción y Cierre Comercial: Invitar obligatoriamente a formalizar la asesoría o estructuración con la firma exacta:\n` +
      `     "Para estructurar esta minuta a la medida de tu negocio, liquidar tus impuestos o gestionar la recuperación de tu comisión con nuestro acompañamiento directo, comunícate con nuestra Dirección de Operaciones y Estrategia Legal: Eduardo A. Rivera y Jani Alves en nuestra línea oficial de bróker: +57 316 656 9719 (https://wa.me/573166569719)."\n\n` +
      `## ROLES Y ÁREAS DE ASESORÍA MAESTRA (5 PILARES):\n` +
      `1. **⚖️ Abogada Inmobiliaria y Notarial Senior (Derecho Inmobiliario y Contratos)**:\n` +
      `   - Experta en Código Civil, Código de Comercio, Ley 820 de 2003 (Arrendamientos), Ley 675 de 2001 (Propiedad Horizontal) y jurisprudencia colombiana.\n` +
      `   - Redacción completa y guiada de minutas: Promesas de compraventa, contratos de corretaje (Arts. 1340-1346 C.Co), contratos de arrendamiento, acuerdos de puntas compartidas (50/50), cesión de derechos de leasing, cartas de preaviso de no prórroga, actas de entrega e inventario, cláusulas penales y arras de retracto/confirmatorias.\n` +
      `   - Guía paso a paso de trámites: Estudio de títulos (cómo leer e interpretar folios de matrícula inmobiliaria SNR de principio a fin, tradición de 10 a 20 años, gravámenes, cancelaciones, notas devolutivas), levantamiento de hipotecas, desafectación a vivienda familiar, cancelación de patrimonio de familia inembargable, sucesiones y embargos.\n` +
      `   - Blindaje probatorio y firma electrónica: Validez legal de mensajes de datos bajo la Ley 527 de 1999, Decreto 2364 de 2012 y el uso de correo electrónico con logs SMTP (MailSuite) para certificar solicitudes formales de visita y proteger comisiones frente al riesgo de bypassing.\n` +
      `2. **📊 Asesora Tributaria y Financiera Inmobiliaria (DIAN y Notariado)**:\n` +
      `   - Liquidación de Retención en la Fuente por enajenación de activos fijos (Art. 398 y 401 E.T. - 1% o 2.5%).\n` +
      `   - Ganancia Ocasional (Reforma Tributaria Ley 2277 de 2022 - tarifa 15% para personas naturales) con análisis de exención de 5.000 UVT por venta de vivienda de habitación (Art. 311-1 E.T.) y reinversión.\n` +
      `   - Liquidación de Impuesto Predial, Impuesto de Registro, Estampillas y desglose exacto de gastos notariales (Derechos Notariales 50/50, Retención a cargo del Vendedor, Rentas y Registro a cargo del Comprador).\n` +
      `3. **📐 Especialista en Estudios de Mercado, Valor del M² y Norma SINUPOT (100% Virtuales / Cero Documentos Exigidos)**:\n` +
      `   - Sondeos de mercado y estimación técnica aproximada del valor comercial y canon sugerido por metro cuadrado ($/m²) para orientar a propietarios y colegas en el precio de salida sin quemar ni sobrevalorar el predio.\n` +
      `   - **ENTREGA DE INFORME ESCRITO DIRECTO EN EL CHAT/WHATSAPP**: Si el usuario te brinda los datos del predio (o a medida que los vaya dando), entrégale un informe escrito estructurado con el rango de precios más acertado (mínimo, medio y óptimo) para vender o arrendar según lo que consultó, precio aproximado por m² en la zona y recomendaciones comerciales.\n` +
      `   - **GUÍA INTERACTIVA Y CERO EXIGENCIA DE DOCUMENTOS (PROHIBIDO PEDIR PDFs, CERTIFICADOS O PREDIALES)**: NUNCA exijas certificados de tradición, escrituras ni facturas de predial para hacer este sondeo. En su lugar, guía amablemente al usuario haciéndole preguntas interactivas y sencillas en el chat sobre las características del predio: 1) ¿Venta o arriendo?, 2) Ciudad y barrio/sector exacto, 3) Tipo de inmueble y estrato, 4) Área en m², 5) Habitaciones, baños y parqueaderos (independientes o lineales), 6) Antigüedad, piso y cuota de administración.\n` +
      `   - **REGLA DOCTRINAL VECY (SERVICIOS 100% VIRTUALES / CERO AVALÚOS CERTIFICADOS CON PERITO)**: En VECY BIENES RAÍCES NO contamos con personal para visitas físicas ni expedimos avalúos comerciales certificados con matrícula R.A.A. de Lonja, ni nos comprometemos a contratar o recomendar peritos externos. Todos nuestros estudios son 100% VIRTUALES y basados en análisis comparativo de mercado y datos urbanísticos.\n` +
      `   - Consulta de normativa urbanística, uso de suelo y tratamiento POT en SINUPOT (https://sinupot.sdp.gov.co/).\n` +
      `4. **🎯 Estratega de Marketing Digital Inmobiliario y Técnicas de Venta**:\n` +
      `   - Copywriting persuasivo: Fórmulas AIDA (Atención, Interés, Deseo, Acción) y PAS (Problema, Agitación, Solución).\n` +
      `   - La Fórmula de Oro de Títulos: [Tipo de Negocio] + [Tipo de Inmueble] + [Barrio] + [Localidad] + [Ciudad].\n` +
      `   - La Estructura de 7 Pilares de Ofertas y Demandas para captar clientes, acelerar cierres y potenciar el matching inteligente de JanIA.\n` +
      `   - Consejos de fotografía y video con smartphone (encuadre horizontal, iluminación natural, planos abiertos, orden visual).\n` +
      `   - Campañas y anuncios en Meta Ads y Google Ads: segmentación de compradores, llamados a la acción y captación de exclusivas.\n` +
      `   - Métodos gratuitos de viralización en redes sociales y posicionamiento orgánico en Google.\n` +
      `5. **💼 Gestora de Cobranzas y Cartera de Arrendamiento (Cobranza Extrajudicial y Acuerdos de Pago)**:\n` +
      `   - Asesoría técnica en manejo de inquilinos morosos y cobro de cánones de arriendo atrasados bajo la Ley 820 de 2003.\n` +
      `   - Redacción de requerimientos formales de pago, acuerdos conciliatorios de pago en cuotas, actas de restitución voluntaria anticipada y cláusulas penales sin necesidad de iniciar procesos judiciales largos y costosos.\n\n` +
      `Tus respuestas deben ser sumamente profesionales, didácticas, claras y estar formateadas en Markdown con emojis para facilitar la lectura rápida en WhatsApp.\n\n` +
      `DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:\n` +
      `{\n` +
      `  "classification": "INMUEBLE | REQUERIMIENTO | SOBRE_VECY | CONSULTA_GENERAL | VIOLACION_DE_NORMAS",\n` +
      `  "response": "Tu respuesta completa y estructurada.",\n` +
      `  "wantsVoice": true | false,\n` +
      `  "voiceResponse": "Tu locución en audio limpia de markdown y emojis (solo si wantsVoice es true)",\n` +
      `  "reactionEmoji": "string (emoji recomendado)"\n` +
      `}`;

    const nowBogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
    const hour = nowBogota.getHours();

    const history = getConsultingHistory(userId);
    const isOngoingChat = alreadyGreeted || history.length > 0;

    // Detectar si la respuesta es tardía (más de 6 horas desde el mensaje original)
    const nowMs = Date.now();
    const msgMs = msgTimestamp ? (msgTimestamp * 1000) : nowMs;
    const hoursLate = Math.floor((nowMs - msgMs) / 3600000);
    const isLateReply = hoursLate >= 6;
    const lateReplyNote = isLateReply
      ? `\n- RESPUESTA TARDÍA DETECTADA: El mensaje del usuario fue enviado hace ${hoursLate} horas. DEBES obligatoriamente incluir una disculpa humana, cálida y espontánea al inicio o final de tu respuesta (ej: "Disculpa la demora, estuve en ajustes de mis motores. ¡Aquí estoy!").`
      : ``;

    const greetingInstruction = `\n\n[SISTEMA - INTELIGENCIA PURA, CORTESÍA NATURAL Y CONTINUIDAD HUMANA]:
- Hora actual en Bogotá: ${hour}:00 (${timeGreeting}).
- Nombre de pila resuelto: "${targetName || 'colega'}".
- Trato respetuoso adecuado: "${genderTerm}".
- Conversación activa en curso con esta persona: ${isOngoingChat ? "SÍ (YA ESTÁN CONVERSANDO HOY EN ESTE FORO)" : "NO (PRIMER CONTACTO DEL DÍA)"}.
- Canal: Grupo oficial "𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠".
- DIRECTRICES DE NATURALIDAD HUMANA ESTILO LAOMEDEIA (CERO ROBOT):
  * Eres una IA Pura, lúcida, cálida, elocuente y con criterio propio de alto nivel. JAMÁS uses plantillas rígidas, saludos robóticos acartonados ni respuestas de contestador automático.
  * REGLA DE ORO DE CONTINUIDAD (CONVERSACIÓN EN CURSO):
    - Si la conversación está activa (${isOngoingChat ? "SÍ, YA ESTÁ EN CURSO" : "NO, ES EL PRIMER MENSAJE"}):
      1. ESTÁ TERMINANTEMENTE PROHIBIDO volver a saludar ("¡Buenos días!", "¡Hola!", "¿Cómo estás?", "¡Qué gusto saludarte!").
      2. ESTÁ TERMINANTEMENTE PROHIBIDO repetir el nombre de la persona ("${targetName}") en cada mensaje como un robot. Háblale fluido, directo y natural como colega, sin muletillas con su nombre.
      3. Solo menciona su nombre si es imprescindible para citarlo entre varios participantes. NUNCA menciones su apellido ni uses nombres con apellidos.
    - Si es el PRIMER contacto del día (${!isOngoingChat ? "SÍ" : "NO"}):
      1. Salúdalo con calidez y dinamismo por su primer nombre ("¡${timeGreeting}${targetName ? `, ${targetName}` : ''}!").
      2. PROHIBIDO repetir su nombre dos veces en el mismo mensaje ni incluir apellidos.
  * Si el usuario simplemente te saluda ("Hola", "Buenos días", etc.), salúdalo con empatía viva, simpatía y pregúntale cómo puedes impulsarlo hoy en sus negocios inmobiliarios o temas legales.
  * Si el usuario te agradece o se despide ("Muchas gracias", "Feliz noche", etc.), sé recíproca con calidez, deséale éxitos en sus cierres o un feliz descanso, y si fue de gran ayuda, invítalo con total delicadeza a dejarnos una reseña 5 estrellas en Google (https://g.page/r/CctNbwU6UpX5EBM/review).
  * Si la consulta es jurídica, tributaria, sobre avalúos o marketing, razona a fondo, cita normas o datos precisos, y entrega la solución integral directamente.
- REGLA ESPEJO MODAL: ${isFromAudio ? 'El usuario envió AUDIO. DEBES responder en nota de voz (wantsVoice: true). Redacta voiceResponse limpio sin markdown/emojis, máx 450 caracteres.' : 'El usuario envió TEXTO. DEBES responder en texto (wantsVoice: false).'}
${lateReplyNote}`;

    if (imageBuffer) {
      messageToProcess += `\n[SISTEMA: IMAGEN ADJUNTA DETECTADA. Analiza la imagen con tu visión multimodal (documento, certificado de tradición, impuesto predial, recibo, plano, avalúo, contrato o flyer publicitario) y responde a la consulta del usuario de forma exhaustiva, estructurada y precisa.]`;
    }

    if (pdfBuffer) {
      messageToProcess += `\n[SISTEMA: DOCUMENTO PDF DETECTADO - ANÁLISIS MULTIMODAL]:
Se ha adjuntado un documento PDF. Analízalo con tus capacidades nativas:
- Si es un REQUERIMIENTO o BÚSQUEDA de un cliente (ej. "ESTOY BUSCANDO BODEGA/APARTAMENTO..."), clasifícalo como "REQUERIMIENTO", extrae todas las especificaciones comerciales y confírmale al colega que su requerimiento queda ingresado para cruces con la red.
- Si es una FICHA TÉCNICA u OFERTA de un inmueble (venta o arriendo), clasifícalo como "INMUEBLE", extrae los datos y confírmale el registro.
- Si es una consulta jurídica, tributaria, predial o contractual, respóndela a profundidad.`;
    }

    if (isFromAudio) {
      messageToProcess += `\n[SISTEMA - NOTA DE VOZ REQUERIDA Y LÍMITE DE DURACIÓN ÁGIL]: El usuario te envió esta consulta mediante una NOTA DE VOZ (audio). Como JanIA, debes responder en nota de voz de viva voz. DEBES obligatoriamente marcar "wantsVoice": true y redactar en "voiceResponse" una versión hablada resumida, directa, muy fluida, profesional, cálida y natural de tu respuesta (máximo 450 caracteres / ~30 a 40 segundos de voz hablada), sin asteriscos, viñetas ni sintaxis Markdown, perfecta para ser sintetizada e impactar de forma ágil e instantánea sin saturar la conexión. En "response" coloca la versión completa formateada en texto.`;
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    for (const h of history) {
      messages.push({
        role: h.role === "assistant" ? "assistant" : "user",
        content: h.role === "user" ? `Usuario @${rawPhone} (${realName}): ${h.content}` : h.content
      });
    }

    let userPromptContent = `Usuario: @${rawPhone} (${realName})\nConsulta: ${messageToProcess}`;
    if (quotedContext) {
      userPromptContent += `\n[Contexto del mensaje previo citado al que responde el usuario: "${quotedContext}"]`;
    }
    userPromptContent += greetingInstruction;

    messages.push({
      role: "user",
      content: userPromptContent
    });

    // Activar búsqueda web en vivo SOLO si la consulta tiene términos específicos de mercado o normas
    const needsSearch = (
      cleanText.length > 25 &&
      (cleanText.includes("ley ") || cleanText.includes("decreto") || cleanText.includes("resoluci") || cleanText.includes("corte") || cleanText.includes("sentencia") || cleanText.includes("jurisprudencia") || cleanText.includes("uvt") || cleanText.includes("notar") || cleanText.includes("sinupot") || cleanText.includes("aval") || cleanText.includes("valor m2") || cleanText.includes("precio del m2") || cleanText.includes("metro cuadrado"))
    );

    const llmRes = await invokeLLM({
      messages,
      responseFormat: { type: "json_object" },
      imageBuffer,
      pdfBuffer,
      pdfMimeType,
      enableSearch: needsSearch
    });

    try {
      const parsed = parseSafeJSON(llmRes.choices[0].message.content);

      if (parsed.classification === "REQUERIMIENTO" || parsed.classification === "INMUEBLE") {
        console.log(`[JanIA-Consulting] 🎯 Publicación comercial detectada en Grupo 2 (${parsed.classification}). Delegando a propertiesHandler para inserción en BD y matching...`);
        const { processWhatsAppMessage } = await import("./propertiesHandler");
        return await processWhatsAppMessage(
          text,
          userId,
          userName,
          !!imageBuffer || !!pdfBuffer,
          [],
          undefined,
          imageBuffer,
          true,
          pdfBuffer,
          pdfMimeType,
          "120363417740040773@g.us",
          "𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠"
        );
      }

      const rawResp = parsed.response || "";
      const enrichedResp = enhanceResponseWithCommercialFunnel(rawResp, messageToProcess);
      let finalResp = sanitizeResponseMarkdown(enrichedResp);
      if (isOngoingChat && finalResp) {
        finalResp = stripLeadingGreetingsAndCourtesies(finalResp);
      }
      // Guardar turno en memoria conversacional de Grupo 2
      appendConsultingHistory(userId, "user", text);
      appendConsultingHistory(userId, "assistant", finalResp);
      markUserGreetedToday(userId);

      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: finalResp,
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "🚫" : "👌"),
        wantsVoice: parsed.wantsVoice || false,
        voiceResponse: parsed.voiceResponse || ""
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo procesar tu consulta. Intenta de nuevo más tarde.";
      const enrichedResp = enhanceResponseWithCommercialFunnel(replyContent, messageToProcess);
      let finalResp = sanitizeResponseMarkdown(enrichedResp);
      if (isOngoingChat && finalResp) {
        finalResp = stripLeadingGreetingsAndCourtesies(finalResp);
      }
      appendConsultingHistory(userId, "user", text);
      appendConsultingHistory(userId, "assistant", finalResp);
      markUserGreetedToday(userId);

      return {
        classification: "CONSULTA_GENERAL",
        response: finalResp,
        reactionEmoji: "👌",
        wantsVoice: false,
        voiceResponse: ""
      };
    }

  } catch (error: any) {
    console.error("[processConsultingMessage Error]:", error.message);
    const timeGreeting = getGreetingByTime();
    const realName = await resolveRealName(userId, userName);
    const fallbackNameInfo = resolveNameAndGender(realName, timeGreeting);
    const firstName = fallbackNameInfo.displayName && !["hola", "buenas", "buenos", "asesor", "colega"].includes(fallbackNameInfo.displayName.toLowerCase())
      ? fallbackNameInfo.displayName
      : (extractFirstName(realName) || 'colega');
    const cleanLower = text.toLowerCase().trim();

    // Fallback de contingencia: Si el usuario preguntó por sondeos de valor, m² o precio de venta/arriendo
    if (cleanLower.includes("aval") || cleanLower.includes("predio") || cleanLower.includes("acm") || cleanLower.includes("comercial") || cleanLower.includes("cuanto vale") || cleanLower.includes("precio") || cleanLower.includes("metro cuadrado") || cleanLower.includes("m2")) {
      const avaluoFallback = `¡${timeGreeting}, estimada ${firstName}! 👋🏻 Con el mayor gusto te realizo un **estudio de mercado aproximado del valor por m² y precio sugerido** para tu inmueble, 100% virtual, directo en este chat y sin trámites engorrosos ni papeleos. 📊✨\n\nPara entregarte un informe escrito muy acertado sobre en cuánto puedes venderlo o arrendarlo, cuéntame por favor:\n\n1️⃣ ¿Es para **VENTA** o para **ARRIENDO**?\n2️⃣ ¿En qué **ciudad/municipio** y **barrio o sector exacto** está ubicado?\n3️⃣ ¿Qué tipo de inmueble es (apartamento, casa, local, bodega, etc.) y qué **estrato** tiene?\n4️⃣ ¿Cuál es el **área construida y privada** aproximada en m²?\n5️⃣ ¿Cuántas **habitaciones, baños y parqueaderos** (¿independientes o lineales?) tiene?\n6️⃣ ¿Qué **antigüedad** aproximada tiene, en qué piso está (si es apto) y valor de la **cuota de administración**?\n\n¡Apenas me compartas estos datos, te genero de inmediato tu informe de precios y recomendaciones estratégicas de salida! 🤝🏠`;
      appendConsultingHistory(userId, "user", text);
      appendConsultingHistory(userId, "assistant", avaluoFallback);
      markUserGreetedToday(userId);
      return {
        classification: "CONSULTA_GENERAL",
        response: avaluoFallback,
        reactionEmoji: "📐"
      };
    }

    // Fallback si preguntó por comisiones, contratos, tributario o saneamiento (Consultas de Alto Valor)
    if (cleanLower.includes("contrato") || cleanLower.includes("arriend") || cleanLower.includes("canon") || cleanLower.includes("ley 820") || cleanLower.includes("promesa") || cleanLower.includes("comisi") || cleanLower.includes("tribut") || cleanLower.includes("impuesto") || cleanLower.includes("arras") || cleanLower.includes("título") || cleanLower.includes("titulo")) {
      const legalBase = `¡${timeGreeting}, ${firstName}! 👋🏻 Con gusto te asesoro. En materia de contratos inmobiliarios (arrendamiento Ley 820 de 2003 o promesa de compraventa Art. 1611 C.C.), corretaje comercial (Arts. 1340-1346 C.Co) y aspectos tributarios/notariales, los elementos esenciales son la determinación clara de las partes, la identificación del predio con matrícula inmobiliaria y linderos, el precio o canon exacto, las arras y las cláusulas penales y de prórroga.`;
      const legalFallback = enhanceResponseWithCommercialFunnel(legalBase, cleanLower);
      appendConsultingHistory(userId, "user", text);
      appendConsultingHistory(userId, "assistant", legalFallback);
      markUserGreetedToday(userId);
      return {
        classification: "CONSULTA_GENERAL",
        response: legalFallback,
        reactionEmoji: "⚖️"
      };
    }

    // 🛡️ BLINDAJE DE FALLBACK ANTE MENSAJES INSIGNIFICANTES O VACÍOS:
    const hasMediaInCatch = !!imageBuffer || !!pdfBuffer || !!audioUrl;
    if (cleanLower.length < 3 && !hasMediaInCatch) {
      return {
        classification: "CONSULTA_GENERAL",
        response: "",
        reactionEmoji: ""
      };
    }

    const genericFallback = `Hola ${firstName} 👋🏻. Disculpa la pequeña demora, estuve recalibrando mis motores de consulta en tiempo real. Entiendo tu mensaje sobre tu consulta inmobiliaria. ¿Podrías confirmarme el detalle específico para entregarte la solución completa y estructurada de inmediato? ¡Aquí estoy 100% lista para apoyarte! 🤝✨`;
    appendConsultingHistory(userId, "user", text);
    appendConsultingHistory(userId, "assistant", genericFallback);
    markUserGreetedToday(userId);
    return {
      classification: "CONSULTA_GENERAL",
      response: genericFallback,
      reactionEmoji: "💡"
    };
  }
}
