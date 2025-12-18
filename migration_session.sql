-- Session table for connect-pg-simple
-- This table stores user sessions for authentication persistence
-- Run this in your database SQL editor if sessions aren't working

CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

-- Create index on expire column for faster cleanup queries
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Optional: Add comment to table
COMMENT ON TABLE session IS 'Stores user sessions for authentication persistence across serverless function instances';

