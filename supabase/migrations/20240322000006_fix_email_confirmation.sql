-- Fix email confirmation for existing users
-- This migration ensures all users can log in without email confirmation

-- Update all existing users to have confirmed emails
-- Note: confirmed_at is a generated column and cannot be updated directly
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, created_at)
WHERE email_confirmed_at IS NULL;

-- Ensure the email confirmation is properly set for future users
-- This is handled by the config.toml setting enable_confirmations = false
