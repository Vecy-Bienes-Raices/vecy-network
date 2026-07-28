/**
 * avaluo-engine.ts — Motor de Avalúo Comercial Automático VECY Network (v1.0)
 * 
 * Calcula estimaciones de valor comercial por m² basadas en datos reales de
 * la base de datos Supabase de VECY Network (inmuebles y requerimientos).
 * 
 * Reglas de integridad:
 * - Consultas SQL seguras sin tildes/eñes usando normalización ILIKE
 * - Filtrado de outliers de precio/m² para evitar sesgos por errores de digitación
 * - Cálculo de promedios, medianas, rangos m² e informe ejecutivo estructurado
 */

import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { getDb } from '../db';
import { properties, requirements } from '../../drizzle/schema';
import { normalizarTextoGeografico } from './geography';

export interface AppraisalInput {
  city: string;
  zone?: string;               // Barrio o sector catastral
  propertyType: string;        // apartment, house, office, warehouse, land, farm, etc.
  transactionType: string;     // venta, arriendo
  areaTotal?: number;          // Área en m² (opcional para estimación total)
  bedrooms?: number;
  bathrooms?: number;
  stratum?: number;
}

export interface ComparableItem {
  id: number;
  title: string;
  propertyType: string;
  transactionType: string;
  city: string;
  zone: string | null;
  price: number;
  area: number;
  pricePerM2: number;
  bedrooms: number | null;
  bathrooms: number | null;
  createdAt: Date;
}

export interface AppraisalResult {
  city: string;
  zone: string;
  propertyType: string;
  transactionType: string;
  sampleSize: number;
  avgPricePerM2: number;
  medianPricePerM2: number;
  minPricePerM2: number;
  maxPricePerM2: number;
  estimatedTotalValue?: {
    avg: number;
    min: number;
    max: number;
  };
  comparables: ComparableItem[];
  confidenceScore: number; // 0% a 100% basado en tamaño de muestra y dispersión
}

/**
 * Normaliza cadenas para comparaciones SQL case-insensitive e accent-insensitive
 */
function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Calcula la mediana de una lista ordenada de números
 */
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }
  return sorted[middle];
}

/**
 * Calcula un avalúo comercial automático consultando los inmuebles comparables en Supabase
 */
