import { createRequire } from 'module';

let isPatched = false;

function getLibSignal(): any {
  try {
    const esmRequire = createRequire(import.meta.url);
    try {
      const baileysPath = esmRequire.resolve('@whiskeysockets/baileys');
      const baileysRequire = createRequire(baileysPath);
      return baileysRequire('libsignal');
    } catch {
      return esmRequire('libsignal');
    }
  } catch (err) {
    console.error('[SIGNAL-PATCH] Error resolviendo libsignal:', err);
  }
  return null;
}

/**
 * Aplica parches de alta resiliencia criptográfica a la librería libsignal de Baileys.
 * 
 * Problemas solucionados:
 * 1. "Over 2000 messages into the future!": Ocurre cuando un contacto o dispositivo envía mensajes
 *    y el contador de trinquete (ratchet counter) supera por más de 2000 el estado local.
 *    Se reemplaza la recursión fija de 2000 con un bucle iterativo de alto rendimiento capaz de sincronizar
 *    hasta 500.000 llaves sin desbordar la pila (stack overflow) ni abortar la sesión.
 * 
 * 2. Auto-recuperación de sesiones corruptas: Si una sesión presenta un desfase criptográfico
 *    insalvable (MAC errónea o sesión rota), se purgan las sesiones obsoletas del registro (record)
 *    para permitir que el protocolo Signal renegocie un PreKeyWhisperMessage limpio de inmediato.
 */
export function applySignalPatches() {
  if (isPatched) return;

  const libsignal = getLibSignal();
  if (!libsignal) {
    // En entornos puros de Vite o Vitest unitarios donde no corre Baileys
    return;
  }

  const proto = libsignal.SessionCipher?.prototype;
  if (!proto) {
    console.warn('[SIGNAL-PATCH] ⚠️ libsignal.SessionCipher.prototype no encontrado');
    return;
  }

  isPatched = true;

  const originalFillMessageKeys = proto.fillMessageKeys;
  const originalDecryptWhisperMessage = proto.decryptWhisperMessage;

  // 1. Ampliación del límite de trinquete iterativo
  proto.fillMessageKeys = function (chain: any, counter: number) {
    if (!chain || !chain.chainKey) return;
    if (chain.chainKey.counter >= counter) {
      return;
    }

    const diff = counter - chain.chainKey.counter;
    if (diff > 500000) {
      throw new libsignal.SessionError(`Over 500000 messages into the future! (diff=${diff})`);
    }

    if (diff > 2000) {
      console.log(`[SIGNAL-PATCH] ⚡ Sincronizando de forma segura ${diff} llaves de trinquete para mensaje entrante (counter ${chain.chainKey.counter} -> ${counter})...`);
    }

    while (chain.chainKey.counter < counter) {
      if (chain.chainKey.key === undefined) {
        throw new libsignal.SessionError('Chain closed');
      }
      const key = chain.chainKey.key;
      chain.messageKeys[chain.chainKey.counter + 1] = libsignal.crypto.calculateMAC(key, Buffer.from([1]));
      chain.chainKey.key = libsignal.crypto.calculateMAC(key, Buffer.from([2]));
      chain.chainKey.counter += 1;
    }
  };

  // 2. Auto-reparación y purga de sesiones desfasadas
  proto.decryptWhisperMessage = async function (data: any) {
    try {
      return await originalDecryptWhisperMessage.call(this, data);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isUnrecoverable =
        errMsg.includes('No matching sessions') ||
        errMsg.includes('Over 2000') ||
        errMsg.includes('Over 500000') ||
        errMsg.includes('Bad MAC') ||
        errMsg.includes('Key used already');

      if (isUnrecoverable) {
        const addrStr = this.addr ? this.addr.toString() : 'desconocido';
        console.warn(`[SIGNAL-AUTO-REPAIR] 🛠️ Sesión criptográfica desincronizada para ${addrStr} (${errMsg}). Purgando sesiones corruptas para forzar nuevo handshake PreKey.`);
        try {
          const record = await this.getRecord();
          if (record && typeof record.deleteAllSessions === 'function') {
            record.deleteAllSessions();
            await this.storeRecord(record);
            console.log(`[SIGNAL-AUTO-REPAIR] ✅ Registro purgado exitosamente para ${addrStr}. Próximo mensaje solicitará PreKey limpia.`);
          }
        } catch (repairErr: any) {
          console.error('[SIGNAL-AUTO-REPAIR] Error al purgar registro de sesión:', repairErr?.message || repairErr);
        }
      }
      throw err;
    }
  };

  console.log('[SIGNAL-PATCH] ✅ Parches criptográficos de resiliencia Signal aplicados exitosamente (Ratchet hasta 500k + Auto-Repair).');
}
