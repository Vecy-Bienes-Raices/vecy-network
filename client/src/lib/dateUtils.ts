/**
 * Formatea cualquier fecha devuelta por Supabase/BD (UTC string, ISO string o Date)
 * a la Hora Oficial de Colombia (Bogotá - UTC-5).
 */
export function formatColombiaDate(dateInput: any): string {
  if (!dateInput) return "";
  let d: Date;
  
  if (dateInput instanceof Date) {
    d = dateInput;
  } else if (typeof dateInput === "string") {
    let str = dateInput.trim();
    // Si la cadena de texto de BD no incluye 'Z' ni sufijo de offset ('+00:00' / '-05:00'),
    // PostgreSQL timestamp en Supabase almacena UTC sin 'Z'. Añadimos 'Z' para forzar UTC.
    if (!str.endsWith("Z") && !str.includes("+") && !/-\d{2}:\d{2}$/.test(str)) {
      str = str.replace(" ", "T") + "Z";
    }
    d = new Date(str);
  } else if (typeof dateInput === "number") {
    d = new Date(dateInput);
  } else {
    d = new Date(dateInput);
  }

  if (isNaN(d.getTime())) return String(dateInput);

  return d.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formatea solo la fecha actual en la zona horaria de Colombia.
 */
export function getColombiaCurrentDateString(): string {
  return new Date().toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
