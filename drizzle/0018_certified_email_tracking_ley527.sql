-- Migración Aditiva 0018: Correo Certificado y Rastreo tipo Mailsuite (Ley 527 de 1999)
-- VECY Network v34.43

ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "tracking_token" varchar(64);
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "certificate_code" varchar(80);
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "content_sha256" varchar(64);
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "evidence_sha256" varchar(64);
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "attachments_json" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "open_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "first_opened_at" timestamp;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "last_opened_at" timestamp;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "last_open_ip" varchar(64);
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "last_open_user_agent" text;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "click_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "first_clicked_at" timestamp;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "last_clicked_at" timestamp;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "last_click_ip" varchar(64);
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "last_click_user_agent" text;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "notify_on_open" boolean NOT NULL DEFAULT false;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "open_notified_at" timestamp;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "tracking_events_json" jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_email_messages_tracking_token"
  ON "email_messages" ("tracking_token")
  WHERE "tracking_token" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_email_messages_certificate_code"
  ON "email_messages" ("certificate_code")
  WHERE "certificate_code" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "email_tracked_links" (
  "id" serial PRIMARY KEY,
  "email_message_id" integer NOT NULL REFERENCES "email_messages"("id") ON DELETE CASCADE,
  "token" varchar(64) NOT NULL,
  "target_url" text NOT NULL,
  "click_count" integer NOT NULL DEFAULT 0,
  "first_clicked_at" timestamp,
  "last_clicked_at" timestamp,
  "last_ip" varchar(64),
  "last_user_agent" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_email_tracked_links_token"
  ON "email_tracked_links" ("token");

CREATE INDEX IF NOT EXISTS "idx_email_tracked_links_msg_id"
  ON "email_tracked_links" ("email_message_id");
