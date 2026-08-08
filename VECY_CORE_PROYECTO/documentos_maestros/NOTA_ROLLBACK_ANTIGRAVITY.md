# ⚠️ NOTA OFICIAL DE COMPROMISO Y DIRECTIVA DE ROLLBACK PARA ANTIGRAVITY

**DESDE**: Eduardo A. Rivera Martínez / Jani Alves Souza (VECY Network)  
**PARA**: Antigravity (IA Assistant & Agentes de Desarrollo)  
**FECHA**: 4 de Agosto de 2026 - 01:27 AM  

---

## ⛔ NÚMEROS BANEADOS Y OBSOLETOS — PROHIBICIÓN ABSOLUTA
- `+573166569719` (Baneado permanentemente)
- `+573185462265` (Línea obsoleta)
- `+573188096811` (Línea obsoleta)

👉 **LÍNEA OFICIAL Y ÚNICA ACTIVA**: **`+573192919978`**  
Cualquier intento de notificar, enviar DMs o redirigir a un número distinto a `+573192919978` está ESTRICTAMENTE PROHIBIDO.

---

## 🛑 DIRECTIVA DE SEGURIDAD Y REVERSIÓN DE CÓDIGO (ROLLBACK POLICY)

Si durante o después de la implementación de este **Motor de Supremacía de Cotejamiento / Matching para JAnIA** se presenta **CUALQUIERA** de las siguientes situaciones:

1. **Ruptura de Código o Fallo en la Web**:
   - Errores de compilación, fallos en el frontend (`vecy-network`), colapsos en las rutas API o fallos de conexión con Supabase.
2. **Desconexión o Afectación de Baileys / WhatsApp**:
   - Desconexión del servicio de Baileys, pérdida de sesión con la línea oficial **`+573192919978`** o interrupción de la ingesta de mensajes.
3. **Riesgo de Baneo de Meta / WhatsApp**:
   - Envío masivo no deseado, falta de retardos asíncronos o violaciones a las políticas de tasa de refresco que puedan generar un baneo de la línea telefónica.

---

### ⏪ INSTRUCCIÓN DE REVERSIÓN INMEDIATA (GIT ROLLBACK)

Antigravity **DEBERÁ REVERTIR DE INMEDIATO EL PROYECTO (`git reset --hard`)** a los últimos commits estables realizados:

- **Límite Primario**: Commits realizados antes de la **01:00 AM del 4 de Agosto de 2026**.
- **Límite Secundario (Fallback)**: Commits realizados el **3 de Agosto de 2026 a las 00:00 AM**.

---

## 🛡️ PROTOCOLO DE SEGURIDAD PARA BAILEYS & META WHATSAPP

1. **PROHIBIDO** modificar la lógica de autenticación o la carpeta de sesión de Baileys (`auth_info_baileys`).
2. **100% ASÍNCRONO**: Todo intento de reacción, análisis o envío de notificaciones de JAnIA debe ejecutarse en segundo plano con `.catch(() => {})`, garantizando que NUNCA interfiera ni ralentice la ingesta de mensajes ni bloquee el bucle de eventos.
3. **NO SPAM**: Las notificaciones de Match se enviarán de forma centralizada EXCLUSIVAMENTE a la línea oficial **`+573192919978`** para evitar el baneo de cuentas de agentes externos.
