import "dotenv/config";
import { validarZona } from "./_core/geography";

async function run() {
  console.log("⚡ Probando validarZona con el nuevo resoluidor de cuadrantes espaciales IDECA...");

  const res1 = await validarZona("entre la calle 140 y la 152, entre la autopista y la carrera 15", "Bogotá");
  console.log("\n1. RESULTADO VALIDAR ZONA (Calle 140 a 152):", res1);

  const res2 = await validarZona("entre la 106 y la 127 arriba de la autopista", "Bogotá");
  console.log("\n2. RESULTADO VALIDAR ZONA (Calle 106 a 127):", res2);
}

run();
