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
 * Envía el payload completo a la Edge Function.
 * La Edge Function genera el ID, inserta el registro y envía notificaciones.
 * El frontend ya NO llama a get_next_solicitud_id ni inserta directamente en la BD.
 */
export const submitSolicitud = async (payload, session) => {
  // Actualizar perfil del usuario autenticado en paralelo (sin bloquear el envío)
  if (session) {
    updateProfile(session, payload); // Fire and forget
  }

    // La Edge Function genera el ID, inserta en BD y envía notificaciones
    const { data, error } = await supabase.functions.invoke('send-confirmation-email', {
      body: payload,
    });

    if (error) {
      console.error('❌ Error detallado de la Edge Function:', error);
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

    console.log('✅ Solicitud procesada exitosamente en el servidor.');
    return data;
};
