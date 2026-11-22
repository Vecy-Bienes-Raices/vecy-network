-- Migración Aditiva 0014: Arquitectura SaaS Multi-Tenant, Planes COP ($0 a <= $200.000/mes), Wompi Billing y RBAC
-- VECY Network v34.36 (PASO 2)

-- 1. Extensiones aditivas en tablas existentes
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan_code" varchar(50) NOT NULL DEFAULT 'free';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_status" varchar(30) NOT NULL DEFAULT 'active';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_agency_id" integer;

ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "agency_id" integer;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "republish_to_vecy_store" boolean NOT NULL DEFAULT true;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "visibility_scope" varchar(30) NOT NULL DEFAULT 'public_and_agent';
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "source_portal" varchar(80);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "raw_import_payload" jsonb;

CREATE INDEX IF NOT EXISTS "idx_properties_agency_id" ON "properties" ("agency_id");
CREATE INDEX IF NOT EXISTS "idx_properties_visibility_scope" ON "properties" ("visibility_scope");

ALTER TABLE "requirements" ADD COLUMN IF NOT EXISTS "agency_id" integer;
ALTER TABLE "requirements" ADD COLUMN IF NOT EXISTS "publish_to_req_store" boolean NOT NULL DEFAULT true;
ALTER TABLE "requirements" ADD COLUMN IF NOT EXISTS "anonymized_public_summary" text;

CREATE INDEX IF NOT EXISTS "idx_requirements_agency_id" ON "requirements" ("agency_id");

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "agency_id" integer;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "assigned_agent_id" integer REFERENCES "users"("id");
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "requirement_id" integer REFERENCES "requirements"("id");

-- 2. Tabla de planes SaaS (COP mensual entre $0 y <= $200.000 COP)
CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" serial PRIMARY KEY,
  "code" varchar(50) NOT NULL UNIQUE,
  "name" varchar(120) NOT NULL,
  "description" text,
  "monthly_price_cop" integer NOT NULL DEFAULT 0,
  "annual_price_cop" integer NOT NULL DEFAULT 0,
  "max_active_properties" integer NOT NULL DEFAULT 5,
  "max_active_requirements" integer NOT NULL DEFAULT 10,
  "max_url_imports_per_month" integer NOT NULL DEFAULT 3,
  "max_team_seats" integer NOT NULL DEFAULT 1,
  "custom_domain_enabled" boolean NOT NULL DEFAULT false,
  "private_jania_enabled" boolean NOT NULL DEFAULT false,
  "email_campaigns_monthly_quota" integer NOT NULL DEFAULT 0,
  "auto_republish_store" boolean NOT NULL DEFAULT true,
  "features_json" jsonb,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- 3. Inmobiliarias / Agencias Marca Blanca
