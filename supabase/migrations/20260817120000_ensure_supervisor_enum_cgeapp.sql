-- Required before user_roles.role can be set to supervisor.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
