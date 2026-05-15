CREATE TYPE "public"."conversationStatus" AS ENUM('active', 'archived', 'converted');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('COP', 'USD');--> statement-breakpoint
CREATE TYPE "public"."demandLevel" AS ENUM('low', 'medium', 'high', 'very_high');--> statement-breakpoint
CREATE TYPE "public"."inquiryType" AS ENUM('buy', 'sell', 'rent', 'invest', 'general');--> statement-breakpoint
CREATE TYPE "public"."leadStatus" AS ENUM('new', 'contacted', 'qualified', 'converted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."mandateStatus" AS ENUM('pending', 'signed');--> statement-breakpoint
CREATE TYPE "public"."mandateType" AS ENUM('direct_owner', 'agent_electronic_link', 'agent_uploaded_paper');--> statement-breakpoint
CREATE TYPE "public"."marketTrend" AS ENUM('declining', 'stable', 'growing', 'booming');--> statement-breakpoint
CREATE TYPE "public"."matchStatus" AS ENUM('suggested', 'interested', 'viewed', 'rejected', 'converted');--> statement-breakpoint
CREATE TYPE "public"."messageType" AS ENUM('text', 'image', 'audio', 'file', 'video');--> statement-breakpoint
CREATE TYPE "public"."propertyType" AS ENUM('apartment', 'house', 'building', 'warehouse', 'farm', 'hotel', 'office', 'land', 'commercial', 'loft', 'consultorio');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'janIA', 'system', 'admin', 'agent');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'expired', 'converted');--> statement-breakpoint
CREATE TYPE "public"."supplyLevel" AS ENUM('low', 'medium', 'high', 'very_high');--> statement-breakpoint
CREATE TYPE "public"."transactionType" AS ENUM('venta', 'arriendo', 'arriendo_temporal');--> statement-breakpoint
CREATE TABLE "clientLedger" (
	"id" serial PRIMARY KEY NOT NULL,
	"leadId" integer NOT NULL,
	"agentId" integer NOT NULL,
	"propertyId" integer NOT NULL,
	"referralToken" varchar(255),
	"vPointsEarned" integer DEFAULT 0,
	"status" "status" DEFAULT 'active',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"leadId" integer,
	"userId" varchar(255),
	"sessionId" varchar(255) NOT NULL,
	"status" "conversationStatus" DEFAULT 'active' NOT NULL,
	"lastMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" serial PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"documentNumber" varchar(100),
	"email" varchar(320) NOT NULL,
	"phone" varchar(20),
	"inquiryType" "inquiryType" NOT NULL,
	"message" text,
	"status" "leadStatus" DEFAULT 'new' NOT NULL,
	"source" varchar(100),
	"propertyId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketAnalysis" (
	"id" serial PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"role" "role" NOT NULL,
	"content" text NOT NULL,
	"messageType" "messageType" DEFAULT 'text' NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"propertyType" "propertyType" NOT NULL,
	"transactionType" "transactionType" DEFAULT 'venta' NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"currency" "currency" DEFAULT 'COP' NOT NULL,
	"pricePerSqm" numeric(10, 2),
	"city" varchar(100) DEFAULT 'Bogotá' NOT NULL,
	"zone" varchar(100) NOT NULL,
	"location" varchar(255),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"agentId" integer,
	"matriculaInmobiliaria" varchar(100),
	"bedrooms" integer,
	"bathrooms" integer,
	"garages" integer,
	"stratum" integer,
	"floor" integer,
	"areaTotal" numeric(10, 2),
	"areaPrivate" numeric(10, 2),
	"yearBuilt" integer,
	"antiguedadAnos" integer,
	"isAmoblado" boolean DEFAULT false,
	"adminFee" numeric(15, 2),
	"commissionPercent" numeric(5, 2),
	"mandateStatus" "mandateStatus" DEFAULT 'pending',
	"mandateType" "mandateType",
	"amenities" jsonb,
	"images" jsonb,
	"videoUrl" text,
	"externalUrl" text,
	"rawText" text,
	"featured" boolean DEFAULT false,
	"available" boolean DEFAULT true,
	"idUsuarioWhatsapp" varchar(100),
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
	"requirementId" integer NOT NULL,
	"propertyId" integer NOT NULL,
	"matchScore" numeric(5, 2),
	"matchReason" text,
	"status" "matchStatus" DEFAULT 'suggested' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"tipoInmuebleDeseado" "propertyType" NOT NULL,
	"tipoNegocioDeseado" "transactionType" NOT NULL,
	"ciudadDeseada" varchar(100) DEFAULT 'Bogotá' NOT NULL,
	"zonaDeseada" varchar(100),
	"presupuestoMin" numeric(15, 2),
	"presupuestoMax" numeric(15, 2),
	"currency" "currency" DEFAULT 'COP',
	"areaMin" numeric(10, 2),
	"habitacionesMin" integer,
	"banosMin" integer,
	"parqueaderosMin" integer,
	"estratoDeseado" jsonb,
	"amobladoDeseado" boolean,
	"caracteristicasDeseadas" jsonb,
	"status" "status" DEFAULT 'active',
	"idUsuarioWhatsapp" varchar(100),
	"rawText" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
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
--> statement-breakpoint
ALTER TABLE "clientLedger" ADD CONSTRAINT "clientLedger_leadId_leads_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientLedger" ADD CONSTRAINT "clientLedger_agentId_users_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientLedger" ADD CONSTRAINT "clientLedger_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_leadId_leads_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_agentId_users_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propertyImages" ADD CONSTRAINT "propertyImages_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propertyMatches" ADD CONSTRAINT "propertyMatches_requirementId_requirements_id_fk" FOREIGN KEY ("requirementId") REFERENCES "public"."requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propertyMatches" ADD CONSTRAINT "propertyMatches_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referralLinks" ADD CONSTRAINT "referralLinks_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referralLinks" ADD CONSTRAINT "referralLinks_agentId_users_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;