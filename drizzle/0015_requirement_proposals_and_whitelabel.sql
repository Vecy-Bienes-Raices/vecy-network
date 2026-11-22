-- Migración Aditiva 0015: Postulaciones a Requerimientos (Tienda de Demandas) y Soporte Portal Marca Blanca
-- VECY Network v34.37 (PASO 3)

CREATE TABLE IF NOT EXISTS "requirement_proposals" (
  "id" serial PRIMARY KEY,
  "requirement_id" integer NOT NULL REFERENCES "requirements"("id") ON DELETE CASCADE,
  "property_id" integer NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "proposing_user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "match_score" decimal(5,2),
  "message" text,
  "status" varchar(30) NOT NULL DEFAULT 'pending_signature',
  "agreement_required" boolean NOT NULL DEFAULT true,
  "signature_token" varchar(120),
  "agreement_signed_at" timestamp,
  "contact_unlocked" boolean NOT NULL DEFAULT false,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_req_proposals_req_id" ON "requirement_proposals" ("requirement_id");
CREATE INDEX IF NOT EXISTS "idx_req_proposals_prop_id" ON "requirement_proposals" ("property_id");
CREATE INDEX IF NOT EXISTS "idx_req_proposals_user_id" ON "requirement_proposals" ("proposing_user_id");
CREATE INDEX IF NOT EXISTS "idx_req_proposals_sig_token" ON "requirement_proposals" ("signature_token");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_req_proposals_req_prop_user"
  ON "requirement_proposals" ("requirement_id", "property_id", "proposing_user_id");

