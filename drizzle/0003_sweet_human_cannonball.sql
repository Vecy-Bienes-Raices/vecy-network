CREATE TABLE "shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"agentId" integer NOT NULL,
	"platform" varchar(50) NOT NULL,
	"shareLink" text,
	"pointsAwarded" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "properties" RENAME COLUMN "floor" TO "floor_detail";--> statement-breakpoint
ALTER TABLE "clientLedger" ADD COLUMN "shareId" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subdomain" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "themeConfig" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "customLogoUrl" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "activeTools" jsonb;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_agentId_users_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientLedger" ADD CONSTRAINT "clientLedger_shareId_shares_id_fk" FOREIGN KEY ("shareId") REFERENCES "public"."shares"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_subdomain_unique" UNIQUE("subdomain");