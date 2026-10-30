import { supabase } from '../lib/supabase';

export const fetchProfile = async (session) => {
  try {
    const { user } = session;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return { data, user };
  } catch (error) {
    console.error('Error cargando perfil:', error.message);
    return { data: null, user: session.user };
  }
};

export const updateProfile = async (session, formData) => {
  if (!session?.user) return;

  const updates = {
    id: session.user.id,
    full_name: formData.solicitante_nombre,
    celular: formData.solicitante_celular
      ? formData.solicitante_celular.replace(/^\+?57/, '').slice(0, 10)
      : '',
    tipo_documento: formData.solicitante_tipo_documento,
    numero_documento: formData.solicitante_numero_documento,
    perfil: formData.solicitante_perfil,
    updated_at: new Date(),
  };

  try {
    const { error } = await supabase.from('profiles').upsert(updates);
    if (error) throw error;
  } catch (error) {
    console.error('Error actualizando perfil:', error.message);
  }
};

/**
 * Envía el payload al servidor autoritativo VPS de Vecy Bienes Raíces (a través de /api/submit)
 * para persistencia inmediata en la base de datos de producción y generación oficial del contrato.
 */
export const submitSolicitud = async (payload, session) => {
  if (session) {
    updateProfile(session, payload); // Fire and forget
  }

  // 1. Enviar prioritariamente al backend autoritativo VPS de Vecy Bienes Raíces
  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok && data.success !== false) {
      console.log('✅ Solicitud registrada con éxito en el servidor de Vecy Bienes Raíces:', data);
      return data;
    } else {
      throw new Error(data.error || data.message || 'Error procesando solicitud en el servidor');
    }
  } catch (vpsErr) {
    console.warn('⚠️ Fallo comunicando con el VPS vía /api/submit, recurriendo a Edge Function de respaldo:', vpsErr.message);

    // 2. Respaldo secundario vía Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-confirmation-email', {
      body: payload,
    });

    if (error) {
      console.error('❌ Error crítico al invocar la función de respaldo:', error);
      let detail = error.message;
      if (error.context) {
        try {
          if (typeof error.context.text === 'function') {
            const responseText = await error.context.text();
            try {
              const responseJson = JSON.parse(responseText);
              detail = responseJson.error || responseJson.message || responseText;
            } catch (jsonErr) {
              detail = responseText;
            }
          } else if (error.context.statusText) {
            detail = `${error.context.statusText} (${error.context.status})`;
          }
        } catch (contextErr) {
          console.error('No se pudo extraer el texto del error.context:', contextErr);
        }
      }
      throw new Error(`Error del servidor: ${detail}`);
    }

    console.log('✅ Solicitud procesada mediante función de respaldo.');
    return data;
  }
};
