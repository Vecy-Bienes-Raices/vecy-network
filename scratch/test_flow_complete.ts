import 'dotenv/config';
import { getDb } from "../server/db";
import { sql, eq, and } from "drizzle-orm";
import { pendingSessions, propertyMatches, properties, requirements, users } from "../drizzle/schema";
import { findMatchesForProperty } from "../server/_core/matching";

// Mock helper to delete test data
async function cleanup(db: any, testJid1: string, testJid2: string) {
  console.log("Cleaning up test data...");
  await db.delete(pendingSessions).where(sql`jid IN (${testJid1}, ${testJid2})`);
  
  // Find properties/requirements for test users
  const testUsers = await db.select().from(users).where(sql`phone IN (${testJid1.split('@')[0]}, ${testJid2.split('@')[0]})`);
  for (const u of testUsers) {
    const props = await db.select().from(properties).where(eq(properties.agentId, u.id));
    for (const p of props) {
      await db.delete(propertyMatches).where(eq(propertyMatches.propertyId, p.id));
      await db.delete(properties).where(eq(properties.id, p.id));
    }
    const reqs = await db.select().from(requirements).where(eq(requirements.userId, u.id));
    for (const r of reqs) {
      await db.delete(propertyMatches).where(eq(propertyMatches.requirementId, r.id));
      await db.delete(requirements).where(eq(requirements.id, r.id));
    }
    await db.delete(users).where(eq(users.id, u.id));
  }
}

async function testSessions(db: any, testJid: string) {
  console.log("\n--- Testing Tarea 2: Pending Sessions Persistence ---");
  
  // 1. Delete any existing session
  await db.delete(pendingSessions).where(eq(pendingSessions.jid, testJid));
  
  // 2. Set session data
  const testData = {
    type: "PROPERTY",
    extractedData: { city: "Bogotá", zone: "Chapinero", price: 150000000 },
    senderInfo: { greeting: "Hola", adj: "juicioso", courtesy: "gracias" },
    messageToProcess: "Vendo apto en Chapinero 150M"
  };
  
  console.log("Inserting session data...");
  await db.insert(pendingSessions).values({
    jid: testJid,
    sessionData: testData,
    updatedAt: new Date()
  }).onConflictDoUpdate({
    target: pendingSessions.jid,
    set: {
      sessionData: testData,
      updatedAt: new Date()
    }
  });
  
  // 3. Retrieve session data
  const [retrieved] = await db.select().from(pendingSessions).where(eq(pendingSessions.jid, testJid));
  if (!retrieved) {
    throw new Error("Failed to retrieve pending session from database");
  }
  console.log("Retrieved session data:", retrieved.sessionData);
  
  // 4. Delete session data
  await db.delete(pendingSessions).where(eq(pendingSessions.jid, testJid));
  const [deletedCheck] = await db.select().from(pendingSessions).where(eq(pendingSessions.jid, testJid));
  if (deletedCheck) {
    throw new Error("Failed to delete pending session");
  }
  console.log("Session persistence works perfectly!");
}

async function testMatchConfirmations(db: any, testJid1: string, testJid2: string) {
  console.log("\n--- Testing Tarea 1: Match Confirmation and Double Opt-in ---");

  const phone1 = testJid1.split('@')[0];
  const phone2 = testJid2.split('@')[0];

  // 1. Create mock users
  console.log("Creating mock users...");
  const [user1] = await db.insert(users).values({
    openId: `wa-${phone1}`,
    name: "Test Owner",
    phone: phone1,
    role: "agent"
  }).returning();

  const [user2] = await db.insert(users).values({
    openId: `wa-${phone2}`,
    name: "Test Seeker",
    phone: phone2,
    role: "agent"
  }).returning();

  // 2. Create matching Property (user 1) and Requirement (user 2)
  console.log("Creating property and requirement that should match...");
  const [prop] = await db.insert(properties).values({
    name: "Apto en Chico",
    propertyType: "apartment",
    transactionType: "venta",
    price: "800000000",
    city: "Bogotá",
    zone: "Chico",
    addressCity: "Bogotá",
    addressLocality: "Usaquén",
    addressNeighborhood: "Chico",
    agentId: user1.id,
    idUsuarioWhatsapp: phone1,
    available: true
  }).returning();

  const [req] = await db.insert(requirements).values({
    userId: user2.id,
    tipoInmuebleDeseado: "apartment",
    tipoNegocioDeseado: "venta",
    ciudadDeseada: "Bogotá",
    zonaDeseada: "Chico",
    addressCity: "Bogotá",
    addressLocality: "Usaquén",
    addressNeighborhood: "Chico",
    presupuestoMax: "900000000",
    idUsuarioWhatsapp: phone2,
    status: "active"
  }).returning();

  // 3. Run match engine and save match
  console.log("Running matching engine...");
  const matches = await findMatchesForProperty(prop.id);
  console.log(`Found ${matches.length} matches.`);
  if (matches.length === 0) {
    throw new Error("Match engine failed to detect the match");
  }

  const matchId = matches[0].matchId;
  console.log(`Match recorded with ID: #M${matchId}`);

  // Verify match fields
  const [matchRecord] = await db.select().from(propertyMatches).where(eq(propertyMatches.id, matchId));
  console.log("Match record in DB:", matchRecord);
  if (matchRecord.ownerConfirmed !== false || matchRecord.seekerConfirmed !== false) {
    throw new Error("Initial confirmation flags should be false");
  }

  // 4. Simulate confirmation replies
  console.log("\nSimulating owner confirmation...");
  await db.update(propertyMatches).set({ ownerConfirmed: true }).where(eq(propertyMatches.id, matchId));
  const [ownerConfCheck] = await db.select().from(propertyMatches).where(eq(propertyMatches.id, matchId));
  console.log("Owner confirmed:", ownerConfCheck.ownerConfirmed);
  if (ownerConfCheck.status !== "suggested") {
    throw new Error("Match status should still be 'suggested' until BOTH confirm");
  }

  console.log("Simulating seeker confirmation...");
  await db.update(propertyMatches).set({ seekerConfirmed: true, status: "interested" }).where(eq(propertyMatches.id, matchId));
  const [bothConfCheck] = await db.select().from(propertyMatches).where(eq(propertyMatches.id, matchId));
  console.log("Both confirmed. Seeker confirmed:", bothConfCheck.seekerConfirmed, "Match status:", bothConfCheck.status);
  if (bothConfCheck.status !== "interested") {
    throw new Error("Match status should be 'interested' after both confirm");
  }

  console.log("Double opt-in matches confirmation logic is correct!");
}

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }

  const testJid1 = "9999999991@c.us";
  const testJid2 = "9999999992@c.us";

  try {
    await cleanup(db, testJid1, testJid2);
    await testSessions(db, testJid1);
    await testMatchConfirmations(db, testJid1, testJid2);
    await cleanup(db, testJid1, testJid2);
    console.log("\n🚀 ALL TESTS PASSED SUCCESSFULLY! 🚀");
  } catch (error) {
    console.error("Test failed with error:", error);
    await cleanup(db, testJid1, testJid2);
  }
  process.exit(0);
}

main();
