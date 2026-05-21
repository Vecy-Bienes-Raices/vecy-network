import { validarZona } from '../server/_core/geography';

const tests = [
  'Guaymaral',
  'Lagos de Torca',
  'Bogotá-Suba-Guaymaral-Lagos de Torca-San Simón San Sebastián',
  'El Poblado, Medellín',
  'Cajicá',
  'Barranquilla',
  'Cedritos',
  'norte',
  'Armenia',
  'Villacolombia',
  'Centro, Armenia',
  'Hacienda San Simón',
];

for (const t of tests) {
  const r = validarZona(t);
  const status = r.isValid ? '✅' : '❌';
  const detail = r.isValid ? `${r.barrioCanonico} / ${r.localidad}` : r.message;
  console.log(`${status} "${t}" → ${detail}`);
}
