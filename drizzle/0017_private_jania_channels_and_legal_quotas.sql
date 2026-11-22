-- Migración Aditiva 0017: Agente JanIA Privado por Suscripción, WhatsApp Cloud API BYO-Number y Suite Legal SaaS
-- VECY Network v34.41 (PASO 5)

-- 1. Configuración de canales privados de JanIA (Widget Web y WhatsApp Cloud API BYO-Number)
CREATE TABLE IF NOT EXISTS "agent_jania_channels" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "agency_id" integer REFERENCES "agencies"("id") ON DELETE SET NULL,
  "channel_type" varchar(30) NOT NULL DEFAULT 'web_widget',
  "is_active" boolean NOT NULL DEFAULT false,
  "assistant_name" varchar(120) NOT NULL DEFAULT 'Sofía IA',
  "persona_gender" varchar(20) NOT NULL DEFAULT 'female',
  "persona_tone" varchar(40) NOT NULL DEFAULT 'profesional',
  "system_prompt_override" text,
  "welcome_message" text,
  "include_own_inventory" boolean NOT NULL DEFAULT true,
  "include_network_inventory" boolean NOT NULL DEFAULT true,
  "allow_crm_capture" boolean NOT NULL DEFAULT true,
  "allow_visit_scheduling" boolean NOT NULL DEFAULT true,
  "allow_notarial_calc" boolean NOT NULL DEFAULT true,
  "waba_id" varchar(120),
  "phone_number_id" varchar(120),
  "display_phone_number" varchar(40),
  "access_token_encrypted" text,
  "app_secret_encrypted" text,
  "webhook_verify_token_encrypted" text,
  "webhook_verify_token_hash" varchar(64),
  "last_verified_at" timestamp,
  "last_inbound_at" timestamp,
  "last_error" text,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_agent_jania_channels_user_type"
  ON "agent_jania_channels" ("user_id", "channel_type");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_agent_jania_channels_phone_number_id"
  ON "agent_jania_channels" ("phone_number_id")
  WHERE "phone_number_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_agent_jania_channels_agency_id"
  ON "agent_jania_channels" ("agency_id");
CREATE INDEX IF NOT EXISTS "idx_agent_jania_channels_active_type"
  ON "agent_jania_channels" ("channel_type", "is_active");
CREATE INDEX IF NOT EXISTS "idx_agent_jania_channels_verify_hash"
  ON "agent_jania_channels" ("webhook_verify_token_hash")
  WHERE "webhook_verify_token_hash" IS NOT NULL;

-- 2. Trazabilidad auditable de Suite Legal SaaS (CTL SNR, Identidad/Antecedentes y Avalúos ACM)
CREATE TABLE IF NOT EXISTS "agent_legal_tool_logs" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "agency_id" integer REFERENCES "agencies"("id") ON DELETE SET NULL,
  "tool_type" varchar(40) NOT NULL,
  "reference_code" varchar(120),
  "subject_label" varchar(255),
  "verdict_or_status" varchar(60),
  "summary_text" text,
  "pdf_url" text,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_agent_legal_tool_logs_user_id"
  ON "agent_legal_tool_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_agent_legal_tool_logs_agency_id"
  ON "agent_legal_tool_logs" ("agency_id");
CREATE INDEX IF NOT EXISTS "idx_agent_legal_tool_logs_tool_type"
  ON "agent_legal_tool_logs" ("tool_type");
CREATE INDEX IF NOT EXISTS "idx_agent_legal_tool_logs_created_at"
  ON "agent_legal_tool_logs" ("created_at");

-- 3. Cuotas IA y herramientas legales/técnicas en subscription_plans
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "max_ai_messages_month" integer NOT NULL DEFAULT 0;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "whatsapp_cloud_byo_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "max_ctl_studies_month" integer NOT NULL DEFAULT 0;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "max_identity_checks_month" integer NOT NULL DEFAULT 3;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "max_valuations_month" integer NOT NULL DEFAULT 5;

UPDATE "subscription_plans"
SET
  "max_ai_messages_month" = CASE
    WHEN "code" = 'free' THEN 0
    WHEN "code" = 'agente_pro' THEN 0
    WHEN "code" = 'inmobiliaria_growth' THEN 1000
    WHEN "code" = 'elite_ia' THEN 5000
    ELSE "max_ai_messages_month"
  END,
  "whatsapp_cloud_byo_enabled" = CASE
    WHEN "code" = 'elite_ia' THEN true
    ELSE false
  END,
  "max_ctl_studies_month" = CASE
    WHEN "code" = 'free' THEN 0
    WHEN "code" = 'agente_pro' THEN 5
    WHEN "code" = 'inmobiliaria_growth' THEN 25
    WHEN "code" = 'elite_ia' THEN 100
    ELSE "max_ctl_studies_month"
  END,
  "max_identity_checks_month" = CASE
    WHEN "code" = 'free' THEN 3
    WHEN "code" = 'agente_pro' THEN 25
    WHEN "code" = 'inmobiliaria_growth' THEN 100
    WHEN "code" = 'elite_ia' THEN 300
    ELSE "max_identity_checks_month"
  END,
  "max_valuations_month" = CASE
    WHEN "code" = 'free' THEN 5
    WHEN "code" = 'agente_pro' THEN 30
    WHEN "code" = 'inmobiliaria_growth' THEN 120
    WHEN "code" = 'elite_ia' THEN 500
    ELSE "max_valuations_month"
  END,
  "updated_at" = now()
WHERE "code" IN ('free', 'agente_pro', 'inmobiliaria_growth', 'elite_ia');

-- 4. Contadores mensuales en usage_quotas
ALTER TABLE "usage_quotas" ADD COLUMN IF NOT EXISTS "ai_messages_used" integer NOT NULL DEFAULT 0;
ALTER TABLE "usage_quotas" ADD COLUMN IF NOT EXISTS "ctl_studies_used" integer NOT NULL DEFAULT 0;
ALTER TABLE "usage_quotas" ADD COLUMN IF NOT EXISTS "identity_checks_used" integer NOT NULL DEFAULT 0;
ALTER TABLE "usage_quotas" ADD COLUMN IF NOT EXISTS "valuations_used" integer NOT NULL DEFAULT 0;

UPDATE "usage_quotas"
SET "ai_messages_used" = GREATEST("ai_messages_used", "private_jania_messages_used")
WHERE "private_jania_messages_used" > 0;
