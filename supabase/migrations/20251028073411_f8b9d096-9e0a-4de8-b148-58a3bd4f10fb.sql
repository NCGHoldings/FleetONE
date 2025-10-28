-- Add governance roles to existing app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'governance_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'governance_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'governance_viewer';