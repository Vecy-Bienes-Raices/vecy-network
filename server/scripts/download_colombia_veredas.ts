import fs from "fs";
import path from "path";

/**
 * Script automatizado con escritura en Streaming para descargar las 33.435 Veredas Oficiales
 * de Colombia del IGAC directamente al archivo server/data/colombia_veredas.geojson
 */
async function downloadColombiaVeredas() {
  console.log("🚀 Iniciando descarga oficial de Veredas de Colombia (IGAC) con Streaming...");
  
  const baseUrl = "https://services.arcgis.com/lq8KepGWoqMa93pJ/arcgis/rest/services/Vereda/FeatureServer/0/query";
  const batchSize = 1000;
  let offset = 0;
  
  // 1. Obtener conteo total
  const countUrl = `${baseUrl}?where=1%3D1&returnCountOnly=true&f=json`;
  const countRes = await fetch(countUrl);
  const countData = await countRes.json();
  const totalCount = countData.count || 33435;
  console.log(`📊 Total de veredas oficiales a descargar: ${totalCount}`);

  const outputPath = path.join(process.cwd(), "server/data/colombia_veredas.geojson");
  const writeStream = fs.createWriteStream(outputPath, { encoding: "utf8" });

  writeStream.write('{"type":"FeatureCollection","crs":{"type":"name","properties":{"name":"EPSG:4326"}},"features":[\n');

  let totalWritten = 0;
  let isFirst = true;

  while (offset < totalCount) {
    const currentBatchNum = Math.floor(offset / batchSize) + 1;
    const totalBatches = Math.ceil(totalCount / batchSize);
    console.log(`📥 Descargando lote ${currentBatchNum} de ${totalBatches} (registros ${offset + 1} a ${Math.min(offset + batchSize, totalCount)})...`);
    
    const queryUrl = `${baseUrl}?where=1%3D1&resultOffset=${offset}&resultRecordCount=${batchSize}&outFields=OBJECTID,DPTOMPIO,CODIGO_VER,NOM_DEP,NOMB_MPIO,NOMBRE_VER,SEUDONIMOS,AREA_HA&f=geojson`;

    let data: any = null;
    for (let intento = 1; intento <= 3; intento++) {
      try {
        const res = await fetch(queryUrl);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
        data = await res.json();
        if (data.features && Array.isArray(data.features)) break;
      } catch (err) {
        console.warn(`   ⚠️ Intento ${intento} falló para lote ${currentBatchNum}. Reintentando en 2s...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (data?.features && Array.isArray(data.features)) {
      for (const feature of data.features) {
        if (!isFirst) {
          writeStream.write(",\n");
        } else {
          isFirst = false;
        }
        writeStream.write(JSON.stringify(feature));
        totalWritten++;
      }
      console.log(`   ✅ Lote ${currentBatchNum} guardado en disco (${data.features.length} veredas. Total: ${totalWritten})`);
    } else {
      console.error(`❌ Error irrecuperable en lote ${currentBatchNum}`);
    }

    offset += batchSize;
  }

  writeStream.write('\n]}\n');
  
  await new Promise<void>((resolve, reject) => {
    writeStream.end(() => {
      resolve();
    });
    writeStream.on("error", reject);
  });

  const stats = fs.statSync(outputPath);
  console.log(`\n🎉 Descarga e indexación completada con éxito!`);
  console.log(`💾 Archivo guardado en: ${outputPath}`);
  console.log(`📦 Tamaño final: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`🇨🇴 Total veredas consolidadas: ${totalWritten} de 32 departamentos.`);
}

downloadColombiaVeredas().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
