CREATE TABLE "counters" (
	"name" text PRIMARY KEY NOT NULL,
	"current_value" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone,
	"username" text,
	"full_name" text,
	"avatar_url" text,
	"website" text,
	"celular" text,
	"tipo_documento" text,
	"numero_documento" text,
	"tipo_cliente" text,
	"perfil" text
);
--> statement-breakpoint
CREATE TABLE "solicitudes" (
	"id" bigint PRIMARY KEY NOT NULL,
	"solicitud_id" bigint,
	"solicitante_nombre" text,
	"solicitante_tipo_persona" text,
	"solicitante_perfil" text,
	"solicitante_email" text,
	"solicitante_celular" text,
	"solicitante_tipo_documento" text,
	"solicitante_numero_documento" text,
	"servicio_solicitado" text,
	"nombre_inmueble" text,
	"codigo_inmueble" text,
	"opcion_negocio" text,
	"fecha_cita_texto" text,
	"hora_cita" text,
	"cantidad_personas" integer,
	"interesado_nombre" text,
	"interesado_tipo_documento" text,
	"interesado_documento" text,
	"tipo_cliente" text,
	"acompanantes" jsonb,
	"firma_virtual_base64" text,
	"firma_fechahora_audit" timestamp with time zone,
	"created_at" timestamp with time zone,
	"solicitante_representante_legal" text,
	"autorizacion" boolean,
	"agent_id" text
);
--> statement-breakpoint
ALTER TABLE "requirements" ADD COLUMN "adminFeeMax" numeric(15, 2);