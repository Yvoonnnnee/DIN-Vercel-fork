CREATE TYPE "public"."arbitration_response" AS ENUM('accepted', 'rejected');--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "arbitration_claimant_response" "arbitration_response";--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "arbitration_respondent_response" "arbitration_response";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "arbitration_status";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "arbitration_rejected_by";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "arbitration_rejected_at";--> statement-breakpoint
DROP TYPE "public"."arbitration_status";