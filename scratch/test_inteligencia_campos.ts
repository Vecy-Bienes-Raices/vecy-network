/**
 * Test Script: Inteligencia de Campos por Tipo de Inmueble
 * Simulates extraction validation and custom questions per property type
 */

import { obtenerCamposRequeridosYPreguntas } from "../server/_core/janIA";
import { evaluarMatch } from "../server/_core/matching";
import { normalizarTextoGeografico } from "../server/_core/geography";

// ─── Colors ─────────────────────────────────────────────────────────────────
const OK = "✅";
const FAIL = "❌";
const SEP = "─".repeat(60);

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`${OK} ${msg}`);
    passed++;
  } else {
    console.error(`${FAIL} ${msg}`);
    failed++;
  }
}

// ─── Test 1: Campos requeridos por tipo ─────────────────────────────────────
console.log(`\n${SEP}`);
console.log("TEST 1: Campos requeridos por tipo de inmueble");
console.log(SEP);

const aptFields = obtenerCamposRequeridosYPreguntas("apartment", false).requiredFields;
assert(aptFields.includes("bedrooms"), "Apartamento incluye habitaciones");
assert(aptFields.includes("interiorExterior"), "Apartamento incluye interiorExterior");
assert(aptFields.includes("floorDetail"), "Apartamento incluye floorDetail");
assert(aptFields.includes("garages"), "Apartamento incluye garajes");

const houseFields = obtenerCamposRequeridosYPreguntas("house", false).requiredFields;
assert(houseFields.includes("bedrooms"), "Casa incluye habitaciones");
assert(!houseFields.includes("interiorExterior"), "Casa NO incluye interiorExterior");
assert(houseFields.includes("floorDetail"), "Casa incluye floorDetail (num pisos)");

const warehouseFields = obtenerCamposRequeridosYPreguntas("warehouse", false).requiredFields;
assert(!warehouseFields.includes("bedrooms"), "Bodega NO incluye habitaciones");
assert(!warehouseFields.includes("interiorExterior"), "Bodega NO incluye interiorExterior");
assert(warehouseFields.includes("floorDetail"), "Bodega incluye floorDetail (altura)");

const landFields = obtenerCamposRequeridosYPreguntas("land", false).requiredFields;
assert(!landFields.includes("bedrooms"), "Lote NO incluye habitaciones");
assert(!landFields.includes("interiorExterior"), "Lote NO incluye interiorExterior");
assert(!landFields.includes("floorDetail"), "Lote NO incluye floorDetail");
assert(!landFields.includes("garages"), "Lote NO incluye garajes");
assert(landFields.includes("areaTotal"), "Lote SÍ incluye área total");

const buildingFields = obtenerCamposRequeridosYPreguntas("building", false).requiredFields;
assert(!buildingFields.includes("bedrooms"), "Edificio NO incluye habitaciones");
assert(!buildingFields.includes("interiorExterior"), "Edificio NO incluye interiorExterior");
assert(buildingFields.includes("floorDetail"), "Edificio incluye floorDetail (total pisos)");

// ─── Test 2: Preguntas personalizadas por tipo ───────────────────────────────
console.log(`\n${SEP}`);
console.log("TEST 2: Preguntas personalizadas de piso/altura");
console.log(SEP);

const aptQs = obtenerCamposRequeridosYPreguntas("apartment", false).fieldQuestions;
assert(aptQs["floorDetail"].includes("piso queda el apartamento"), `Apt: "${aptQs["floorDetail"]}"`);

const houseQs = obtenerCamposRequeridosYPreguntas("house", false).fieldQuestions;
assert(houseQs["floorDetail"].includes("pisos tiene la casa"), `Casa: "${houseQs["floorDetail"]}"`);

const buildingQs = obtenerCamposRequeridosYPreguntas("building", false).fieldQuestions;
assert(buildingQs["floorDetail"].includes("pisos es el edificio"), `Edificio: "${buildingQs["floorDetail"]}"`);

const warehouseQs = obtenerCamposRequeridosYPreguntas("warehouse", false).fieldQuestions;
assert(warehouseQs["floorDetail"].includes("altura libre"), `Bodega: "${warehouseQs["floorDetail"]}"`);

