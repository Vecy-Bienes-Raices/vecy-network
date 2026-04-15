import { getDb } from "./server/db";
import { properties } from "./drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No database connection!");

  console.log("Seeding properties...");

  await db.insert(properties).values([
    {
      name: "Apartamento Cedritos Ubik",
      description: "Apartamento exterior esquinero con diseño moderno y acabados de lujo.",
      price: "560000000",
      pricePerSqm: "8000000",
      location: "Calle 140 # 11-XX (Cedritos)",
      zone: "Cedritos",
      propertyType: "apartment",
      matriculaInmobiliaria: "50N-UBIK-001",
      bedrooms: 2,
      bathrooms: 2,
      garages: 1,
      stratum: 4,
      floor: 5,
      areaSquareMeters: "70",
      areaPrivateSquareMeters: "65",
      yearBuilt: 2020,
      adminFee: "350000",
      commissionPercent: "3",
      sourceRepository: "Apto-cedritos-ubik",
      amenities: ["Balcón", "Cocina semiabierta", "Zona de ropas separada", "Gimnasio", "Coworking", "Terraza BBQ"]
    },
    {
      name: "Apartamento La Calleja",
      description: "Acogedor apartamento rodeado de naturaleza.",
      price: "680000000",
      pricePerSqm: "7150000",
      location: "La Calleja",
      zone: "La Calleja",
      propertyType: "apartment",
      matriculaInmobiliaria: "50N-CALLEJA-002",
      bedrooms: 3,
      bathrooms: 3,
      garages: 2,
      stratum: 5,
      floor: 3,
      areaSquareMeters: "95",
      areaPrivateSquareMeters: "89",
      yearBuilt: 2018,
      adminFee: "450000",
      commissionPercent: "3",
      sourceRepository: "Apto-la-calleja",
      amenities: ["Chimenea", "Balcón", "Parqueadero visitantes", "Salón comunal"]
    }
  ]).onConflictDoNothing();

  console.log("Seeding completed.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