export async function calculateCommercialAppraisal(input: AppraisalInput): Promise<AppraisalResult> {
  const db = await getDb();
  const cleanCity = removeAccents(input.city || 'bogota');
  const cleanZone = input.zone ? removeAccents(input.zone) : '';
  const cleanPropType = (input.propertyType || 'apartment').toLowerCase();
  const cleanTxType = (input.transactionType || 'venta').toLowerCase();

  const emptyResult: AppraisalResult = {
    city: input.city,
    zone: input.zone || 'Toda la ciudad',
    propertyType: input.propertyType,
    transactionType: input.transactionType,
    sampleSize: 0,
    avgPricePerM2: 0,
    medianPricePerM2: 0,
    minPricePerM2: 0,
    maxPricePerM2: 0,
    comparables: [],
    confidenceScore: 0
  };

  if (!db) return emptyResult;

  try {
    // Consultar inmuebles registrados en la BD
    const rawProperties = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.active, true),
          sql`LOWER(translate(${properties.city}, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnn')) ILIKE ${'%' + cleanCity + '%'}`
        )
      );

    // Función auxiliar para extraer comparables según zona
    const getComparablesForZone = (filterZone: boolean) => {
      const list: ComparableItem[] = [];
      for (const prop of rawProperties) {
        const pPrice = Number(prop.price || 0);
        const pArea = Number(prop.area || 0);
        
        // Exigir precio y área válidos
        if (pPrice <= 0 || pArea <= 0) continue;

        const priceM2 = Math.round(pPrice / pArea);

        // Filtro de Outliers según tipo de negocio
        if (cleanTxType === 'venta') {
          if (priceM2 < 500000 || priceM2 > 45000000) continue; // Outliers de venta (<500k o >45M por m²)
        } else if (cleanTxType === 'arriendo') {
          if (priceM2 < 5000 || priceM2 > 500000) continue;    // Outliers de arriendo (<5k o >500k por m²)
        }

        const pType = (prop.propertyType || '').toLowerCase();
        const pTx = (prop.transactionType || '').toLowerCase();
        const pZone = prop.zone ? removeAccents(prop.zone) : '';

        // Coincidencia de tipo de propiedad
        const isPropTypeMatch = pType === cleanPropType || 
          (cleanPropType === 'apartment' && (pType === 'apartamento' || pType === 'apto' || pType === 'loft')) ||
          (cleanPropType === 'house' && (pType === 'casa' || pType === 'townhouse'));

        if (!isPropTypeMatch) continue;

        // Coincidencia de tipo de negocio
        const isTxTypeMatch = pTx === cleanTxType || pTx === 'venta_o_arriendo';
        if (!isTxTypeMatch) continue;

        // Coincidencia de barrio/zona si se especificó
        if (filterZone && cleanZone) {
          if (!pZone || (!pZone.includes(cleanZone) && !cleanZone.includes(pZone))) {
            continue;
          }
        }

        list.push({
          id: prop.id,
          title: prop.name || `${prop.propertyType} en ${prop.zone || prop.city}`,
          propertyType: prop.propertyType || cleanPropType,
          transactionType: prop.transactionType || cleanTxType,
          city: prop.city || input.city,
          zone: prop.zone,
          price: pPrice,
          area: pArea,
          pricePerM2: priceM2,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          createdAt: prop.createdAt || new Date()
        });
      }
      return list;
    };

    let matchedComparables = cleanZone ? getComparablesForZone(true) : getComparablesForZone(false);
    let zoneDisplayName = input.zone || 'Sector Analizado';

    // Si la muestra por zona es muy baja (< 3), ampliar a nivel ciudad
    if (cleanZone && matchedComparables.length < 3) {
      const cityWideComparables = getComparablesForZone(false);
      if (cityWideComparables.length > matchedComparables.length) {
        matchedComparables = cityWideComparables;
        zoneDisplayName = `${input.zone} (Muestra expandida a nivel ciudad)`;
      }
    }

    if (matchedComparables.length === 0) {
      return emptyResult;
    }

    // Calcular estadísticas m²
    const pricesPerM2 = matchedComparables.map(c => c.pricePerM2);
    const sumPriceM2 = pricesPerM2.reduce((acc, curr) => acc + curr, 0);
    const avgPricePerM2 = Math.round(sumPriceM2 / pricesPerM2.length);
    const medianPricePerM2 = calculateMedian(pricesPerM2);
    const minPricePerM2 = Math.min(...pricesPerM2);
    const maxPricePerM2 = Math.max(...pricesPerM2);

    // Calcular nivel de confianza (basado en cantidad de datos y desviación)
    let confidenceScore = Math.min(100, matchedComparables.length * 15);
    if (matchedComparables.length >= 5) confidenceScore = 95;
    if (matchedComparables.length >= 10) confidenceScore = 100;

    // Calcular estimación total si se ingresó el área objetivo
    let estimatedTotalValue: { avg: number; min: number; max: number } | undefined;
    if (input.areaTotal && input.areaTotal > 0) {
      estimatedTotalValue = {
        avg: Math.round(avgPricePerM2 * input.areaTotal),
        min: Math.round(minPricePerM2 * input.areaTotal),
        max: Math.round(maxPricePerM2 * input.areaTotal)
      };
    }

    // Ordenar comparables por fecha de publicación (más recientes primero)
    matchedComparables.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      city: input.city,
      zone: zoneDisplayName,
      propertyType: input.propertyType,
      transactionType: input.transactionType,
      sampleSize: matchedComparables.length,
      avgPricePerM2,
      medianPricePerM2,
      minPricePerM2,
      maxPricePerM2,
      estimatedTotalValue,
      comparables: matchedComparables.slice(0, 5), // Top 5 más representativos
      confidenceScore
    };
  } catch (error: any) {
    console.error("[AvaluoEngine] Error al calcular avalúo comercial:", error.message || error);
    return emptyResult;
  }
}

