import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { supabase } from '../../lib/supabase';
import FormInput from './FormInput';
import { Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

// Lazy load del componente de firma para no cargar la librería 'signature_pad' al inicio
const SignaturePadComponent = React.lazy(() => import('./SignaturePad'));

import CustomDateTimePicker from './CustomDateTimePicker';
import CustomSelect from './CustomSelect';
import AuthModal from './AuthModal';
import { validateForm } from './validations';
import { fetchProfile, updateProfile, submitSolicitud } from '../../services/apiService';

const logoUrl = '/logo-vecy.png';

function Spinner() {
  return (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-volcanic-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
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
      <div className="mt-6 flex items-start">
        <input id="autorizacion" name="autorizacion" type="checkbox" required checked={formData.autorizacion} onChange={handleChange} className={checkboxClasses} />
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

function AgendaForm({ propertyName, propertyCode, isLocked, agentId, customLogo, onSuccess }) {
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [consentGiven, setConsentGiven] = useState(false);
  const [session, setSession] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const verifyIdentityMutation = trpc.agenda.verifyIdentity.useMutation();
  const startVerifyIdentityMutation = trpc.agenda.startVerifyIdentity.useMutation();
  const trpcUtils = trpc.useUtils();
  const createSolicitudMutation = trpc.agenda.create.useMutation();
  const [isValidatingDoc, setIsValidatingDoc] = useState(false);
  const [identityError, setIdentityError] = useState(null);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [identitySuccessMsg, setIdentitySuccessMsg] = useState(null);

  // Estados de verificación para el Cliente Presentado por el Agente
  const [isValidatingClientDoc, setIsValidatingClientDoc] = useState(false);
  const [clientIdentityError, setClientIdentityError] = useState(null);
  const [clientIdentityVerified, setClientIdentityVerified] = useState(false);
  const [clientIdentitySuccessMsg, setClientIdentitySuccessMsg] = useState(null);

  // Estados de verificación para Acompañantes adicionales
  const [validatingAcompIndex, setValidatingAcompIndex] = useState(null);
  const [acompErrors, setAcompErrors] = useState({});
  const [acompVerified, setAcompVerified] = useState({});
  const [acompSuccessMsg, setAcompSuccessMsg] = useState({});

  const securityHint = "Validación de seguridad: Este número se coteja mediante herramientas de alta tecnología para su comprobación y verificación de datos veraces.";

  const handleShare = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    toast.success("¡Enlace de agenda copiado al portapapeles! 🔗");
    setTimeout(() => setCopied(false), 2000);
  };

  const logoToDisplay = customLogo || '/logo-vecy.png';

  const normalizeCelular = (raw) => {
    if (!raw) return '+57';
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('57') && digits.length === 12) return `+${digits}`;
    if (digits.length === 10 && digits.startsWith('3')) return `+57${digits}`;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_IN') {
        const returnUrl = localStorage.getItem('vecy_agenda_return_url');
        if (returnUrl && returnUrl !== window.location.href) {
          localStorage.removeItem('vecy_agenda_return_url');
          window.location.href = returnUrl;
          return;
        }
      }
      if (session) loadProfile(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const search = useSearch();
  const _sp = new URLSearchParams(search);
  const urlInmueble = _sp.get('nombre') || propertyName || '';
  const urlCodigo = _sp.get('codigo') || propertyCode || '';
  const isLockedByUrl = isLocked || !!urlInmueble || !!urlCodigo;

  const [formData, setFormData] = useState(() => {
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
      agent_id: agentId || sp.get('agentId') || null,
    };
  });

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
  }, [propertyName, propertyCode]);

  // Función auxiliar robusta: ejecuta el Job en el servidor y sondea el resultado cada 2.5s
  const runVerificationJob = async (tipoDocumento, cleanDoc, nombreIngresado, setProgressFeedback) => {
    try {
      const initRes = await startVerifyIdentityMutation.mutateAsync({
        tipoDocumento,
        numeroDocumento: cleanDoc,
        nombreIngresado: (nombreIngresado || '').trim(),
      });

      // Si ya estaba en caché o la validación básica falló, retorna de inmediato (0ms)
      if (initRes.status === 'completed') {
        return initRes.result;
      }

      if (initRes.status === 'error') {
        return {
          valid: false,
          match: false,
          error: initRes.error || 'Error al iniciar la verificación de identidad',
        };
      }

      const jobId = initRes.jobId;
      if (setProgressFeedback) {
        setProgressFeedback('⏳ Consultando antecedentes Policía Nacional y resolviendo captcha oficial...');
      }

      // Sondeo reactivo (máximo 70 segundos, cada 2.5s)
      const startTime = Date.now();
      while (Date.now() - startTime < 70000) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        try {
          const check = await trpcUtils.agenda.checkVerifyIdentity.fetch({ jobId }, { staleTime: 0 });
          if (check.status === 'completed') {
            return check.result;
          }
          if (check.status === 'error') {
            return {
              valid: false,
              match: false,
              error: check.error || check.result?.error || 'No se pudo completar la verificación de identidad.',
            };
          }
        } catch (pollErr) {
          console.warn('Sondeo de verificación en curso...', pollErr?.message);
        }
      }

      return {
        valid: false,
        match: false,
        error: 'La verificación ante la Policía Nacional tardó más de lo esperado. Por favor intente nuevamente.',
      };
    } catch (err) {
      console.error('Error en runVerificationJob:', err);
      return {
        valid: false,
        match: false,
        error: 'No se pudo contactar el servicio de verificación. Intente de nuevo.',
      };
    }
  };

  const handleVerifyIdentity = async (nombreIngresado, numeroDocumento, tipoDocumento) => {
    const cleanDoc = (numeroDocumento || '').replace(/[^0-9a-zA-Z]/g, '');
    if (!cleanDoc || cleanDoc.length < 5 || !tipoDocumento) {
      return;
    }

    setIsValidatingDoc(true);
    setIdentityError(null);
    try {
      const data = await runVerificationJob(
        tipoDocumento,
        cleanDoc,
        nombreIngresado,
        (msg) => setIdentitySuccessMsg(msg)
      );

      if (!data || data.valid === false || data.match === false) {
        const errMsg = data?.error || '⚠️ El número de documento no corresponde a los nombres y apellidos indicados. Por motivos de seguridad y veracidad legal, solo se permiten datos reales verificados.';
        setIdentityError(errMsg);
        setIdentityVerified(false);
        setIdentitySuccessMsg(null);
        setFormErrors(prev => ({ ...prev, solicitante_numero_documento: true }));
        toast.error(errMsg);
      } else {
        setIdentityError(null);
        setIdentityVerified(true);
        setIdentitySuccessMsg(data.message || '✓ Identidad confirmada ante Registraduría / DIAN');
        setFormErrors(prev => {
          const updated = { ...prev };
          delete updated.solicitante_numero_documento;
          return updated;
        });

        // Autocompletar el nombre oficial si la API de verificación lo devolvió
        if (data.officialName && data.officialName.toLowerCase() !== (nombreIngresado || '').trim().toLowerCase()) {
          setFormData(prev => ({ ...prev, solicitante_nombre: data.officialName }));
          toast.success(`✓ Nombre verificado y autocompletado: ${data.officialName}`);
        }
      }
    } catch (err) {
      console.warn('Error verificando identidad:', err);
    } finally {
      setIsValidatingDoc(false);
    }
  };

  const handleDocBlur = () => {
    if (formData.solicitante_numero_documento && formData.solicitante_numero_documento.length >= 5) {
      handleVerifyIdentity(formData.solicitante_nombre, formData.solicitante_numero_documento, formData.solicitante_tipo_documento);
    }
  };

  const handleVerifyClientIdentity = async (nombreIngresado, numeroDocumento, tipoDocumento) => {
    const cleanDoc = (numeroDocumento || '').replace(/[^0-9a-zA-Z]/g, '');
    if (!cleanDoc || cleanDoc.length < 5) return;

    setIsValidatingClientDoc(true);
    setClientIdentityError(null);
    try {
      const data = await runVerificationJob(
        tipoDocumento || 'Cédula de ciudadanía',
        cleanDoc,
        nombreIngresado,
        (msg) => setClientIdentitySuccessMsg(msg)
      );

      if (!data || data.valid === false || data.match === false) {
        const errMsg = data?.error || '⚠️ El número de documento no corresponde al nombre del cliente presentado. Por motivos de seguridad, solo se permiten datos reales verificados.';
        setClientIdentityError(errMsg);
        setClientIdentityVerified(false);
        setClientIdentitySuccessMsg(null);
        setFormErrors(prev => ({ ...prev, interesado_documento: true }));
        toast.error(errMsg);
      } else {
        setClientIdentityError(null);
        setClientIdentityVerified(true);
        setClientIdentitySuccessMsg(data.message || '✓ Identidad del cliente confirmada');
        setFormErrors(prev => {
          const updated = { ...prev };
          delete updated.interesado_documento;
          return updated;
        });

        if (data.officialName && data.officialName.toLowerCase() !== (nombreIngresado || '').trim().toLowerCase()) {
          setFormData(prev => ({ ...prev, interesado_nombre: data.officialName }));
          toast.success(`✓ Cliente verificado: ${data.officialName}`);
        }
      }
    } catch (err) {
      console.warn('Error verificando cliente presentado:', err);
    } finally {
      setIsValidatingClientDoc(false);
    }
  };

  const handleClientDocBlur = () => {
    if (formData.interesado_documento && formData.interesado_documento.length >= 5) {
      handleVerifyClientIdentity(formData.interesado_nombre, formData.interesado_documento, formData.interesado_tipo_documento);
    }
  };

  const handleClientNameBlur = () => {
    if (formData.interesado_documento && formData.interesado_documento.length >= 5) {
      handleVerifyClientIdentity(formData.interesado_nombre, formData.interesado_documento, formData.interesado_tipo_documento);
    }
  };

  const handleNameBlur = () => {
    if (formData.solicitante_numero_documento && formData.solicitante_numero_documento.length >= 5) {
      handleVerifyIdentity(formData.solicitante_nombre, formData.solicitante_numero_documento, formData.solicitante_tipo_documento);
    }
  };

  const handleVerifyAcompananteIdentity = async (index, nombreIngresado, numeroDocumento) => {
    const cleanDoc = (numeroDocumento || '').replace(/[^0-9a-zA-Z]/g, '');
    if (!cleanDoc || cleanDoc.length < 5) return;

    setValidatingAcompIndex(index);
    setAcompErrors(prev => ({ ...prev, [index]: null }));
    try {
      const data = await runVerificationJob(
        'Cédula de ciudadanía',
        cleanDoc,
        nombreIngresado,
        (msg) => setAcompSuccessMsg(prev => ({ ...prev, [index]: msg }))
      );

      if (!data || data.valid === false || data.match === false) {
        const errMsg = data?.error || `⚠️ El número de cédula ${cleanDoc} del acompañante no corresponde al nombre indicado. Por motivos de seguridad legal, solo se permiten datos reales verificados.`;
        setAcompErrors(prev => ({ ...prev, [index]: errMsg }));
        setAcompVerified(prev => ({ ...prev, [index]: false }));
        setAcompSuccessMsg(prev => ({ ...prev, [index]: null }));
        setFormErrors(prev => ({ ...prev, [`acomp_${index}_documento`]: true }));
        toast.error(errMsg);
      } else {
        setAcompErrors(prev => {
          const updated = { ...prev };
          delete updated[index];
          return updated;
        });
        setAcompVerified(prev => ({ ...prev, [index]: true }));
        setAcompSuccessMsg(prev => ({ ...prev, [index]: data.message || '✓ Identidad confirmada ante Policía Nacional' }));
        setFormErrors(prev => {
          const updated = { ...prev };
          delete updated[`acomp_${index}_documento`];
          return updated;
        });

        if (data.officialName && data.officialName.toLowerCase() !== (nombreIngresado || '').trim().toLowerCase()) {
          setFormData(prev => {
            const updated = [...prev.acompanantes];
            if (updated[index]) {
              updated[index] = { ...updated[index], nombre: data.officialName };
            }
            return { ...prev, acompanantes: updated };
          });
          toast.success(`✓ Acompañante verificado: ${data.officialName}`);
        }
      }
    } catch (err) {
      console.warn('Error verificando acompañante:', err);
    } finally {
      setValidatingAcompIndex(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormErrors(prev => {
      if (!prev.firma_digital_archivo && !prev.metodoFirma) return prev;
      const updated = { ...prev };
      delete updated.firma_digital_archivo;
      delete updated.metodoFirma;
      return updated;
    });
    setError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        firma_virtual_base64: reader.result,
        firma_digital_archivo: file,
        firma_fechahora_audit: new Date().toISOString()
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const rawValue = type === 'checkbox' ? checked : value;

    setFormErrors(prevErr => {
      if (!prevErr[name]) return prevErr;
      const updated = { ...prevErr };
      delete updated[name];
      return updated;
    });
    setError('');

    setFormData(prev => {
      let val = rawValue;
      let newState = { ...prev, [name]: val };

      if (name === 'solicitante_nombre') {
        if (prev.solicitante_tipo_persona === 'Persona Natural') {
          newState[name] = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        } else {
          newState[name] = val.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.\-&]/g, '');
        }
      } else if (name === 'solicitante_celular') {
        const digits = val.replace(/\D/g, '').slice(0, 10);
        newState[name] = `+57${digits}`;
      } else if (name === 'solicitante_numero_documento') {
        if (prev.solicitante_tipo_documento === 'Pasaporte') {
          newState[name] = val.replace(/[^a-zA-Z0-9]/g, '');
        } else if (prev.solicitante_tipo_persona === 'Persona Jurídica' || prev.solicitante_tipo_documento === 'NIT' || prev.solicitante_tipo_documento === 'RUT') {
          newState[name] = val.replace(/[^0-9.-]/g, '');
        } else {
          newState[name] = val.replace(/\D/g, '');
        }
      } else if (name === 'interesado_documento') {
        if (prev.interesado_tipo_documento === 'Pasaporte') {
          newState[name] = val.replace(/[^a-zA-Z0-9]/g, '');
        } else if (prev.tipo_cliente === 'Empresa' || prev.interesado_tipo_documento === 'NIT' || prev.interesado_tipo_documento === 'RUT') {
          newState[name] = val.replace(/[^0-9.-]/g, '');
        } else {
          newState[name] = val.replace(/\D/g, '');
        }
      }

      if (name === 'solicitante_tipo_persona') { newState.solicitante_tipo_documento = ''; newState.solicitante_perfil = ''; newState.solicitante_numero_documento = ''; newState.solicitante_representante_legal = ''; }
      if (name === 'tipo_cliente') { newState.interesado_nombre = ''; newState.interesado_tipo_documento = ''; newState.interesado_documento = ''; }
      else if (name === 'solicitante_tipo_documento') newState.solicitante_numero_documento = '';
      else if (name === 'interesado_tipo_documento') newState.interesado_documento = '';
      else if (name === 'metodoFirma') {
        newState.firma_virtual_base64 = '';
        newState.firma_digital_archivo = null;
        newState.firma_fechahora_audit = null;
      }

      if (name === 'cantidad_personas') {
        const n = parseInt(val, 10) || 0;
        const companions = n > 0 ? Array.from({ length: n }, (_, i) => prev.acompanantes[i] || { nombre: '', documento: '', parentesco: '', parentescoOtro: '' }) : [];
        newState.acompanantes = companions;
      }

      return newState;
    });
  };

  const handleAcompananteChange = (index, field, value) => {
    const errorKey = `acomp_${index}_${field}`;
    setFormErrors(prev => {
      if (!prev[errorKey]) return prev;
      const updated = { ...prev };
      delete updated[errorKey];
      return updated;
    });
    setError('');

    setFormData(prev => {
      const updated = [...prev.acompanantes];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, acompanantes: updated };
    });
  };

  const handleDateChange = useCallback((date) => {
    if (date) {
      setFormErrors(prev => {
        if (!prev.fecha_cita_bogota) return prev;
        const updated = { ...prev };
        delete updated.fecha_cita_bogota;
        return updated;
      });
      setError('');
    }
    setFormData(prev => ({ ...prev, fecha_cita_bogota: date }));
  }, []);

  const handleSignatureChange = useCallback((signatureData) => {
    if (signatureData) {
      setFormErrors(prev => {
        if (!prev.firma_virtual_base64 && !prev.metodoFirma) return prev;
        const updated = { ...prev };
        delete updated.firma_virtual_base64;
        delete updated.metodoFirma;
        return updated;
      });
      setError('');
    }
    setFormData(prevState => ({
      ...prevState,
      firma_virtual_base64: signatureData,
      firma_digital_archivo: null,
      firma_fechahora_audit: new Date().toISOString()
    }));
  }, []);

  const handleConsent = useCallback(() => { setConsentGiven(true); }, []);
  const handleDecline = useCallback(() => { navigate('/properties'); }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFormErrors({});

    if (identityError) {
      toast.error(identityError);
      setError(identityError);
      const el = document.getElementById('solicitante_numero_documento');
      if (el) el.focus();
      return;
    }

    if (showAgentSections && clientIdentityError) {
      toast.error(clientIdentityError);
      setError(clientIdentityError);
      const el = document.getElementById('interesado_documento');
      if (el) el.focus();
      return;
    }

    if (Object.values(acompErrors).some(Boolean)) {
      const firstError = Object.values(acompErrors).find(Boolean);
      toast.error(firstError);
      setError(firstError);
      return;
    }

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      const fieldErrorFlags = Object.keys(validationErrors).reduce((acc, key) => ({ ...acc, [key]: true }), {});
      setFormErrors(fieldErrorFlags);
      setError(Object.values(validationErrors)[0]);
      return;
    }

    setIsSubmitting(true);

    try {
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

      const payload = {
        ...formData,
        fecha_cita_texto,
        hora_cita,
        cantidad_personas: parseInt(formData.cantidad_personas, 10) || null,
        acompanantes: formData.acompanantes.length > 0 ? formData.acompanantes : null,
      };
      delete payload.fecha_cita_bogota;
      delete payload.firma_digital_archivo;
      if (payload.solicitante_celular) payload.solicitante_celular = payload.solicitante_celular.replace('+', '');
      Object.keys(payload).forEach(key => { if (typeof payload[key] === 'string') payload[key] = payload[key].trim(); });

      // Inserción nativa en PostgreSQL 17 nativo de Vecy Network vía tRPC (0% cuotas Supabase)
      const response = await createSolicitudMutation.mutateAsync(payload);

      if (onSuccess) {
        onSuccess(response?.data || payload);
      } else {
        toast.success(response?.message || '¡Solicitud registrada con éxito!');
        navigate('/ofertas');
      }

    } catch (error) {
      console.error('Error al enviar la solicitud:', error);
      const msg = error?.message || 'No se pudo completar la solicitud. Revisa tu conexión o inténtalo más tarde.';
      setError(msg);
      toast.error(msg);
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
  
  const labelPersonas = showAgentSections ? "¿Cuántas personas ingresarán además de ti y tu cliente?" : "¿Cuántas personas ingresarán contigo?";
  const cantidadPersonasOptions = showAgentSections
    ? [{ value: '0', label: 'Solo mi cliente y yo' }, { value: '1', label: '1 persona adicional' }, { value: '2', label: '2 personas adicionales' }, { value: '3', label: '3 personas adicionales' }, { value: '4', label: '4 personas adicionales' }, { value: '5', label: '5 personas adicionales' }]
    : [{ value: '0', label: 'Solo yo' }, { value: '1', label: '1 persona adicional' }, { value: '2', label: '2 personas adicionales' }, { value: '3', label: '3 personas adicionales' }, { value: '4', label: '4 personas adicionales' }, { value: '5', label: '5 personas adicionales' }];

  const parentescoOptions = [
    { value: 'Padre', label: 'Padre' }, { value: 'Madre', label: 'Madre' },
    { value: 'Novio', label: 'Novio' }, { value: 'Novia', label: 'Novia' },
    { value: 'Esposo', label: 'Esposo' }, { value: 'Esposa', label: 'Esposa' },
    { value: 'Hijo', label: 'Hijo' }, { value: 'Hija', label: 'Hija' },
    { value: 'Hermano', label: 'Hermano' }, { value: 'Hermana', label: 'Hermana' },
    { value: 'Amigo', label: 'Amigo' }, { value: 'Amiga', label: 'Amiga' },
    { value: 'Arquitecto', label: 'Arquitecto' }, { value: 'Arquitecta', label: 'Arquitecta' },
    { value: 'Perito avaluador', label: 'Perito avaluador' },
    { value: 'Otro', label: 'Otro (especifique)' }
  ];
  const radioError = !!formErrors.metodoFirma;
  const radioClasses = `mr-2 h-4 w-4 bg-transparent accent-esmeralda focus:ring-soft-gold rounded-full transition-colors duration-300 ${radioError ? 'border-red-500 ring-1 ring-red-500' : 'border-off-white/50'}`;

  const acompanantesBlock = (
    <fieldset className="border-t-2 border-soft-gold pt-6 mb-10">
      <legend className="text-xl font-semibold section-legend-gold px-2 -ml-2">
        {showAgentSections ? "3. Datos de la Cita, Cliente y Acompañantes" : "3. Datos de la Cita y Acompañantes"}
      </legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <CustomDateTimePicker onChange={handleDateChange} value={formData.fecha_cita_bogota} error={!!formErrors.fecha_cita_bogota} />
        <CustomSelect label={labelPersonas} name="cantidad_personas" value={formData.cantidad_personas} onChange={handleChange} options={cantidadPersonasOptions} placeholder="Selecciona cantidad..." error={!!formErrors.cantidad_personas} />
      </div>

      {showAgentSections && (
        <div className="mt-8 border-t border-soft-gold/30 pt-6">
          <h4 className="text-md font-semibold text-soft-gold mb-4">Datos del Cliente Principal que Presentas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CustomSelect label="Tipo de Cliente" name="tipo_cliente" value={formData.tipo_cliente} onChange={handleChange} options={tipoClienteOptions} />
            <FormInput onChange={handleChange} onBlur={handleClientNameBlur} value={formData.interesado_nombre} label="Nombre del Cliente / Razón Social" id="interesado_nombre" name="interesado_nombre" type="text" placeholder="Ej: María Gómez" required error={!!formErrors.interesado_nombre} />
            <CustomSelect label="Tipo de Documento del Cliente" name="interesado_tipo_documento" value={formData.interesado_tipo_documento} onChange={handleChange} options={tipoDocumentoClienteOptions} placeholder="Selecciona..." error={!!formErrors.interesado_tipo_documento} />
            <FormInput 
              onChange={handleChange} 
              onBlur={handleClientDocBlur}
              value={formData.interesado_documento} 
              label="Número de Documento del Cliente" 
              id="interesado_documento" 
              name="interesado_documento" 
              type={isClientPassport ? "text" : "tel"} 
              pattern={isClientPassport ? ".*" : "[0-9]*"} 
              placeholder="Ej: 987654321" 
              required 
              maxLength="20" 
              error={!!formErrors.interesado_documento || !!clientIdentityError} 
              errorAlert={clientIdentityError}
              successBadge={clientIdentitySuccessMsg}
              isValidating={isValidatingClientDoc}
              hint={securityHint}
            />
          </div>
        </div>
      )}

      {formData.acompanantes.length > 0 && (
        <div className="mt-6 space-y-4">
          <h4 className="text-md font-semibold text-soft-gold">Acompañantes adicionales autorizados</h4>
          {formData.acompanantes.map((acomp, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-vecy-border rounded-lg bg-black/20">
              <FormInput 
                onChange={(e) => handleAcompananteChange(index, 'nombre', e.target.value)} 
                onBlur={() => {
                  const a = formData.acompanantes[index];
                  if (a && a.documento && a.documento.length >= 5) {
                    handleVerifyAcompananteIdentity(index, a.nombre, a.documento);
                  }
                }}
                value={acomp.nombre} 
                label={ `Nombre Acompañante ${index + 1}` } 
                id={ `acomp_nombre_${index}` } 
                name={ `acomp_nombre_${index}` } 
                type="text" 
                placeholder="Nombre y Apellidos" 
                required 
                error={!!formErrors[`acomp_${index}_nombre`]} 
              />
              <FormInput 
                onChange={(e) => handleAcompananteChange(index, 'documento', e.target.value.replace(/\D/g, ''))} 
                onBlur={() => {
                  const a = formData.acompanantes[index];
                  if (a && a.documento && a.documento.length >= 5) {
                    handleVerifyAcompananteIdentity(index, a.nombre, a.documento);
                  }
                }}
                value={acomp.documento} 
                label={ `Documento Acompañante ${index + 1}` } 
                id={ `acomp_doc_${index}` } 
                name={ `acomp_doc_${index}` } 
                type="tel" 
                pattern="[0-9]*" 
                placeholder="Número de C.C." 
                required 
                error={!!formErrors[`acomp_${index}_documento`] || !!acompErrors[index]} 
                errorAlert={acompErrors[index]}
                successBadge={acompSuccessMsg[index]}
                isValidating={validatingAcompIndex === index}
                hint={securityHint}
              />
              <div>
                <CustomSelect
                  label="Parentesco / Relación"
                  name={ `acomp_parentesco_${index}` }
                  value={acomp.parentesco || ''}
                  onChange={(e) => handleAcompananteChange(index, 'parentesco', e.target.value)}
                  options={parentescoOptions}
                  placeholder="Selecciona parentesco..."
                  error={!!formErrors[`acomp_${index}_parentesco`]}
                />
                {acomp.parentesco === 'Otro' && (
                  <div className="mt-2">
                    <FormInput
                      onChange={(e) => handleAcompananteChange(index, 'parentescoOtro', e.target.value)}
                      value={acomp.parentescoOtro || ''}
                      label="Especifique el parentesco"
                      id={ `acomp_parentesco_otro_${index}` }
                      name={ `acomp_parentesco_otro_${index}` }
                      type="text"
                      placeholder="Ej: Abogado, Ingeniero..."
                      required
                      error={!!formErrors[`acomp_${index}_parentescoOtro`]}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );

  return (
    <>
      <form noValidate onSubmit={handleSubmit}>
        <div className="text-center mb-8">
          <img src={logoToDisplay} alt="Logo oficial" className="mx-auto h-20 w-20 mb-4 logo-glow-pulse object-contain" />
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-1 block">
            <span className="title-gold-gradient">Verificación de Identidad</span>
          </h2>
          <Link to="/" className="text-soft-gold text-sm hover:underline mt-2 inline-block opacity-70 hover:opacity-100 transition-opacity">← Volver a la portada</Link>
        </div>

        {/* BANNER DEL INMUEBLE */}
        {(urlInmueble || urlCodigo) && (
          <div
            className="mx-auto max-w-2xl mb-8 rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(191,149,63,0.06) 100%)',
              border: '1.5px solid rgba(212,175,55,0.45)',
              boxShadow: '0 0 30px rgba(212,175,55,0.12)',
            }}
          >
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
              <button
                type="button"
                onClick={handleShare}
                className="shrink-0 p-2.5 rounded-xl border border-soft-gold/30 bg-soft-gold/10 hover:bg-soft-gold/25 transition-all text-soft-gold flex items-center justify-center gap-1.5 font-semibold text-xs tracking-wider"
                title="Copiar enlace de agenda"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-esmeralda animate-scale" /> Copiado
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" /> Compartir
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SECCIÓN AUTENTICACIÓN */}
        <fieldset className="border-t-2 border-soft-gold pt-6 mb-10">
          <legend className="text-xl font-semibold section-legend-gold px-2 -ml-2">Identificación</legend>
          {session ? (
            <div className="flex items-center justify-between p-4 bg-vecy-card border border-soft-gold/40 rounded-lg">
              <div>
                <p className="text-xs uppercase tracking-widest text-soft-gold font-semibold">Sesión activa</p>
                <p className="text-off-white font-medium">{session.user.email}</p>
                {formData.solicitante_nombre && (
                  <p className="text-xs text-vecy-muted mt-0.5">Perfil: {formData.solicitante_nombre}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="text-center p-6 bg-vecy-card border border-vecy-border rounded-lg">
              <p className="text-off-white/80 text-sm mb-4">
                Para agendar una visita o solicitar un servicio, primero debes iniciar sesión o registrarte.
              </p>
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-soft-gold to-dark-gold text-volcanic-black font-bold py-2.5 px-6 rounded-lg hover:opacity-90 transition-opacity shadow-md"
              >
                Iniciar Sesión / Registrarme
              </button>
            </div>
          )}
        </fieldset>

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
                <FormInput 
                  onChange={handleChange} 
                  onBlur={handleNameBlur}
                  value={formData.solicitante_nombre} 
                  label="Nombre Completo o Razón Social" 
                  id="solicitante_nombre" 
                  name="solicitante_nombre" 
                  type="text" 
                  placeholder="Ej: Juan Pérez o Constructora XYZ" 
                  required 
                  error={!!formErrors.solicitante_nombre} 
                />
                <CustomSelect label="Tipo de Persona" name="solicitante_tipo_persona" value={formData.solicitante_tipo_persona} onChange={handleChange} options={tipoPersonaOptions} placeholder="Selecciona..." error={!!formErrors.solicitante_tipo_persona} />
                <CustomSelect label="Perfil" name="solicitante_perfil" value={formData.solicitante_perfil} onChange={handleChange} options={perfilOptions} placeholder="Selecciona tu perfil..." error={!!formErrors.solicitante_perfil} />
                <FormInput onChange={handleChange} value={formData.solicitante_email} label="Correo Electrónico" id="solicitante_email" name="solicitante_email" type="email" placeholder="tucorreo@ejemplo.com" required error={!!formErrors.solicitante_email} />
                <FormInput onChange={handleChange} value={formData.solicitante_celular.replace(/^\+?57/, '').slice(0, 10)} label="Celular" id="solicitante_celular" name="solicitante_celular" type="tel" placeholder="3001234567" required adornment="+57" maxLength="10" pattern="[0-9]*" error={!!formErrors.solicitante_celular} />
                <CustomSelect label="Tipo de Documento" name="solicitante_tipo_documento" value={formData.solicitante_tipo_documento} onChange={handleChange} options={tipoDocumentoOptions} placeholder="Selecciona..." error={!!formErrors.solicitante_tipo_documento} />
                <FormInput 
                  onChange={handleChange} 
                  onBlur={handleDocBlur}
                  value={formData.solicitante_numero_documento} 
                  label={isCompanyDoc ? "Número de Identificación (NIT/RUT)" : "Número de Documento"} 
                  id="solicitante_numero_documento" 
                  name="solicitante_numero_documento" 
                  type={isPassport || isCompanyDoc ? "text" : "tel"} 
                  pattern={isPassport || isCompanyDoc ? ".*" : "[0-9]*"} 
                  placeholder={isCompanyDoc ? "Ej: 900.123.456-7" : "Ej: 1234567890"} 
                  required 
                  maxLength="20" 
                  error={!!formErrors.solicitante_numero_documento || !!identityError} 
                  errorAlert={identityError}
                  successBadge={identitySuccessMsg}
                  isValidating={isValidatingDoc}
                  hint={securityHint}
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
                  <label className="block text-sm font-semibold mb-1" style={{ color: isLockedByUrl ? '#d4af37' : 'rgba(240,240,240,0.7)' }}>
                    Nombre del Inmueble o Servicio {isLockedByUrl && <span className="ml-1">🔒</span>}
                  </label>
                  <input
                    type="text"
                    id="nombre_inmueble"
                    name="nombre_inmueble"
                    value={formData.nombre_inmueble}
                    onChange={isLockedByUrl ? undefined : handleChange}
                    readOnly={isLockedByUrl}
                    placeholder="Ej: Apartamento Premium Chapinero"
                    className="w-full px-4 py-3 rounded-lg text-sm transition-all duration-200 outline-none"
                    style={{
                      background: isLockedByUrl ? 'rgba(212,175,55,0.06)' : 'rgba(0,0,0,0.3)',
                      border: isLockedByUrl ? '1.5px solid rgba(212,175,55,0.5)' : (formErrors.nombre_inmueble ? '1.5px solid #ef4444' : '1px solid rgba(240,240,240,0.15)'),
                      color: '#f0f0f0',
                      cursor: isLockedByUrl ? 'not-allowed' : 'text',
                    }}
                  />
                  {!!formErrors.nombre_inmueble && <p className="text-red-400 text-xs mt-1">{formErrors.nombre_inmueble}</p>}
                </div>

                <div className="relative">
                  <label className="block text-sm font-semibold mb-1" style={{ color: isLockedByUrl ? '#d4af37' : 'rgba(240,240,240,0.7)' }}>
                    Código de Identificación {isLockedByUrl && <span className="ml-1">🔒</span>}
                  </label>
                  <input
                    type="text"
                    id="codigo_inmueble"
                    name="codigo_inmueble"
                    value={formData.codigo_inmueble}
                    onChange={isLockedByUrl ? undefined : handleChange}
                    readOnly={isLockedByUrl}
                    placeholder="Ej: ID-BOG-SBC01"
                    className="w-full px-4 py-3 rounded-lg text-sm transition-all duration-200 outline-none"
                    style={{
                      background: isLockedByUrl ? 'rgba(212,175,55,0.06)' : 'rgba(0,0,0,0.3)',
                      border: isLockedByUrl ? '1.5px solid rgba(212,175,55,0.5)' : (formErrors.codigo_inmueble ? '1.5px solid #ef4444' : '1px solid rgba(240,240,240,0.15)'),
                      color: '#f0f0f0',
                      cursor: isLockedByUrl ? 'not-allowed' : 'text',
                    }}
                  />
                  {!!formErrors.codigo_inmueble && <p className="text-red-400 text-xs mt-1">{formErrors.codigo_inmueble}</p>}
                </div>
              </div></fieldset>

              {showVisitDetails && acompanantesBlock}

              {showAgentSections && (
                <fieldset className="border-t-2 border-soft-gold pt-6 mb-10">
                  <legend className="text-xl font-semibold section-legend-gold px-2 -ml-2">4. Firma del Acuerdo de Puntas Compartidas (50/50)</legend>
                  <p className="text-off-white/80 mt-2 text-sm">
                    Para garantizar la transparencia y proteger la comisión compartida (50/50) conforme a las leyes colombianas, es indispensable formalizar el acuerdo mediante firma electrónica. Selecciona tu método preferido:
                  </p>
                  
                  <div className="mt-4 space-y-4">
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="radio" 
                        name="metodoFirma" 
                        value="virtual" 
                        checked={formData.metodoFirma === 'virtual'} 
                        onChange={handleChange} 
                        className={radioClasses} 
                      />
                      <span className="text-off-white text-sm font-medium">Dibujar trazo en pantalla (Firma Virtual Táctil)</span>
                    </label>

                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="radio" 
                        name="metodoFirma" 
                        value="archivo" 
                        checked={formData.metodoFirma === 'archivo'} 
                        onChange={handleChange} 
                        className={radioClasses} 
                      />
                      <span className="text-off-white text-sm font-medium">Adjuntar imagen de mi firma (PNG, JPG o PDF)</span>
                    </label>
                  </div>

                  {formData.metodoFirma === 'virtual' && (
                    <div className="mt-6">
                      <React.Suspense fallback={<div className="p-4 text-center text-sm text-vecy-muted">Cargando panel de firma...</div>}>
                        <SignaturePadComponent onSignatureChange={handleSignatureChange} />
                      </React.Suspense>
                    </div>
                  )}

                  {formData.metodoFirma === 'archivo' && (
                    <div className="mt-6 p-4 border-2 border-dashed border-soft-gold/40 rounded-xl bg-black/30 text-center">
                      <input 
                        type="file" 
                        id="firma_archivo" 
                        accept="image/png, image/jpeg, image/jpg" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                      <label htmlFor="firma_archivo" className="cursor-pointer block">
                        <p className="text-sm text-soft-gold font-bold mb-1">Haz clic aquí para seleccionar el archivo de tu firma</p>
                        <p className="text-xs text-vecy-muted">Formatos permitidos: PNG, JPG (Fondo blanco recomendado)</p>
                      </label>
                      {formData.firma_digital_archivo && (
                        <p className="mt-3 text-xs text-esmeralda font-semibold">
                          ✓ Archivo cargado: {formData.firma_digital_archivo.name}
                        </p>
                      )}
                    </div>
                  )}
                </fieldset>
              )}

              <AuthorizationCheckbox formData={formData} handleChange={handleChange} isAgentView={showAgentSections} error={!!formErrors.autorizacion} />

              {error && (
                <div className="my-6 p-4 bg-red-950/60 border border-red-500/80 rounded-xl text-red-200 text-sm text-center flex items-center justify-center gap-2 shadow-lg">
                  <span className="text-base">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-8 text-center">
                <button 
                  type="submit" 
                  disabled={isSubmitting || isValidatingDoc || isValidatingClientDoc || validatingAcompIndex !== null || !!identityError || (showAgentSections && !!clientIdentityError) || Object.values(acompErrors).some(Boolean)}
                  className={`w-full sm:w-auto px-10 py-3.5 font-extrabold uppercase tracking-widest text-xs rounded-xl transition-all transform hover:-translate-y-0.5 disabled:cursor-not-allowed ${
                    (identityError || (showAgentSections && clientIdentityError) || Object.values(acompErrors).some(Boolean))
                      ? 'bg-red-950/80 border-2 border-red-500/70 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                      : 'bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f] text-black shadow-[0_0_20px_rgba(191,149,63,0.3)] hover:shadow-[0_0_30px_rgba(191,149,63,0.5)] disabled:opacity-50'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <Spinner /> Procesando Solicitud...
                    </span>
                  ) : (isValidatingDoc || isValidatingClientDoc || validatingAcompIndex !== null) ? (
                    <span className="flex items-center justify-center">
                      <Spinner /> Verificando identidad ante Policía Nacional (2Captcha)...
                    </span>
                  ) : (identityError || (showAgentSections && clientIdentityError) || Object.values(acompErrors).some(Boolean)) ? (
                    '⚠️ Bloqueado: Inconsistencia de identidad detectada'
                  ) : (
                    'Confirmar y Agendar Visita'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </form>

      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
    </>
  );
}

export default AgendaForm;
