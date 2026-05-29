import { normalizarTextoGeografico, validarZona } from "../server/_core/geography";
import { buscarLugarColombia } from "../server/_core/colombia-geography";

console.log("=== INICIANDO PRUEBA DE NORMALIZACIÓN GEOGRÁFICA DE PRECISIÓN ===");

const cases = [
  "Bogotá-Suba",
  "Medellín/Envigado",
  "Cali, Valle del Lili",
  "Bogotá - Cedritos",
  "Bogotá/Usaquén",
  "Bogotá,suba,pasadena",
  "Tadó-Chocó"
];

for (const c of cases) {
  const norm = normalizarTextoGeografico(c);
  console.log(`\nEntrada: "${c}"`);
  console.log(`-> Normalizado: "${norm}"`);
  
  const searchResult = buscarLugarColombia(c);
  console.log(`-> Lugar buscado en Colombia:`, searchResult ? `${searchResult.nombreCanonico} (${searchResult.departamento})` : "Ninguno");
  
  const validation = validarZona(c);
  console.log(`-> Validación de zona:`, validation.isValid ? `VÁLIDA (Barrio: ${validation.barrioCanonico}, Localidad: ${validation.localidad}, Ciudad: ${validation.city})` : `INVÁLIDA (${validation.errorType}: ${validation.message})`);
}

console.log("\n=== PRUEBA DE GEOCENTRISMO DE PRECISIÓN COMPLETADA ===");
