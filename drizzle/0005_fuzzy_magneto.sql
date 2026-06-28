CREATE TABLE "colombia_geography" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_dept" varchar(5) NOT NULL,
	"name_dept" varchar(100) NOT NULL,
	"code_mun" varchar(10) NOT NULL,
	"name_mun" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"longitude" varchar(50),
	"latitude" varchar(50),
	CONSTRAINT "colombia_geography_code_mun_unique" UNIQUE("code_mun")
);
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "sourceRepository" varchar(255);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "lastSyncedAt" timestamp;