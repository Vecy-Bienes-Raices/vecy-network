ALTER TYPE "public"."transactionType" ADD VALUE 'permuta';--> statement-breakpoint
ALTER TYPE "public"."transactionType" ADD VALUE 'aporte';--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "accepted_transaction_types" text[];--> statement-breakpoint
ALTER TABLE "requirements" ADD COLUMN "tipos_negocio_aceptados" text[];