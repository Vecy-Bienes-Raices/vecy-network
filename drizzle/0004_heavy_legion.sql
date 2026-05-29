CREATE TABLE "pendingSessions" (
	"jid" varchar(255) PRIMARY KEY NOT NULL,
	"sessionData" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "propertyMatches" ADD COLUMN "ownerConfirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "propertyMatches" ADD COLUMN "seekerConfirmed" boolean DEFAULT false NOT NULL;