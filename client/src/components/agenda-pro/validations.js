// Helper para detectar números "basura" (ej: 111111, 123456)
export const isFraudulentNumber = (str) => {
  if (!str) return false;
  const cleanStr = str.replace(/\D/g, ''); // Solo dígitos
  if (cleanStr.length < 5) return false;
  // 1. Todos los dígitos iguales (111111, 555555)
  if (/^(\d)\1+$/.test(cleanStr)) return true;
  // 2. Secuencias simples ascendentes o descendentes (123456, 987654)
  const ascending = '01234567890123456789';
  const descending = '98765432109876543210';
  if (ascending.includes(cleanStr) || descending.includes(cleanStr)) return true;
  return false;
};

export const validateForm = (data) => {
  const errors = {};

  const requiredFields = {
    solicitante_nombre: 'Nombre Completo o Razón Social', 
    solicitante_tipo_persona: 'Tipo de Persona',
    solicitante_perfil: 'Perfil', 
    solicitante_email: 'Correo Electrónico',
    solicitante_celular: 'Celular', 
    solicitante_tipo_documento: 'Tipo de Documento',
    solicitante_numero_documento: 'Número de Documento', 
    servicio_solicitado: 'Servicio solicitado',
    codigo_inmueble: 'Código del Inmueble o Servicio', 
    nombre_inmueble: 'Nombre del Inmueble',
  };

  if (data.solicitante_tipo_persona === 'Persona Jurídica') {
    requiredFields.solicitante_representante_legal = 'Nombre del Representante Legal';
  }

  if (data.servicio_solicitado === 'Visitar inmueble') {
    requiredFields.fecha_cita_bogota = 'Fecha y Hora de la Visita';
    requiredFields.cantidad_personas = 'Cantidad de Personas';
  }

  if (data.servicio_solicitado === 'Visitar inmueble' || data.servicio_solicitado === 'Avalúo comercial') {
    requiredFields.opcion_negocio = 'Opción de Negocio';
  }

  const isAgent = ['Agente', 'Agencia / Inmobiliaria', 'Bróker / Empresa', 'Constructora'].includes(data.solicitante_perfil);
  if (isAgent) {
    requiredFields.tipo_cliente = 'Tipo de cliente';
    requiredFields.interesado_nombre = 'Nombre del cliente';
    requiredFields.interesado_tipo_documento = 'Tipo de documento del cliente';
    requiredFields.interesado_documento = 'Número de documento del cliente';
    requiredFields.metodoFirma = 'Método de Firma';
    if (data.metodoFirma === 'virtual') requiredFields.firma_virtual_base64 = 'Firma de Autorización';
    else if (data.metodoFirma === 'digital') requiredFields.firma_digital_archivo = 'Archivo de Firma Digital';
  }
  
  requiredFields.autorizacion = 'Autorización Final';

  for (const field in requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors[field] = `El campo "${requiredFields[field]}" es obligatorio.`;
    }
  }

  // Validación de celular: mínimo 10 dígitos y no fraudulento
  const celularLimpio = data.solicitante_celular ? data.solicitante_celular.replace(/\D/g, '') : '';
  // Correo, Celular y Documento
  if (data.solicitante_email && !/^\S+@\S+\.\S+$/.test(data.solicitante_email)) { 
    errors.solicitante_email = 'Por favor, ingresa un formato de correo electrónico válido.'; 
  }

  if (celularLimpio) {
    if (celularLimpio.length < 12) { // 57 + 10 dígitos = 12
      errors.solicitante_celular = 'El número de celular debe tener 10 dígitos.';
    } else if (isFraudulentNumber(celularLimpio.substring(2))) { // Validamos solo la parte del número (sin 57)
      errors.solicitante_celular = 'Por favor, ingresa un número de celular válido y real.';
    } else if (!/^573[\d]{9}$/.test(celularLimpio)) {
      // Validación extra para Colombia: Debe empezar por 573 y tener 12 dígitos en total
      errors.solicitante_celular = 'El número de celular debe ser un línea válida en Colombia (comenzar por 3).';
    }
  }
  if (data.solicitante_numero_documento && isFraudulentNumber(data.solicitante_numero_documento)) {
    errors.solicitante_numero_documento = 'El número de documento ingresado no parece válido.';
  }
  if (data.interesado_documento && isFraudulentNumber(data.interesado_documento)) {
    errors.interesado_documento = 'El número de documento del cliente no parece válido.';
  }
  if (!data.autorizacion) { errors.autorizacion = 'Debes aceptar la cláusula de confidencialidad para continuar.'; }
  if (data.servicio_solicitado === 'Visitar inmueble' && !data.cantidad_personas) { errors.cantidad_personas = 'Selecciona una cantidad válida de personas entre 1 y 6.'; }

  // Validar campos de acompañantes
  if (Array.isArray(data.acompanantes)) {
    data.acompanantes.forEach((acomp, i) => {
      if (!acomp.nombre || acomp.nombre.trim() === '') {
        errors[`acomp_${i}_nombre`] = `El nombre del acompañante ${i + 1} es obligatorio.`;
      }
      if (!acomp.documento || acomp.documento.trim() === '') {
        errors[`acomp_${i}_documento`] = `El documento del acompañante ${i + 1} es obligatorio.`;
      }
    });
  }

  return errors;
};
