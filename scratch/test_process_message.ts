import 'dotenv/config';
import { processWhatsAppMessage } from "../server/_core/janIA";

async function test(text: string, userId: string, userName: string) {
  console.log(`\n=================== TESTING MESSAGE ===================`);
  console.log(`Text: ${text}`);
  console.log(`User: ${userName} (${userId})`);
  
  try {
    const result = await processWhatsAppMessage(text, userId, userName);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.error("Error processing:", e.message || e);
  }
}

async function main() {
  const userId = '122393699852400@c.us';
  const userName = 'MM Finca Raíz';

  // 1. Jamundí
  await test(
    `🔊💯✅🆘✅ JAMUNDÍ COLOMBIA 🇨🇴 \n✅💯🔊🆘👀👁️✅💯 OFREZCO PARA LA VENTA ( LO TENGO DIRECTO CON EL PROPIETARIO , EXCELENTE UBICACIÓN Y APTO )\nVALOR 150 MILLONES NEGOCIABLES \nCONJUNTO RESIDENCIAL JARDINES DE PANGOLA \nÁREA 60 MTS \nNIVEL 4 ( SIN ASCENSOR )\n3 HABITACIONES \n2 BAÑOS \nSAL COMEDOR \nBALCÓN \nZONA DE OFICIOS \nPARQUEADERO PROPIO DESCUBIERTO \nADMINISTRACIÓN $160 MIL \nMM FINCA RAÍZ \n+ INF VIA WPP \n+573053336871`,
    userId,
    userName
  );

  // 2. Cartagena
  await test(
    `🔊🆘✅ CARTAGENA BOLIVAR COLOMBIA 🇨🇴 \n✅🆘🔊🟡🔵🔴🟢 OFREZCO PARA LA VENTA ( LO TENGO DIRECTO) APARTAMENTO DE LUJO EN ZONA NORTE CONJUNTO LUNA DEL MAR \nVALOR $490 MILLONES NEGOCIABLES \nÁREA 98 MTS2\nPISO 12\n3 HABITACIONES \n3 BAÑOS \nSALA COMEDOR \nBALCÓN VISTA A LA CIÉNAGA \nCOCINA INTEGRAL \nZONA DE LABORES \n2 PARQUEADEROS CUBIERTOS EN LÍNEA \nDEPÓSITO \nMM FINCA RAÍZ \n+ INF VIA WPP \n+573053336871`,
    userId,
    userName
  );

  // 3. Calarcá
  await test(
    `🆘✅📢🔊✅ CALARCA QUINDÍO COLOMBIA 🇨🇴 \n✅🆘🔊📢🆘✅ OFREZCO ( LA TENGO DIRECTO)PARA LA VENTA EN UNO DE LOS MUNICIPIOS MAS CERCANOS Y TURÍSTICOS DEL QUINDÍO CASA DE TRES NIVELES EN CONJUNTO CERRADO CON PISCINA \nVALOR : $ 430 MILLONES NEGOCIABLES \nCONJUNTO RESIDENCIAL VILLA PAULA \nÁREA: 140 MTS2 \n4 HABITACIONES \n4 BAÑOS \nCOCINA INTEGRAL \nPATIO \nESTUDIO \nPARQUEADERO CUBIERTO \nMM FINCA RAÍZ \n+ INF VIA WPP \n+573053336871`,
    userId,
    userName
  );

  process.exit(0);
}

main();
