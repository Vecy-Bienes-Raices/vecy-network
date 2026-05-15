ALTER TABLE "properties" ADD COLUMN "address_city" varchar(100);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "address_locality" varchar(100);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "address_neighborhood" varchar(150);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "coordinates" jsonb;--> statement-breakpoint
ALTER TABLE "requirements" ADD COLUMN "address_city" varchar(100);--> statement-breakpoint
ALTER TABLE "requirements" ADD COLUMN "address_locality" varchar(100);--> statement-breakpoint
ALTER TABLE "requirements" ADD COLUMN "address_neighborhood" varchar(150);