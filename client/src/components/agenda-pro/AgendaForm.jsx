import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { supabase } from '../../lib/supabase';
import FormInput from './FormInput';
// Lazy load del componente de firma para no cargar la librería 'signature_pad' al inicio
const SignaturePadComponent = React.lazy(() => import('./SignaturePad'));


import CustomDateTimePicker from './CustomDateTimePicker';
import CustomSelect from './CustomSelect';
import AuthModal from './AuthModal';
import { validateForm } from './validations';
import { fetchProfile, updateProfile, submitSolicitud } from '../../services/apiService';

const logoUrl = '/logo-vecy.png';

function Spinner() {
  return (<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-volcanic-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
}

function AuthorizationCheckbox({ formData, handleChange, isAgentView, error }) {
  const legendText = isAgentView ? '5. Autorización Final' : '4. Autorización';
  const legendClasses = `text-xl font-semibold px-2 -ml-2 section-legend-gold transition-colors duration-300 ${error ? '!text-red-400' : ''}`;
  const labelClasses = `ml-3 block text-sm transition-colors duration-300 ${error ? 'text-red-400' : 'text-off-white/80'}`;
  const fieldsetClasses = `border-t-2 pt-6 transition-colors duration-300 ${error ? 'border-red-500' : 'border-soft-gold'}`;
  const checkboxClasses = `h-4 w-4 mt-1 bg-white accent-esmeralda focus:ring-soft-gold rounded transition-colors duration-300 ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-off-white/50'}`;

  return (
    <fieldset className={fieldsetClasses}>
      <legend className={legendClasses}>{legendText}</legend>
      <div className="mt-6 flex items-start"><input id="autorizacion" name="autorizacion" type="checkbox" required checked={formData.autorizacion} onChange={handleChange} className={checkboxClasses} />
        <label htmlFor="autorizacion" className={labelClasses}>
          He leído y acepto la <Link to="/terminos-y-condiciones" target="_blank" rel="noopener noreferrer" className="font-semibold text-soft-gold hover:underline">cláusula de confidencialidad y veracidad de datos</Link>.
          <span className="block mt-2">
            Yo, <span className="font-bold">{formData.solicitante_nombre || "{nombre}"}</span>, con número <span className="font-bold">{formData.solicitante_numero_documento || "{numeroDeDocumento}"}</span>, al enviar este formulario, confirmo bajo la gravedad de juramento que todos los datos proporcionados son precisos y verídicos. Autorizo a Vecy Bienes Raíces para que esta información sea utilizada de acuerdo con sus políticas para los fines establecidos en este formulario.
          </span>
        </label>
      </div>
    </fieldset>
  );
}

function AgendaForm({ propertyName, propertyCode, isLocked, onSuccess }) {
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [consentGiven, setConsentGiven] = useState(false);
  const [session, setSession] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const normalizeCelular = (raw) => {
    if (!raw) return '+57';
    const digits = raw.replace(/\D/g, '');
    // Si ya tiene el 57 delante (57XXXXXXXXXX)
    if (digits.startsWith('57') && digits.length === 12) return `+${digits}`;
    // Si son 10 dígitos directos (3XXXXXXXXX)
    if (digits.length === 10 && digits.startsWith('3')) return `+57${digits}`;
    // Fallback: agregar prefijo con lo que haya
    return `+57${digits}`;
  };

  const loadProfile = async (currentSession) => {
    const { data } = await fetchProfile(currentSession);
    if (data) {
      setFormData(prev => ({
        ...prev,
        solicitante_email: currentSession.user.email || prev.solicitante_email,
        solicitante_nombre: data.full_name || prev.solicitante_nombre,
        solicitante_celular: normalizeCelular(data.celular || prev.solicitante_celular),
        solicitante_tipo_documento: data.tipo_documento || prev.solicitante_tipo_documento,
        solicitante_numero_documento: data.numero_documento || prev.solicitante_numero_documento,
        solicitante_perfil: data.perfil || prev.solicitante_perfil,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        solicitante_email: currentSession.user.email || prev.solicitante_email,
        solicitante_nombre: (currentSession.user.user_metadata?.full_name) || prev.solicitante_nombre,
      }));
    }
  };

  // Efecto para verificar sesión y cargar datos del perfil
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      // Restaurar URL del inmueble guardada antes del OAuth (Google/Facebook)
      if (_event === 'SIGNED_IN') {
        const returnUrl = localStorage.getItem('vecy_agenda_return_url');
        if (returnUrl && returnUrl !== window.location.href) {
          localStorage.removeItem('vecy_agenda_return_url');
          window.location.href = returnUrl;
          return; // el redirect se encarga del resto
        }
      }

      if (session) loadProfile(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  // --- Leer params de URL con hook REACTIVO de Wouter ---
  // URL params tienen PRIORIDAD sobre props (el enlace compartido manda)
  const search = useSearch();
  const _sp = new URLSearchParams(search);
  const urlInmueble = _sp.get('nombre') || propertyName || '';
  const urlCodigo   = _sp.get('codigo') || propertyCode || '';
  // Bloquear si viene cualquier dato (props O URL)
  const isLockedByUrl = isLocked || !!urlInmueble || !!urlCodigo;



  const [formData, setFormData] = useState(() => {
    // Lazy initializer: captura props + URL al montar
    const sp = new URLSearchParams(window.location.search);
    return {
      solicitante_nombre: '', solicitante_tipo_persona: 'Persona Natural', solicitante_perfil: '',
      solicitante_email: '', solicitante_celular: '',
      solicitante_tipo_documento: '', solicitante_numero_documento: '', solicitante_representante_legal: '',
      servicio_solicitado: '', opcion_negocio: '',
      nombre_inmueble: sp.get('nombre') || propertyName || '',
      codigo_inmueble: sp.get('codigo') || propertyCode || '',
      fecha_cita_bogota: null, cantidad_personas: '',
      acompanantes: [],
      tipo_cliente: 'Persona', interesado_nombre: '', interesado_tipo_documento: '', interesado_documento: '',
      firma_virtual_base64: '', autorizacion: false, metodoFirma: '', firma_digital_archivo: null,
    };
  });

  // Si las props o la URL cambian, sincronizar el estado del formulario inmediatamente
  useEffect(() => {
    const sp2 = new URLSearchParams(window.location.search);
    const fromUrl_nombre = sp2.get('nombre');
    const fromUrl_codigo = sp2.get('codigo');
    
    if (fromUrl_nombre || fromUrl_codigo || propertyName || propertyCode) {
      setFormData(prev => ({
        ...prev,
        nombre_inmueble: fromUrl_nombre || propertyName || prev.nombre_inmueble,
        codigo_inmueble: fromUrl_codigo || propertyCode || prev.codigo_inmueble,
      }));
    }
  }, [propertyName, propertyCode, window.location.search]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      // Al subir un archivo, se guarda su representación Base64 y el objeto del archivo.
      setFormData(prev => ({
        ...prev,
        firma_virtual_base64: reader.result,
        firma_digital_archivo: file,
        firma_fechahora_audit: new Date().toISOString() // Captura timestamp de subida
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const rawValue = type === 'checkbox' ? checked : value;
    setFormData(prev => {
      let val = rawValue;
      let newState = { ...prev, [name]: val };

      // Validaciones y formateo en tiempo real
      if (name === 'solicitante_nombre') {
        // Para personas naturales restringimos más, para jurídicas permitimos números/puntos
        if (prev.solicitante_tipo_persona === 'Persona Natural') {
          newState[name] = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        } else {
          newState[name] = val.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.\-&]/g, '');
        }
      }
      // El campo muestra solo los 10 dígitos; al cambiar reconstruimos el valor completo
      else if (name === 'solicitante_celular') {
        const digits = val.replace(/\D/g, '').slice(0, 10);
        newState[name] = `+57${digits}`;
      }
      else if (name === 'solicitante_numero_documento' && prev.solicitante_tipo_documento !== 'Pasaporte' && prev.solicitante_tipo_persona !== 'Persona Jurídica') newState[name] = val.replace(/\D/g, '');
      else if (name === 'interesado_documento' && ((prev.tipo_cliente === 'Persona' && prev.interesado_tipo_documento !== 'Pasaporte') || prev.tipo_cliente === 'Empresa')) newState[name] = val.replace(/\D/g, '');

      // Lógica de limpieza de campos dependientes
      if (name === 'solicitante_tipo_persona') { newState.solicitante_tipo_documento = ''; newState.solicitante_perfil = ''; newState.solicitante_numero_documento = ''; newState.solicitante_representante_legal = ''; }
      if (name === 'tipo_cliente') { newState.interesado_nombre = ''; newState.interesado_tipo_documento = ''; newState.interesado_documento = ''; }
      else if (name === 'solicitante_tipo_documento') newState.solicitante_numero_documento = '';
      else if (name === 'interesado_tipo_documento') newState.interesado_documento = '';
      else if (name === 'metodoFirma') {
        newState.firma_virtual_base64 = '';
        newState.firma_digital_archivo = null;
        newState.firma_fechahora_audit = null; // Reset audit
      }

      // Cuando cambia la cantidad de personas, redimensionar el arreglo de acompañantes
      if (name === 'cantidad_personas') {
        const n = parseInt(val, 10) || 0;
        const companions = n > 1 ? Array.from({ length: n - 1 }, (_, i) => prev.acompanantes[i] || { nombre: '', documento: '' }) : [];
        newState.acompanantes = companions;
      }

      return newState;
    });
  };

  // Handler específico para los campos de acompañantes
  const handleAcompananteChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.acompanantes];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, acompanantes: updated };
    });
  };

  // 2. CORRECCIÓN: Se envuelve la función en `useCallback` para evitar re-renderizados innecesarios.
  const handleDateChange = useCallback((date) => {
    setFormData(prev => ({ ...prev, fecha_cita_bogota: date }));
  }, []); // El array de dependencias está vacío porque `setFormData` es estable y nunca cambia.

  const handleSignatureChange = useCallback((signatureData) => {
    setFormData(prevState => ({
      ...prevState,
      firma_virtual_base64: signatureData,
      firma_digital_archivo: null,
      firma_fechahora_audit: new Date().toISOString() // Captura timestamp de firma
    }));
  }, []);

  const handleConsent = useCallback(() => { setConsentGiven(true); }, []);

  const handleDecline = useCallback(() => {
    navigate('/properties');
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      const fieldErrorFlags = Object.keys(validationErrors).reduce((acc, key) => ({ ...acc, [key]: true }), {});
      setFormErrors(fieldErrorFlags);
      setError(Object.values(validationErrors)[0]);
      return;
    }

    setIsSubmitting(true);

    try {
      // Formatear la fecha y la hora
      let fecha_cita_texto = null;
      let hora_cita = null;

      if (formData.fecha_cita_bogota) {
        const dateObject = new Date(formData.fecha_cita_bogota);
        fecha_cita_texto = new Intl.DateTimeFormat('es-CO', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota'
        }).format(dateObject);
        hora_cita = new Intl.DateTimeFormat('en-US', {
          hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota'
        }).format(dateObject);
      }

      // Preparar el payload limpio
      const payload = {
        ...formData,
        fecha_cita_texto,
        hora_cita,
        cantidad_personas: parseInt(formData.cantidad_personas, 10) || null,
        // Acompañantes como array nativo — columna JSONB en Supabase
        acompanantes: formData.acompanantes.length > 0 ? formData.acompanantes : null,
      };
      delete payload.fecha_cita_bogota;
      delete payload.firma_digital_archivo;
      if (payload.solicitante_celular) payload.solicitante_celular = payload.solicitante_celular.replace('+', '');
      Object.keys(payload).forEach(key => { if (typeof payload[key] === 'string') payload[key] = payload[key].trim(); });

      // La Edge Function genera el ID, inserta en BD y envía notificaciones
      await submitSolicitud(payload, session);

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/properties');
      }

    } catch (error) {
      console.error('Error al enviar la solicitud:', error);
      setError(error.message || 'No se pudo completar la solicitud. Revisa tu conexión o inténtalo más tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPassport = formData.solicitante_tipo_documento === 'Pasaporte';
  const isCompanyDoc = formData.solicitante_tipo_persona === 'Persona Jurídica';
  const isClientPassport = formData.interesado_tipo_documento === 'Pasaporte';
  const showVisitDetails = formData.servicio_solicitado === 'Visitar inmueble';
  const showBusinessOption = formData.servicio_solicitado === 'Visitar inmueble' || formData.servicio_solicitado === 'Avalúo comercial';
  const showAgentSections = formData.solicitante_perfil === 'Agente' || formData.solicitante_perfil === 'Agencia / Inmobiliaria' || formData.solicitante_perfil === 'Bróker / Empresa';
  const tipoPersonaOptions = [{ value: 'Persona Natural', label: 'Persona Natural' }, { value: 'Persona Jurídica', label: 'Persona Jurídica' }];
  
  const perfilOptions = formData.solicitante_tipo_persona === 'Persona Natural'
    ? [{ value: 'Cliente directo', label: 'Cliente directo' }, { value: 'Agente', label: 'Agente independiente' }]
    : [{ value: 'Cliente directo (Empresa)', label: 'Empresa / Cliente directo' }, { value: 'Agencia / Inmobiliaria', label: 'Agencia / Inmobiliaria' }, { value: 'Bróker / Empresa', label: 'Bróker / Empresa' }, { value: 'Constructora', label: 'Constructora' }];
  
  const tipoDocumentoOptions = formData.solicitante_tipo_persona === 'Persona Natural' 
    ? [{ value: 'Cédula de ciudadanía', label: 'Cédula de ciudadanía' }, { value: 'Cédula de extranjería', label: 'Cédula de extranjería' }, { value: 'Pasaporte', label: 'Pasaporte' }] 
    : [{ value: 'NIT', label: 'NIT' }, { value: 'RUT', label: 'RUT' }, { value: 'Registro Mercantil', label: 'Registro Mercantil' }];

  const servicioOptions = [{ value: 'Visitar inmueble', label: 'Visitar inmueble' }, { value: 'Avalúo comercial', label: 'Avalúo comercial' }, { value: 'Préstamo sobre inmueble', label: 'Préstamo sobre inmueble' }, { value: 'Redacción de contrato', label: 'Redacción de contrato' }, { value: 'Marketing Digital con IA', label: 'Marketing Digital con IA' }, { value: 'Curso de IA', label: 'Curso de IA' }];
  const negocioOptions = [{ value: 'Venta', label: 'Venta' }, { value: 'Arriendo', label: 'Arriendo' }];
  const tipoClienteOptions = [{ value: 'Persona', label: 'Persona' }, { value: 'Empresa', label: 'Empresa' }];
  const tipoDocumentoClienteOptions = formData.tipo_cliente === 'Persona' ? [{ value: 'Cédula de ciudadanía', label: 'Cédula de ciudadanía' }, { value: 'Cédula de extranjería', label: 'Cédula de extranjería' }, { value: 'Pasaporte', label: 'Pasaporte' }] : [{ value: 'NIT', label: 'NIT' }, { value: 'RUT', label: 'RUT' }, { value: 'Registro Mercantil', label: 'Registro Mercantil' }];
  const cantidadPersonasOptions = [{ value: '1', label: '1 persona' }, { value: '2', label: '2 personas' }, { value: '3', label: '3 personas' }, { value: '4', label: '4 personas' }, { value: '5', label: '5 personas' }, { value: '6', label: '6 personas' }];
  
  const radioError = !!formErrors.metodoFirma;
  const radioClasses = `mr-2 h-4 w-4 bg-transparent accent-esmeralda focus:ring-soft-gold rounded-full transition-colors duration-300 ${radioError ? 'border-red-500 ring-1 ring-red-500' : 'border-off-white/50'}`;

  return (
    <>
      <form noValidate onSubmit={handleSubmit}>
        <div className="text-center mb-8">
        <img src={logoUrl} alt="Logo oficial de Vecy" className="mx-auto h-20 w-20 mb-4 logo-glow-pulse" />
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-1 block">
          <span className="title-gold-gradient">Verificación de Identidad</span>
        </h2>
        <Link to="/" className="text-soft-gold text-sm hover:underline mt-2 inline-block opacity-70 hover:opacity-100 transition-opacity">← Volver a la portada</Link>
      </div>

      {/* ═══════════════════════════════════════════════════════
          BANNER DEL INMUEBLE — Siempre visible (antes y después del login)
          Aparece cuando el usuario llega desde un enlace de agenda específico
      ════════════════════════════════════════════════════════ */}
      {(urlInmueble || urlCodigo) && (
        <div
          className="mx-auto max-w-2xl mb-8 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(191,149,63,0.06) 100%)',
            border: '1.5px solid rgba(212,175,55,0.45)',
            boxShadow: '0 0 30px rgba(212,175,55,0.12)',
          }}
        >
          {/* Franja superior dorada */}
          <div style={{ background: 'linear-gradient(90deg, #bf953f, #d4af37, #bf953f)', height: '3px' }} />
          <div className="p-5 flex items-center gap-4">
            <div
              className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}
            >
              🏠
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(212,175,55,0.65)' }}>
                Estás agendando visita para:
              </p>
              <p className="font-bold text-lg leading-tight" style={{ color: '#f0f0f0' }}>
                {urlInmueble || '—'}
              </p>
              {urlCodigo && (
                <p className="text-sm mt-0.5" style={{ color: 'rgba(240,240,240,0.5)' }}>
                  Ref: <span className="font-mono font-semibold" style={{ color: '#d4af37' }}>{urlCodigo}</span>
                </p>
              )}
            </div>
            <div className="shrink-0 text-2xl" title="Inmueble confirmado">🔒</div>
          </div>
        </div>
      )}

      {!session ? (
        <div className="text-center mb-8 bg-black/20 p-6 rounded-xl border border-soft-gold/30 backdrop-blur-sm mx-auto max-w-2xl">
          <p className="text-soft-gold font-semibold mb-2 flex items-center justify-center gap-2">
            <span className="text-xl">⚠️</span> Atención
          </p>
          <p className="text-off-white/90 mb-6 text-base leading-relaxed">
            Por motivos de seguridad y para garantizar la veracidad de la información, <strong>es obligatorio iniciar sesión o registrarse</strong> para continuar con el formulario.
          </p>
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="bg-soft-gold hover:bg-gold-bright text-volcanic-black font-bold py-3 px-10 rounded-lg transition-all duration-300 shadow-lg hover:shadow-luminous-gold transform hover:-translate-y-0.5 btn-pulse-gold"
          >
            INICIAR SESIÓN / REGISTRARSE
          </button>
        </div>
      ) : (
        <div className="text-center mb-8">
          <p className="text-off-white mb-2">Hola, <span className="font-bold text-soft-gold">{session.user.user_metadata.full_name || session.user.email}</span></p>
          <button
            type="button"
            onClick={async () => { await supabase.auth.signOut(); setSession(null); setConsentGiven(false); window.location.reload(); }}
            className="text-sm text-off-white/60 hover:text-soft-gold underline transition-colors"
          >
            (Cerrar Sesión / Cambiar cuenta)
          </button>
        </div>
      )}

      {/* Sección de Consentimiento */}
      {!consentGiven && (
        <fieldset
          className={`border-t-2 border-soft-gold pt-6 mb-10 transition-all duration-500 ${!session ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}
        >
          <legend className="text-xl font-semibold section-legend-gold px-2 -ml-2">Consentimiento de Datos</legend>
          <p className="text-off-white/80 mt-2">Para continuar, es necesario tu consentimiento. Al hacer clic en "Sí, autorizo", confirmas que has leído y aceptas nuestra <Link to="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-soft-gold hover:underline">Política de Privacidad</Link> y nuestros <Link to="/terminos-y-condiciones" target="_blank" rel="noopener noreferrer" className="font-semibold text-soft-gold hover:underline">Términos y Condiciones</Link>.</p>
          <div className="mt-6 flex gap-4">
            <button type="button" onClick={handleConsent} disabled={!session} className="bg-esmeralda hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-green-500/50 disabled:cursor-not-allowed">Sí, autorizo</button>
            <button type="button" onClick={handleDecline} disabled={!session} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-red-500/50 disabled:cursor-not-allowed">NO</button>
          </div>
          {!session && <p className="text-soft-gold text-sm mt-4 font-semibold animate-pulse">🔒 Inicia sesión arriba para habilitar esta opción.</p>}
        </fieldset>
      )}
      <div className={`transition-opacity duration-700 ${consentGiven ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden pointer-events-none'}`}>
        {consentGiven && (
          <>
            <fieldset className="border-t-2 border-soft-gold pt-6 mb-10"><legend className="text-xl font-semibold section-legend-gold px-2 -ml-2">1. Tus Datos</legend><div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <FormInput onChange={handleChange} value={formData.solicitante_nombre} label="Nombre Completo o Razón Social" id="solicitante_nombre" name="solicitante_nombre" type="text" placeholder="Ej: Juan Pérez o Constructora XYZ" required error={!!formErrors.solicitante_nombre} />
              <CustomSelect label="Tipo de Persona" name="solicitante_tipo_persona" value={formData.solicitante_tipo_persona} onChange={handleChange} options={tipoPersonaOptions} placeholder="Selecciona..." error={!!formErrors.solicitante_tipo_persona} />
              <CustomSelect label="Perfil" name="solicitante_perfil" value={formData.solicitante_perfil} onChange={handleChange} options={perfilOptions} placeholder="Selecciona tu perfil..." error={!!formErrors.solicitante_perfil} />
              <FormInput onChange={handleChange} value={formData.solicitante_email} label="Correo Electrónico" id="solicitante_email" name="solicitante_email" type="email" placeholder="tucorreo@ejemplo.com" required error={!!formErrors.solicitante_email} />
              <FormInput onChange={handleChange} value={formData.solicitante_celular.replace(/^\+?57/, '').slice(0, 10)} label="Celular" id="solicitante_celular" name="solicitante_celular" type="tel" placeholder="3001234567" required adornment="+57" maxLength="10" pattern="[0-9]*" error={!!formErrors.solicitante_celular} />
              <CustomSelect label="Tipo de Documento" name="solicitante_tipo_documento" value={formData.solicitante_tipo_documento} onChange={handleChange} options={tipoDocumentoOptions} placeholder="Selecciona..." error={!!formErrors.solicitante_tipo_documento} />
              <FormInput 
                onChange={handleChange} 
                value={formData.solicitante_numero_documento} 
                label={isCompanyDoc ? "Número de Identificación (NIT/RUT)" : "Número de Documento"} 
                id="solicitante_numero_documento" 
                name="solicitante_numero_documento" 
                type={isPassport || isCompanyDoc ? "text" : "tel"} 
                pattern={isPassport || isCompanyDoc ? ".*" : "[0-9]*"} 
                placeholder={isCompanyDoc ? "Ej: 900.123.456-7" : "Ej: 1234567890"} 
                required 
                maxLength="20" 
                error={!!formErrors.solicitante_numero_documento} 
              />
              {formData.solicitante_tipo_persona === 'Persona Jurídica' && (
                <FormInput 
                  onChange={handleChange} 
                  value={formData.solicitante_representante_legal} 
                  label="Nombre del Representante Legal" 
                  id="solicitante_representante_legal" 
                  name="solicitante_representante_legal" 
                  type="text" 
                  placeholder="Ej: Juan Pérez" 
                  required 
                  error={!!formErrors.solicitante_representante_legal} 
                />
              )}
            </div></fieldset>
            <fieldset className="border-t-2 border-soft-gold pt-6 mb-10"><legend className="text-xl font-semibold section-legend-gold px-2 -ml-2">2. Detalles de la Solicitud</legend><div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <CustomSelect label="¿Qué servicio necesitas?" name="servicio_solicitado" value={formData.servicio_solicitado} onChange={handleChange} options={servicioOptions} placeholder="Selecciona un servicio..." error={!!formErrors.servicio_solicitado} />
              {showBusinessOption && (<CustomSelect label="Opción de Negocio" name="opcion_negocio" value={formData.opcion_negocio} onChange={handleChange} options={negocioOptions} placeholder="Selecciona..." error={!!formErrors.opcion_negocio} />)}
              {/* Campos de Inmueble — readOnly cuando vienen de Vecy Network (URL o props) */}
              <div className="relative">
                <label className="block text-sm font-semibold mb-1" style={{ color: urlInmueble ? '#d4af37' : 'rgba(240,240,240,0.7)' }}>
                  Nombre del Inmueble o Servicio {urlInmueble && <span className="ml-1">🔒</span>}
                </label>
                <input
                  type="text"
                  id="nombre_inmueble"
                  name="nombre_inmueble"
                  value={formData.nombre_inmueble}
                  onChange={urlInmueble ? undefined : handleChange}
                  readOnly={!!urlInmueble}
                  placeholder="Ej: Apartamento Premium Chapinero"
                  className="w-full px-4 py-3 rounded-lg text-sm transition-all duration-200 outline-none"
                  style={{
                    background: urlInmueble ? 'rgba(212,175,55,0.06)' : 'rgba(0,0,0,0.3)',
                    border: urlInmueble ? '1.5px solid rgba(212,175,55,0.5)' : '1px solid rgba(240,240,240,0.15)',
                    color: '#f0f0f0',
                    cursor: urlInmueble ? 'not-allowed' : 'text',
                  }}
                />
                {!!formErrors.nombre_inmueble && <p className="text-red-400 text-xs mt-1">{formErrors.nombre_inmueble}</p>}
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold mb-1" style={{ color: urlCodigo ? '#d4af37' : 'rgba(240,240,240,0.7)' }}>
                  Código de Identificación {urlCodigo && <span className="ml-1">🔒</span>}
                </label>
                <input
                  type="text"
                  id="codigo_inmueble"
                  name="codigo_inmueble"
                  value={formData.codigo_inmueble}
                  onChange={urlCodigo ? undefined : handleChange}
                  readOnly={!!urlCodigo}
                  placeholder="Ej: ID-BOG-SB01"
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono transition-all duration-200 outline-none"
                  style={{
                    background: urlCodigo ? 'rgba(212,175,55,0.06)' : 'rgba(0,0,0,0.3)',
                    border: urlCodigo ? '1.5px solid rgba(212,175,55,0.5)' : '1px solid rgba(240,240,240,0.15)',
                    color: urlCodigo ? '#d4af37' : '#f0f0f0',
                    cursor: urlCodigo ? 'not-allowed' : 'text',
                  }}
                />
                {!!formErrors.codigo_inmueble && <p className="text-red-400 text-xs mt-1">{formErrors.codigo_inmueble}</p>}
              </div>

            </div>
              {showVisitDetails && (
                <div className="transition-all duration-500 ease-in-out mt-6 flex flex-col gap-6">
                  <CustomDateTimePicker label="Fecha y Hora de la Visita" selected={formData.fecha_cita_bogota} onChange={handleDateChange} error={!!formErrors.fecha_cita_bogota} />
                  <CustomSelect label="¿Cuántas personas ingresarán?" name="cantidad_personas" value={formData.cantidad_personas} onChange={handleChange} options={cantidadPersonasOptions} placeholder="Selecciona una cantidad..." error={!!formErrors.cantidad_personas} />

                  {/* Campos dinámicos de acompañantes */}
                  {formData.acompanantes.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-sm font-semibold section-legend-gold">
                        👥 Datos de acompañantes (requeridos por seguridad)
                      </p>
                      {formData.acompanantes.map((acomp, i) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-soft-gold/20 bg-black/20">
                          <div className="col-span-2">
                            <p className="text-xs font-bold text-soft-gold/70 uppercase tracking-widest mb-3">Acompañante {i + 1}</p>
                          </div>
                          <FormInput
                            label="Nombre Completo"
                            id={`acomp_nombre_${i}`}
                            name={`acomp_nombre_${i}`}
                            type="text"
                            placeholder="Ej: María García"
                            required
                            value={acomp.nombre}
                            onChange={(e) => handleAcompananteChange(i, 'nombre', e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ''))}
                            error={!!formErrors[`acomp_${i}_nombre`]}
                          />
                          <FormInput
                            label="Número de Documento"
                            id={`acomp_doc_${i}`}
                            name={`acomp_doc_${i}`}
                            type="tel"
                            pattern="[0-9]*"
                            placeholder="Ej: 1234567890"
                            required
                            maxLength="15"
                            value={acomp.documento}
                            onChange={(e) => handleAcompananteChange(i, 'documento', e.target.value.replace(/\D/g, ''))}
                            error={!!formErrors[`acomp_${i}_documento`]}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}</fieldset>
            {showAgentSections && (
              <>
                <fieldset className="border-t-2 border-soft-gold pt-6 mb-10">
                  <legend className="text-xl font-semibold section-legend-gold px-2 -ml-2">3. Presenta a tu Cliente</legend>
                  <div className="p-4 bg-black/10 rounded-lg mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CustomSelect label="Tu cliente es:" name="tipo_cliente" value={formData.tipo_cliente} onChange={handleChange} options={tipoClienteOptions} placeholder="Selecciona..." error={!!formErrors.tipo_cliente} />
                    <FormInput value={formData.interesado_nombre} onChange={handleChange} label={formData.tipo_cliente === 'Persona' ? "Nombre completo del cliente" : "Razón Social de la Empresa"} id="interesado_nombre" name="interesado_nombre" type="text" placeholder="Nombre o Razón Social" error={!!formErrors.interesado_nombre} />
                    <CustomSelect label={formData.tipo_cliente === 'Persona' ? "Tipo de documento del cliente" : "Tipo de identidad empresarial"} name="interesado_tipo_documento" value={formData.interesado_tipo_documento} onChange={handleChange} options={tipoDocumentoClienteOptions} placeholder="Selecciona..." error={!!formErrors.interesado_tipo_documento} />
                    <FormInput value={formData.interesado_documento} onChange={handleChange} label={formData.tipo_cliente === 'Persona' ? "Número de documento del cliente" : "Número de NIT/Registro"} id="interesado_documento" name="interesado_documento" type={formData.tipo_cliente === 'Empresa' || (formData.tipo_cliente === 'Persona' && !isClientPassport) ? 'tel' : 'text'} pattern={formData.tipo_cliente === 'Empresa' || (formData.tipo_cliente === 'Persona' && !isClientPassport) ? '[0-9]*' : '.*'} placeholder="Número" maxLength="15" error={!!formErrors.interesado_documento} />
                  </div>
                </fieldset>

                <fieldset className={`border-t-2 pt-6 transition-colors duration-300 ${!!formErrors.metodoFirma || !!formErrors.firma_virtual_base64 || !!formErrors.firma_digital_archivo ? 'border-red-500' : 'border-soft-gold'}`}>
                  <legend className="text-xl font-semibold section-legend-gold px-2 -ml-2">
                    4. Firma del Agente / Intermediario
                  </legend>
                  <div className="mt-4">
                    <label className={`block text-sm font-medium transition-colors duration-300 ${!!formErrors.metodoFirma ? 'text-red-400' : 'text-off-white/80'}`}>
                      {formData.solicitante_tipo_persona === 'Persona Jurídica' ? 'Firma del Representante Legal (Agente):' : 'Elige tu método de firma:'}
                    </label>
                    <div className="mt-2 flex gap-6">
                      <label className={`flex items-center transition-colors duration-300 ${!!formErrors.metodoFirma ? 'text-red-400' : 'text-off-white/80'}`}><input type="radio" name="metodoFirma" value="virtual" checked={formData.metodoFirma === 'virtual'} onChange={handleChange} className={radioClasses} /> Firma Virtual (Dibujar)</label>
                      <label className={`flex items-center transition-colors duration-300 ${!!formErrors.metodoFirma ? 'text-red-400' : 'text-off-white/80'}`}><input type="radio" name="metodoFirma" value="digital" checked={formData.metodoFirma === 'digital'} onChange={handleChange} className={radioClasses} /> Firma Digital (Subir archivo)</label>
                    </div>
                    {formData.metodoFirma === 'virtual' && (
                      <div className="mt-4">
                        <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${!!formErrors.firma_virtual_base64 ? 'text-red-400' : 'text-off-white/80'}`}>
                          Por favor, firma en el siguiente recuadro:
                        </label>
                        <React.Suspense fallback={<div className="h-48 w-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Cargando pad de firma...</div>}>
                          <SignaturePadComponent onSignatureChange={handleSignatureChange} />
                        </React.Suspense>
                      </div>
                    )}
                    {formData.metodoFirma === 'digital' && (
                      <div className="mt-4">
                        <label htmlFor="firma_digital_upload" className={`block text-sm font-medium mb-2 transition-colors duration-300 ${!!formErrors.firma_digital_archivo ? 'text-red-400' : 'text-off-white/80'}`}>
                          Sube el archivo de tu firma (PNG, JPG):
                        </label>
                        <input type="file" id="firma_digital_upload" name="firma_digital_archivo" onChange={handleFileChange} accept=".png,.jpg,.jpeg" className={`w-full text-sm text-off-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-soft-gold/20 file:text-soft-gold hover:file:bg-soft-gold/30 ${!!formErrors.firma_digital_archivo ? 'ring-2 ring-red-500 rounded-lg p-2' : ''}`} />
                      </div>
                    )}
                  </div>
                </fieldset>
              </>
            )}

            <AuthorizationCheckbox formData={formData} handleChange={handleChange} isAgentView={showAgentSections} error={!!formErrors.autorizacion} />
            <div className="mt-8"><button type="submit" disabled={isSubmitting} className="w-full bg-soft-gold hover:bg-gold-bright text-volcanic-black font-bold py-4 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-luminous-gold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed btn-pulse-gold">{isSubmitting ? <Spinner /> : null}{isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}</button></div>
            {error && (<div className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</div>)}
          </>
        )}
      </div>
    </form>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}

export default AgendaForm;