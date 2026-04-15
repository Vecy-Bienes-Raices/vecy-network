CREATE TYPE "public"."demandLevel" AS ENUM('low', 'medium', 'high', 'very_high');--> statement-breakpoint
CREATE TYPE "public"."inquiryType" AS ENUM('buy', 'sell', 'rent', 'invest', 'general');--> statement-breakpoint
CREATE TYPE "public"."mandateStatus" AS ENUM('pending', 'signed');--> statement-breakpoint
CREATE TYPE "public"."mandateType" AS ENUM('direct_owner', 'agent_electronic_link', 'agent_uploaded_paper');--> statement-breakpoint
CREATE TYPE "public"."marketTrend" AS ENUM('declining', 'stable', 'growing', 'booming');--> statement-breakpoint
CREATE TYPE "public"."messageType" AS ENUM('text', 'image', 'audio', 'file', 'video');--> statement-breakpoint
CREATE TYPE "public"."propertyType" AS ENUM('apartment', 'house', 'building', 'warehouse', 'farm', 'hotel', 'office', 'land', 'commercial', 'loft');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'janIA', 'system');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'expired', 'converted');--> statement-breakpoint
CREATE TYPE "public"."supplyLevel" AS ENUM('low', 'medium', 'high', 'very_high');--> statement-breakpoint
CREATE TABLE "clientLedger" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyerId" integer NOT NULL,
	"referralId" integer NOT NULL,
	"status" "status" DEFAULT 'active',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"leadId" integer,
	"userId" varchar(255),
	"sessionId" varchar(255) NOT NULL,
	"topic" varchar(255),
	"messageCount" integer DEFAULT 0,
	"lastMessage" text,
	"status" "status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"propertyId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(20),
	"inquiryType" "inquiryType" NOT NULL,
	"budget" varchar(100),
	"preferredZones" jsonb,
	"propertyType" varchar(100),
	"bedrooms" integer,
	"bathrooms" integer,
	"message" text,
	"status" "status" DEFAULT 'new' NOT NULL,
	"source" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketAnalysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"zone" varchar(100) NOT NULL,
	"averagePrice" numeric(15, 2),
	"averagePricePerSqm" numeric(10, 2),
	"priceChange12Months" numeric(5, 2),
	"demandLevel" "demandLevel",
	"supplyLevel" "supplyLevel",
	"marketTrend" "marketTrend",
	"investmentPotential" varchar(100),
	"nearbyAmenities" jsonb,
	"transportAccess" text,
	"safetyRating" numeric(3, 1),
	"lastUpdated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketAnalysis_zone_unique" UNIQUE("zone")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"role" "role" NOT NULL,
	"content" text NOT NULL,
	"messageType" "messageType" DEFAULT 'text' NOT NULL,
	"attachments" jsonb,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(15, 2) NOT NULL,
	"pricePerSqm" numeric(10, 2),
	"location" varchar(255) NOT NULL,
	"zone" varchar(100) NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"propertyType" "propertyType" NOT NULL,
	"matriculaInmobiliaria" varchar(100),
	"bedrooms" integer,
	"bathrooms" integer,
	"garages" integer,
	"stratum" integer,
	"floor" integer,
	"areaSquareMeters" numeric(10, 2),
	"areaPrivateSquareMeters" numeric(10, 2),
	"yearBuilt" integer,
	"wildcardFeature" varchar(255),
	"adminFee" numeric(15, 2),
	"commissionPercent" numeric(5, 2),
	"mandateStatus" "mandateStatus" DEFAULT 'pending',
	"mandateType" "mandateType",
	"amenities" jsonb,
	"images" jsonb,
	"propertyDetails" jsonb,
	"featured" boolean DEFAULT false,
	"available" boolean DEFAULT true,
	"sourceRepository" varchar(255),
	"lastSyncedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "properties_matriculaInmobiliaria_unique" UNIQUE("matriculaInmobiliaria")
);
--> statement-breakpoint
CREATE TABLE "propertyImages" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"imageUrl" text NOT NULL,
	"thumbnailUrl" text,
	"caption" varchar(255),
	"displayOrder" integer DEFAULT 0,
	"isMainImage" boolean DEFAULT false,
	"uploadedBy" varchar(255),
	"fileSize" integer,
	"mimeType" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propertyMatches" (
	"id" serial PRIMARY KEY NOT NULL,
	"leadId" integer NOT NULL,
	"propertyId" integer NOT NULL,
	"matchScore" numeric(5, 2),
	"matchReason" text,
	"priceRecommendation" numeric(15, 2),
	"status" "status" DEFAULT 'suggested' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referralLinks" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"agentId" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"clicks" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referralLinks_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"documentType" varchar(50),
	"documentNumber" varchar(100),
	"phone" varchar(20),
	"vPoints" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
