-- Migración Aditiva 0016: CRM Inmobiliario Kanban Multi-Tenant y Gestor Automatizado de Correos con IA
-- VECY Network v34.40 (PASO 4)

-- 1. Enriquecimiento aditivo de la tabla leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "agent_id" integer REFERENCES "users"("id");
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "agency_id" integer;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "assigned_agent_id" integer REFERENCES "users"("id");
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "requirement_id" integer REFERENCES "requirements"("id");
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "pipeline_stage" varchar(40) NOT NULL DEFAULT 'nuevo';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "temperature" varchar(20) NOT NULL DEFAULT 'warm';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "estimated_budget" decimal(15,2);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "next_follow_up_at" timestamp;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "last_contacted_at" timestamp;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "preferred_city" varchar(100);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "preferred_zone" varchar(150);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "referral_token" varchar(255);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "solicitud_id" bigint;

UPDATE "leads"
SET "agent_id" = "assigned_agent_id"
WHERE "agent_id" IS NULL AND "assigned_agent_id" IS NOT NULL;

UPDATE "leads"
SET "pipeline_stage" = CASE
  WHEN "status" = 'contacted' THEN 'contactado'
  WHEN "status" = 'qualified' THEN 'calificado'
  WHEN "status" = 'converted' THEN 'cerrado_ganado'
  WHEN "status" = 'rejected' THEN 'perdido'
  ELSE 'nuevo'
END
WHERE "pipeline_stage" = 'nuevo' AND "status" IN ('contacted', 'qualified', 'converted', 'rejected');

CREATE INDEX IF NOT EXISTS "idx_leads_agent_id" ON "leads" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_leads_agency_id" ON "leads" ("agency_id");
CREATE INDEX IF NOT EXISTS "idx_leads_pipeline_stage" ON "leads" ("pipeline_stage");
CREATE INDEX IF NOT EXISTS "idx_leads_next_followup" ON "leads" ("next_follow_up_at");
CREATE INDEX IF NOT EXISTS "idx_leads_email" ON "leads" ("email");
CREATE INDEX IF NOT EXISTS "idx_leads_solicitud_id" ON "leads" ("solicitud_id");