CREATE TABLE IF NOT EXISTS "agencies" (
  "id" serial PRIMARY KEY,
  "owner_user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "slug" varchar(100) NOT NULL UNIQUE,
  "brand_name" varchar(200) NOT NULL,
  "tagline" text,
  "logo_url" text,
  "primary_color" varchar(20) NOT NULL DEFAULT '#D4AF37',
  "secondary_color" varchar(20) NOT NULL DEFAULT '#0A0A0A',
  "custom_domain" varchar(255) UNIQUE,
  "whatsapp_business_phone" varchar(30),
  "contact_email" varchar(320),
  "city" varchar(100) DEFAULT 'Bogotá, D.C.',
  "plan_code" varchar(50) NOT NULL DEFAULT 'free',
  "republish_by_default" boolean NOT NULL DEFAULT true,
  "theme_config" jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_agencies_owner" ON "agencies" ("owner_user_id");

-- 4. Miembros por agencia
CREATE TABLE IF NOT EXISTS "agency_members" (
  "id" serial PRIMARY KEY,
  "agency_id" integer NOT NULL REFERENCES "agencies"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "member_role" varchar(40) NOT NULL DEFAULT 'agent',
  "is_active" boolean NOT NULL DEFAULT true,
  "invited_at" timestamp NOT NULL DEFAULT now(),
  "joined_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_agency_members_agency_user" ON "agency_members" ("agency_id", "user_id");

-- 5. Suscripciones de usuario
CREATE TABLE IF NOT EXISTS "user_subscriptions" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "agency_id" integer REFERENCES "agencies"("id") ON DELETE SET NULL,
  "plan_code" varchar(50) NOT NULL,
  "status" varchar(30) NOT NULL DEFAULT 'active',
  "billing_cycle" varchar(20) NOT NULL DEFAULT 'monthly',
  "price_cop" integer NOT NULL DEFAULT 0,
  "provider" varchar(40) NOT NULL DEFAULT 'wompi',
  "provider_subscription_id" varchar(160),
  "current_period_start" timestamp NOT NULL DEFAULT now(),
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_user_id" ON "user_subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_status" ON "user_subscriptions" ("status");

-- 6. Transacciones de pago Wompi (COP en centavos)
CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subscription_id" integer REFERENCES "user_subscriptions"("id") ON DELETE SET NULL,
  "plan_code" varchar(50) NOT NULL,
  "provider" varchar(40) NOT NULL DEFAULT 'wompi',
  "reference" varchar(120) NOT NULL UNIQUE,
  "provider_transaction_id" varchar(160),
  "amount_in_cents" bigint NOT NULL,
  "currency" varchar(10) NOT NULL DEFAULT 'COP',
  "status" varchar(30) NOT NULL DEFAULT 'PENDING',
  "payment_method_type" varchar(60),
  "integrity_signature" varchar(128),
  "raw_webhook_payload" jsonb,
  "paid_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_payment_transactions_user_id" ON "payment_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_status" ON "payment_transactions" ("status");

-- 7. Cuotas mensuales de uso por usuario
CREATE TABLE IF NOT EXISTS "usage_quotas" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "period_key" varchar(20) NOT NULL,
  "url_imports_used" integer NOT NULL DEFAULT 0,
  "email_campaigns_used" integer NOT NULL DEFAULT 0,
  "private_jania_messages_used" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_usage_quotas_user_period" ON "usage_quotas" ("user_id", "period_key");

-- 8. Seed idempotente de los 4 planes SaaS ($0 COP a <= $200.000 COP/mes)
INSERT INTO "subscription_plans" (
  "code", "name", "description",
  "monthly_price_cop", "annual_price_cop",
  "max_active_properties", "max_active_requirements", "max_url_imports_per_month",
  "max_team_seats", "custom_domain_enabled", "private_jania_enabled",
  "email_campaigns_monthly_quota", "auto_republish_store",
  "features_json", "sort_order", "is_active"
) VALUES
(
  'free',
  'Vecy Semilla (Gratis)',
  'Publica ofertas y requerimientos sin costo en VECY TIENDA y conecta con colegas en la red colaborativa 50/50.',
  0, 0,
  5, 10, 3, 1,
  false, false, 0, true,
  '["Hasta 5 inmuebles activos","Hasta 10 requerimientos en Tienda de Demandas","3 importaciones inteligentes por URL/mes","Republicación automática en VECY TIENDA","Matches automáticos >= 85%"]'::jsonb,
  1, true
),
(
  'agente_pro',
  'Vecy Agente Pro',
  'Vitrina marca blanca en <tu-marca>.vecygroup.com, CRM inmobiliario e importador inteligente ampliado.',
  69900, 699000,
  40, 50, 30, 1,
  true, false, 100, true,
  '["Hasta 40 inmuebles activos y 50 requerimientos","Portal web marca blanca en <slug>.vecygroup.com","30 importaciones por URL/mes (Wasi, Habi, Fincaraíz, Metrocuadrado, Ciencuadras)","Republicación automática bidireccional en VECY TIENDA","Hasta 100 correos CRM/mes con seguimiento de leads"]'::jsonb,
  2, true
),
(
  'inmobiliaria_growth',
  'Vecy Inmobiliaria Growth',
  'Inventario ilimitado para tu equipo, dominio personalizado, CRM avanzado y Agente JanIA privado.',
  129900, 1299000,
  -1, -1, 150, 5,
  true, true, 500, true,
  '["Inmuebles y requerimientos ilimitados","Subdominio vecygroup.com o dominio propio","Hasta 5 asesores con RBAC multi-tenant","150 importaciones por URL/mes","Agente JanIA privado para atención y filtrado de tus clientes","Hasta 500 correos CRM/mes automatizados con IA"]'::jsonb,
  3, true
),
(
  'elite_ia',
  'Vecy Élite IA',
  'Máxima escala con importación por URL ilimitada, 15 asesores, JanIA privada 24/7 y campañas masivas IA.',
  189900, 1899000,
  -1, -1, -1, 15,
  true, true, 1500, true,
  '["Todo ilimitado: inmuebles, requerimientos e importaciones por URL","Hasta 15 asientos de equipo con roles owner/admin/agent","Agente JanIA privada dedicada 24/7 en tu portal y WhatsApp","Hasta 1.500 correos CRM automatizados con IA al mes","Prioridad alta en Mesa de Coincidencias >= 85% y soporte preferencial"]'::jsonb,
  4, true
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "monthly_price_cop" = EXCLUDED."monthly_price_cop",
  "annual_price_cop" = EXCLUDED."annual_price_cop",
  "max_active_properties" = EXCLUDED."max_active_properties",
  "max_active_requirements" = EXCLUDED."max_active_requirements",
  "max_url_imports_per_month" = EXCLUDED."max_url_imports_per_month",
  "max_team_seats" = EXCLUDED."max_team_seats",
  "custom_domain_enabled" = EXCLUDED."custom_domain_enabled",
  "private_jania_enabled" = EXCLUDED."private_jania_enabled",
  "email_campaigns_monthly_quota" = EXCLUDED."email_campaigns_monthly_quota",
  "auto_republish_store" = EXCLUDED."auto_republish_store",
  "features_json" = EXCLUDED."features_json",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = now();

