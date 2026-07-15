ALTER TABLE "properties" ADD COLUMN "fecha_extraccion" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "origen_tipo" varchar(50);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "origen_id" varchar(100);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "origen_nombre" varchar(255);--> statement-breakpoint
ALTER TABLE "requirements" ADD COLUMN "fecha_extraccion" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "requirements" ADD COLUMN "origen_tipo" varchar(50);--> statement-breakpoint
ALTER TABLE "requirements" ADD COLUMN "origen_id" varchar(100);--> statement-breakpoint
ALTER TABLE "requirements" ADD COLUMN "origen_nombre" varchar(255);