-- 2. Timeline de actividades y recordatorios del CRM
CREATE TABLE IF NOT EXISTS "crm_activities" (
  "id" serial PRIMARY KEY,
  "lead_id" integer NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "agent_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "agency_id" integer REFERENCES "agencies"("id") ON DELETE SET NULL,
  "activity_type" varchar(40) NOT NULL DEFAULT 'note',
  "title" varchar(255),
  "body" text NOT NULL,
  "from_stage" varchar(40),
  "to_stage" varchar(40),
  "due_at" timestamp,
  "completed_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_crm_activities_lead_id" ON "crm_activities" ("lead_id");
CREATE INDEX IF NOT EXISTS "idx_crm_activities_agent_id" ON "crm_activities" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_crm_activities_agency_id" ON "crm_activities" ("agency_id");
CREATE INDEX IF NOT EXISTS "idx_crm_activities_created_at" ON "crm_activities" ("created_at");

-- 3. Identidades de correo del agente (Relay VECY con Reply-To o SMTP propio cifrado con AES-256-GCM)
CREATE TABLE IF NOT EXISTS "email_accounts" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "agency_id" integer REFERENCES "agencies"("id") ON DELETE SET NULL,
  "mode" varchar(30) NOT NULL DEFAULT 'vecy_relay',
  "display_name" varchar(180) NOT NULL,
  "from_email" varchar(320),
  "reply_to_email" varchar(320) NOT NULL,
  "signature_html" text,
  "smtp_host" varchar(255),
  "smtp_port" integer NOT NULL DEFAULT 587,
  "smtp_secure" boolean NOT NULL DEFAULT false,
  "smtp_user" varchar(320),
  "smtp_password_encrypted" text,
  "is_verified" boolean NOT NULL DEFAULT false,
  "last_verified_at" timestamp,
  "last_error" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_email_accounts_user" ON "email_accounts" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_accounts_agency_id" ON "email_accounts" ("agency_id");

-- 4. Plantillas de correo (sistema + personalizadas por agente/agencia)
CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" serial PRIMARY KEY,
  "user_id" integer REFERENCES "users"("id") ON DELETE CASCADE,
  "agency_id" integer REFERENCES "agencies"("id") ON DELETE SET NULL,
  "code" varchar(80),
  "name" varchar(180) NOT NULL,
  "category" varchar(50) NOT NULL DEFAULT 'follow_up',
  "subject_template" varchar(300) NOT NULL,
  "body_html_template" text NOT NULL,
  "body_text_template" text,
  "ai_prompt_hint" text,
  "is_system" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_email_templates_system_code"
  ON "email_templates" ("code") WHERE "is_system" = true AND "code" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_email_templates_user_id" ON "email_templates" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_templates_agency_id" ON "email_templates" ("agency_id");
CREATE INDEX IF NOT EXISTS "idx_email_templates_category" ON "email_templates" ("category");

-- 5. Secuencias automáticas de correos (Bienvenida 0h / Seguimiento 24h & 72h / Alerta Match >= 85%)
CREATE TABLE IF NOT EXISTS "email_sequences" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "agency_id" integer REFERENCES "agencies"("id") ON DELETE SET NULL,
  "name" varchar(180) NOT NULL,
  "description" text,
  "trigger_type" varchar(50) NOT NULL DEFAULT 'lead_created',
  "steps_json" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "stop_on_stage_change" boolean NOT NULL DEFAULT false,
  "stop_stages_json" jsonb NOT NULL DEFAULT '["cerrado_ganado","perdido"]'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_email_sequences_user_id" ON "email_sequences" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_sequences_trigger_active" ON "email_sequences" ("trigger_type", "is_active");
CREATE INDEX IF NOT EXISTS "idx_email_sequences_agency_id" ON "email_sequences" ("agency_id");

-- 6. Inscripciones activas de leads en secuencias
CREATE TABLE IF NOT EXISTS "email_sequence_enrollments" (
  "id" serial PRIMARY KEY,
  "sequence_id" integer NOT NULL REFERENCES "email_sequences"("id") ON DELETE CASCADE,
  "lead_id" integer NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "agency_id" integer REFERENCES "agencies"("id") ON DELETE SET NULL,
  "current_step_index" integer NOT NULL DEFAULT 0,
  "status" varchar(30) NOT NULL DEFAULT 'active',
  "next_run_at" timestamp,
  "last_sent_at" timestamp,
  "context_json" jsonb,
  "last_error" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_email_enrollments_due" ON "email_sequence_enrollments" ("status", "next_run_at");
CREATE INDEX IF NOT EXISTS "idx_email_enrollments_lead_id" ON "email_sequence_enrollments" ("lead_id");
CREATE INDEX IF NOT EXISTS "idx_email_enrollments_user_id" ON "email_sequence_enrollments" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_enrollments_seq_lead" ON "email_sequence_enrollments" ("sequence_id", "lead_id");

-- 7. Registro y cola de mensajes de correo electrónico
CREATE TABLE IF NOT EXISTS "email_messages" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "agency_id" integer REFERENCES "agencies"("id") ON DELETE SET NULL,
  "lead_id" integer REFERENCES "leads"("id") ON DELETE SET NULL,
  "account_id" integer REFERENCES "email_accounts"("id") ON DELETE SET NULL,
  "sequence_id" integer REFERENCES "email_sequences"("id") ON DELETE SET NULL,
  "enrollment_id" integer REFERENCES "email_sequence_enrollments"("id") ON DELETE SET NULL,
  "direction" varchar(20) NOT NULL DEFAULT 'outbound',
  "to_email" varchar(320) NOT NULL,
  "from_email" varchar(320) NOT NULL,
  "reply_to_email" varchar(320),
  "subject" varchar(300) NOT NULL,
  "body_html" text NOT NULL,
  "body_text" text,
  "status" varchar(30) NOT NULL DEFAULT 'queued',
  "provider_message_id" varchar(255),
  "scheduled_for" timestamp,
  "sent_at" timestamp,
  "error_message" text,
  "ai_generated" boolean NOT NULL DEFAULT false,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_email_messages_user_id" ON "email_messages" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_messages_lead_id" ON "email_messages" ("lead_id");
CREATE INDEX IF NOT EXISTS "idx_email_messages_queue" ON "email_messages" ("status", "scheduled_for");
CREATE INDEX IF NOT EXISTS "idx_email_messages_agency_id" ON "email_messages" ("agency_id");

-- 8. Seed idempotente de plantillas base del sistema
INSERT INTO "email_templates" (
  "user_id", "agency_id", "code", "name", "category",
  "subject_template", "body_html_template", "body_text_template", "ai_prompt_hint", "is_system", "is_active"
) VALUES
(
  NULL, NULL, 'sys_welcome_immediate',
  'Bienvenida Inmediata al Prospecto',
  'welcome',
  'Hola {{lead_first_name}}, recibimos tu consulta sobre {{property_name}}',
  '<p>Hola <strong>{{lead_first_name}}</strong>,</p><p>Soy <strong>{{agent_name}}</strong> de <strong>{{agency_name}}</strong>. Gracias por tu interés en <strong>{{property_name}}</strong> ({{property_zone}}, {{property_city}}).</p><p>Estoy disponible para enviarte la ficha completa, resolver tus dudas financieras o coordinar una visita personalizada en el horario que prefieras.</p><p>Puedes responder directamente a este correo o escribirnos al {{agent_phone}}.</p>',
  'Hola {{lead_first_name}}, soy {{agent_name}} de {{agency_name}}. Gracias por tu interés en {{property_name}}. Escríbeme para enviarte la ficha o agendar una visita.',
  'Bienvenida cálida y ejecutiva agradeciendo el interés e invitando a agendar visita.',
  true, true
),
(
  NULL, NULL, 'sys_followup_24h',
  'Seguimiento Consultivo 24 Horas',
  'follow_up',
  '{{lead_first_name}}, ¿te comparto más opciones similares en {{lead_zone}}?',
  '<p>Hola <strong>{{lead_first_name}}</strong>,</p><p>Quería saber cómo avanzas con tu búsqueda inmobiliaria en <strong>{{lead_zone}}</strong> ({{lead_city}}). Si buscas ajustar presupuesto ({{lead_budget}}), metraje o forma de pago, puedo enviarte hoy 3 alternativas seleccionadas con documentación verificada.</p><p>¿Prefieres que conversemos brevemente hoy?</p>',
  'Hola {{lead_first_name}}, quería saber cómo avanzas con tu búsqueda en {{lead_zone}}. Si deseas, te envío opciones verificadas hoy.',
  'Seguimiento consultivo a las 24 horas ofreciendo alternativas comparables.',
  true, true
),
(
  NULL, NULL, 'sys_followup_72h',
  'Propuesta de Visita y Cierre 72 Horas',
  'follow_up',
  'Agenda prioritaria esta semana para {{property_name}} — {{agency_name}}',
  '<p>Hola <strong>{{lead_first_name}}</strong>,</p><p>Esta semana tenemos espacios disponibles para recorrer <strong>{{property_name}}</strong> y evaluar condiciones reales de negociación y gastos notariales.</p><p>Respóndeme con el día y hora que mejor te funcione para reservar tu cita con validación prioritaria.</p>',
  'Hola {{lead_first_name}}, tenemos espacios esta semana para visitar {{property_name}}. Indícame tu horario ideal para agendar.',
  'Cierre consultivo a las 72 horas invitando a confirmar cita.',
  true, true
),
(
  NULL, NULL, 'sys_match_85_alert',
  'Alerta de Match Inmobiliario >= 85%',
  'match_alert',
  '🎯 Match {{match_score}}% encontrado para ti: {{property_name}}',
  '<p>Hola <strong>{{lead_first_name}}</strong>,</p><p>Nuestro motor inteligente detectó una coincidencia del <strong>{{match_score}}%</strong> con lo que estás buscando: <strong>{{property_name}}</strong> en <strong>{{property_zone}}, {{property_city}}</strong> ({{property_price}}).</p><p>Por su alta compatibilidad te recomiendo revisarlo pronto antes de que reciba nuevas reservas. Respóndeme si deseas coordinar visita prioritaria.</p>',
  'Hola {{lead_first_name}}, detectamos un Match de {{match_score}}%: {{property_name}} en {{property_zone}} ({{property_price}}).',
  'Alerta entusiasta pero seria destacando compatibilidad >= 85% e invitando a visita rápida.',
  true, true
)
ON CONFLICT DO NOTHING;
