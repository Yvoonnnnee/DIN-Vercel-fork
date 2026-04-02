-- Create hearings table with proper UUID types
CREATE TABLE "hearings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "case_id" uuid NOT NULL,
    "scheduled_start_time" timestamp with time zone NOT NULL,
    "scheduled_end_time" timestamp with time zone,
    "actual_start_time" timestamp with time zone,
    "actual_end_time" timestamp with time zone,
    "meeting_url" text,
    "meeting_platform" text DEFAULT 'google_meet',
    "meeting_id" text,
    "status" text DEFAULT 'scheduled' NOT NULL,
    "phase" text DEFAULT 'pre_hearing',
    "current_speaker" text,
    "ai_participants_config" jsonb,
    "agent_turn_order" jsonb,
    "transcription_session_id" text,
    "last_transcription_at" timestamp with time zone,
    "joinly_session_id" text,
    "is_recording" text DEFAULT 'false' NOT NULL,
    "is_transcribing" text DEFAULT 'true' NOT NULL,
    "auto_transcribe" text DEFAULT 'true' NOT NULL,
    "judge_id" text,
    "claimant_lawyer_id" text,
    "respondent_lawyer_id" text,
    "judge_notes" text,
    "hearing_summary" text,
    "next_hearing_date" timestamp with time zone,
    "outcome" text,
    "technical_notes" jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create hearing_transcripts table
CREATE TABLE "hearing_transcripts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "hearing_id" uuid NOT NULL,
    "speaker" text NOT NULL,
    "speaker_name" text,
    "content" text NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "sequence_number" text NOT NULL,
    "audio_segment_start" text,
    "audio_segment_end" text,
    "confidence" text,
    "ai_processed" text DEFAULT 'false' NOT NULL,
    "ai_analysis" jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create hearing_participants table
CREATE TABLE "hearing_participants" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "hearing_id" uuid NOT NULL,
    "user_id" text,
    "participant_type" text NOT NULL,
    "role" text NOT NULL,
    "display_name" text NOT NULL,
    "ai_config" jsonb,
    "voice_id" text,
    "personality" text,
    "joined_at" timestamp with time zone,
    "left_at" timestamp with time zone,
    "is_active" text DEFAULT 'true' NOT NULL,
    "joinly_participant_id" text,
    "meeting_participant_id" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for hearings
CREATE INDEX "hearings_case_id_idx" ON "hearings" ("case_id");
CREATE INDEX "hearings_status_idx" ON "hearings" ("status");
CREATE INDEX "hearings_scheduled_start_time_idx" ON "hearings" ("scheduled_start_time");
CREATE INDEX "hearings_meeting_id_idx" ON "hearings" ("meeting_id");

-- Create indexes for hearing_transcripts
CREATE INDEX "hearing_transcripts_hearing_id_idx" ON "hearing_transcripts" ("hearing_id");
CREATE INDEX "hearing_transcripts_timestamp_idx" ON "hearing_transcripts" ("timestamp");
CREATE INDEX "hearing_transcripts_speaker_idx" ON "hearing_transcripts" ("speaker");

-- Create indexes for hearing_participants
CREATE INDEX "hearing_participants_hearing_id_idx" ON "hearing_participants" ("hearing_id");
CREATE INDEX "hearing_participants_user_id_idx" ON "hearing_participants" ("user_id");
CREATE INDEX "hearing_participants_role_idx" ON "hearing_participants" ("role");

-- Add foreign key constraints
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_case_id_cases_id_fk" 
    FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE cascade ON UPDATE no action;

DO $$ BEGIN
    ALTER TABLE "hearing_transcripts" ADD CONSTRAINT "hearing_transcripts_hearing_id_hearings_id_fk" 
        FOREIGN KEY ("hearing_id") REFERENCES "hearings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "hearing_participants" ADD CONSTRAINT "hearing_participants_hearing_id_hearings_id_fk" 
        FOREIGN KEY ("hearing_id") REFERENCES "hearings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Migrate existing hearing data from cases table (only if hearing_date exists)
INSERT INTO "hearings" ("id", "case_id", "scheduled_start_time", "meeting_url", "status", "created_at", "updated_at")
SELECT 
    gen_random_uuid() as id,
    id as case_id,
    hearing_date as scheduled_start_time,
    meeting_url,
    CASE 
        WHEN status = 'hearing_scheduled' THEN 'scheduled'
        WHEN status IN ('awaiting_decision', 'in_arbitration') THEN 'completed'
        ELSE 'scheduled'
    END as status,
    created_at,
    updated_at
FROM "cases" 
WHERE hearing_date IS NOT NULL;

-- Remove hearing-specific fields from cases table (only if they exist and data has been migrated)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'hearing_date') THEN
        ALTER TABLE "cases" DROP COLUMN IF EXISTS "hearing_date";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'meeting_url') THEN
        ALTER TABLE "cases" DROP COLUMN IF EXISTS "meeting_url";
    END IF;
END $$;
