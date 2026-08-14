-- Must commit before using new enum value in same DB session/transaction
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cge';