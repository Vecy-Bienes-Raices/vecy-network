CREATE TABLE "notificationLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"matchId" integer,
	"brokerId" integer,
	"brokerPhone" varchar(50) NOT NULL,
	"channel" varchar(50) DEFAULT 'whatsapp' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"sentAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "propertyMatches" ADD COLUMN "ipc" jsonb;--> statement-breakpoint
ALTER TABLE "notificationLogs" ADD CONSTRAINT "notificationLogs_matchId_propertyMatches_id_fk" FOREIGN KEY ("matchId") REFERENCES "public"."propertyMatches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificationLogs" ADD CONSTRAINT "notificationLogs_brokerId_users_id_fk" FOREIGN KEY ("brokerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;