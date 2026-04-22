CREATE TYPE "public"."arbitration_status" AS ENUM('generated', 'accepted', 'rejected_by_claimant', 'rejected_by_defendant', 'rejected_by_moderator');--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "arbitration_status" "arbitration_status";--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "arbitration_rejected_by" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "arbitration_rejected_at" timestamp with time zone;