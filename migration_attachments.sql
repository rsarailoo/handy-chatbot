-- Migration script for Attachments table
-- Run this in your database SQL editor

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(36) PRIMARY KEY,
  message_id VARCHAR(36) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- "image" or "file"
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER, -- Size in bytes
  mime_type VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);