const officeQs = obtenerCamposRequeridosYPreguntas("office", false).fieldQuestions;
assert(officeQs["floorDetail"].includes("piso queda la oficina"), `Oficina: "${officeQs["floorDetail"]}"`);

const farmQs = obtenerCamposRequeridosYPreguntas("farm", false).fieldQuestions;
assert(farmQs["floorDetail"].includes("pisos tiene la casa principal"), `Finca: "${farmQs["floorDetail"]}"`);

// ─── Test 3: Matching con campos N/A ────────────────────────────────────────
console.log(`\n${SEP}`);
console.log("TEST 3: Matching con campos N/A (lote/bodega)");
console.log(SEP);

const zonaCanonica = "Cedritos";

// Bodega: no se deben evaluar habitaciones ni baños ni garajes
const bodegaProp = {
  propertyType: "warehouse",
  city: "Bogotá",
  zone: zonaCanonica,
  addressLocality: "Usaquén",
  bedrooms: null,
  bathrooms: null,
  garages: null,
  price: "500000000",
  floorDetail: "8 metros",
  amenities: { interiorExterior: null }
};

const bodegaReq = {
  tipoInmuebleDeseado: "warehouse",
  ciudadDeseada: "Bogotá",
  zonaDeseada: zonaCanonica,
  addressLocality: "Usaquén",
  habitacionesMin: null,
  banosMin: null,
  parqueaderosMin: null,
  presupuestoMax: "600000000",
  presupuestoMin: "0",
  areaMin: null,
  estratoDeseado: null,
  caracteristicasDeseadas: { interiorExterior: null }
};

assert(evaluarMatch(bodegaReq, bodegaProp), "Bodega con campos N/A correctos → MATCH VÁLIDO");

// Apartamento: bedrooms deben coincidir
const aptPropMatch = {
  propertyType: "apartment",
  city: "Bogotá",
  zone: zonaCanonica,
  addressLocality: "Usaquén",
  bedrooms: 3,
  bathrooms: 2,
  garages: 1,
  price: "500000000",
  floorDetail: "piso 5",
  amenities: { interiorExterior: "exterior" }
};

const aptReqMatch = {
  tipoInmuebleDeseado: "apartment",
  ciudadDeseada: "Bogotá",
  zonaDeseada: zonaCanonica,
  addressLocality: "Usaquén",
  habitacionesMin: 3,
  banosMin: 2,
  parqueaderosMin: 1,
  presupuestoMax: "600000000",
  presupuestoMin: "0",
  areaMin: null,
  estratoDeseado: null,
  caracteristicasDeseadas: { interiorExterior: "exterior" }
};

assert(evaluarMatch(aptReqMatch, aptPropMatch), "Apartamento con todos los campos → MATCH VÁLIDO");

const aptReqNoMatch = { ...aptReqMatch, habitacionesMin: 4 };
assert(!evaluarMatch(aptReqNoMatch, aptPropMatch), "Apartamento habitaciones distintas → NO MATCH");

const aptReqIntExtMismatch = { ...aptReqMatch, caracteristicasDeseadas: { interiorExterior: "interior" } };
assert(!evaluarMatch(aptReqIntExtMismatch, aptPropMatch), "Apartamento interior vs exterior → NO MATCH");

// Lote: sin habitaciones ni baños ni garajes ni interiorExterior
const loteProp = {
  propertyType: "land",
  city: "Bogotá",
  zone: zonaCanonica,
  addressLocality: "Usaquén",
  bedrooms: null,
  bathrooms: null,
  garages: null,
  price: "800000000",
  floorDetail: null,
  areaTotal: "1000",
  amenities: { interiorExterior: null }
};

const loteReq = {
  tipoInmuebleDeseado: "land",
  ciudadDeseada: "Bogotá",
  zonaDeseada: zonaCanonica,
  addressLocality: "Usaquén",
  habitacionesMin: null,
  banosMin: null,
  parqueaderosMin: null,
  presupuestoMax: "1000000000",
  presupuestoMin: "0",
  areaMin: "900",
  estratoDeseado: null,
  caracteristicasDeseadas: { interiorExterior: null }
};

assert(evaluarMatch(loteReq, loteProp), "Lote con campos N/A correctos → MATCH VÁLIDO");

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log(`RESULTADO: ${passed} pasados | ${failed} fallidos`);
console.log(SEP);
if (failed > 0) process.exit(1);
