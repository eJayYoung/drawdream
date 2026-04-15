-- Huimeng Database Initialization Script
-- This script runs automatically when the PostgreSQL container starts

-- Create database if not exists (handled by POSTGRES_DB env)
-- Additional initialization can be added here

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes for better query performance
-- These will be applied when tables are created by MikroORM migrations

COMMENT ON DATABASE huimeng IS 'Huimeng AI Short Drama Generation Platform';