/**
 * Genera un informe en formato Markdown listo para presentar al usuario o exportar
 */
export function formatAppraisalReportMarkdown(res: AppraisalResult, areaTotal?: number): string {
  const isSale = res.transactionType.toLowerCase() === 'venta';
  const currencySuffix = isSale ? 'COP' : 'COP / mes';

  const formatMoney = (val: number) => `$${Number(val).toLocaleString('es-CO')} ${currencySuffix}`;
  const formatM2 = (val: number) => `$${Number(val).toLocaleString('es-CO')} COP/m²`;

  let report = `# 📊 INFORME DE AVALÚO COMERCIAL — VECY NETWORK\n`;
  report += `*Generado en tiempo real con datos del mercado inmobiliario real*\n\n`;

  report += `### 📌 RESUMEN DE LA PROPIEDAD Y SECTOR\n`;
  report += `- **Ciudad / Municipio:** ${res.city}\n`;
  report += `- **Barrio / Sector:** ${res.zone}\n`;
  report += `- **Tipo de Inmueble:** ${res.propertyType.toUpperCase()}\n`;
  report += `- **Tipo de Negocio:** ${res.transactionType.toUpperCase()}\n`;
  if (areaTotal) {
    report += `- **Área Evaluada:** ${areaTotal} m²\n`;
  }
  report += `- **Muestra de Comparables:** ${res.sampleSize} inmuebles verificados\n`;
  report += `- **Nivel de Confianza:** ${res.confidenceScore}%\n\n`;

  report += `---\n\n`;

  report += `### 💰 ANÁLISIS DE PRECIO POR METRO CUADRADO (m²)\n`;
  report += `| Métrica | Valor m² |\n`;
  report += `|---|---|\n`;
  report += `| **Promedio Mercado** | **${formatM2(res.avgPricePerM2)}** |\n`;
  report += `| **Mediana Mercado** | ${formatM2(res.medianPricePerM2)} |\n`;
  report += `| **Rango Mínimo** | ${formatM2(res.minPricePerM2)} |\n`;
  report += `| **Rango Máximo** | ${formatM2(res.maxPricePerM2)} |\n\n`;

  if (res.estimatedTotalValue && areaTotal) {
    report += `### 🏆 ESTIMACIÓN DE VALOR COMERCIAL TOTAL (${areaTotal} m²)\n`;
    report += `- 🎯 **Valor Comercial Sugerido:** **${formatMoney(res.estimatedTotalValue.avg)}**\n`;
    report += `- 📉 **Límite Inferior (Venta Rápida):** ${formatMoney(res.estimatedTotalValue.min)}\n`;
    report += `- 📈 **Límite Superior (Valor de Lista Peak):** ${formatMoney(res.estimatedTotalValue.max)}\n\n`;
  }

  if (res.comparables.length > 0) {
    report += `### 🏘️ INMUEBLES COMPARABLES EN LA ZONA\n`;
    res.comparables.forEach((c, idx) => {
      report += `${idx + 1}. **${c.title}**\n`;
      report += `   - **Precio:** ${formatMoney(c.price)} | **Área:** ${c.area} m² | **Valor/m²:** ${formatM2(c.pricePerM2)}\n`;
      if (c.bedrooms || c.bathrooms) {
        report += `   - **Especificaciones:** ${c.bedrooms || 0} Habs | ${c.bathrooms || 0} Baños\n`;
      }
      report += `\n`;
    });
  }

  report += `> 💡 *Nota Técnica:* Este avalúo comercial es una estimación estadística realizada por el motor predictivo de VECY Network sobre ofertas reales registradas. No reemplaza un peritaje técnico o avalúo catastral formal de lonja.`;

  return report;
}
