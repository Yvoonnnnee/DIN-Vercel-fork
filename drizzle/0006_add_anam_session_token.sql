-- Add Anam session token column to hearing participants table
-- This replaces the deprecated Pika participant ID for the new Anam-based system

ALTER TABLE hearing_participants 
ADD COLUMN anam_session_token TEXT;

-- Create index for faster lookups
CREATE INDEX hearing_participants_anam_session_token_idx 
ON hearing_participants(anam_session_token);
