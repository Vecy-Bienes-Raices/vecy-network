import "dotenv/config";
import { getDb } from "./server/db";
import { properties } from "./drizzle/schema";

const newProperties = [
  {
    name: 'Apartamento para Estrenar en Santa Bárbara',
    propertyType: 'apartment' as const,
    price: "1170000000",
    location: 'Bogotá, Santa Bárbara Oriental',
    zone: 'Santa Bárbara',
    bedrooms: 3,
    bathrooms: 3,
    areaTotal: "116",
    garages: 2,
    yearBuilt: 2024,
    featured: true,
    available: true,
    images: ['https://ap-sta-barbara-or-bog.netlify.app/assets/portada_video_fotos_redes_enlaces.png', 'https://ap-sta-barbara-or-bog.netlify.app/assets/1.jpg', 'https://ap-sta-barbara-or-bog.netlify.app/assets/2.jpg'],
    description: 'Impresionante apartamento de 116m², 3 habitaciones, 3 baños, cocina abierta, balcón y la mejor vista a los cerros orientales en Santa Bárbara. ¡Una oportunidad única!',
    amenities: ["Vista a los Cerros", "Balcón", "Cocina abierta", "100% eléctrico"]
  },
  {
    name: 'Apartamento en Salitre',
    propertyType: 'apartment' as const,
    price: "778000000",
    location: 'Bogotá, Salitre',
    zone: 'Salitre',
    bedrooms: 3,
    bathrooms: 3,
    areaTotal: "121",
    garages: 2,
    yearBuilt: 2012,
    featured: true,
    available: true,
    images: ['https://ap-salitre1-bogota.netlify.app/assets/1.jpeg', 'https://ap-salitre1-bogota.netlify.app/assets/2.jpeg', 'https://ap-salitre1-bogota.netlify.app/assets/3.jpeg'],
    description: 'Oportunidad de inversión: Apartamento de 121m² en Salitre, Bogotá. 3 habitaciones, 3 baños, chimenea, 2 parqueaderos. Alta seguridad, accesibilidad, zonas verdes y cascada.',
    amenities: ["Zonas Verdes", "Cascada", "Vigilancia 24/7", "Gimnasio", "Cancha Múltiple", "Salones Comunales", "Chimenea a Gas", "Estudio", "Baño Social"]
  }
];

async function seedNew() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection");
    return;
  }
  
  console.log("Seeding 2 new properties...");
  for (const prop of newProperties) {
    await db.insert(properties).values(prop);
  }
  console.log("Seeding complete!");
  process.exit(0);
}

seedNew().catch(console.error);
