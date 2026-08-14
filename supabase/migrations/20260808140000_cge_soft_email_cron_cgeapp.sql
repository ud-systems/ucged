-- Schedule soft-email runner (replace gfgqjuhkbbnrybkbthku before apply)
-- Requires pg_cron + pg_net. Align CGE_CRON_SECRET edge secret with app_settings.cge_cron_secret.

INSERT INTO public.app_settings (key, value)
VALUES
  ('cge_cron_secret', coalesce((SELECT value FROM public.app_settings WHERE key = 'cge_cron_secret'), gen_random_uuid()::text)),
  ('resend_from_email', coalesce((SELECT value FROM public.app_settings WHERE key = 'resend_from_email'), ''))
ON CONFLICT (key) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'cge-soft-email-hourly';

    PERFORM cron.schedule(
      'cge-soft-email-hourly',
      '15 * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://gfgqjuhkbbnrybkbthku.supabase.co/functions/v1/cge-soft-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cge-cron-secret', coalesce((SELECT value FROM public.app_settings WHERE key = 'cge_cron_secret'), '')
        ),
        body := '{}'::jsonb
      );
      $cron$
    );
  END IF;
END $$;
