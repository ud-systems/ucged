-- Schedule campaign sender for due scheduled campaigns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'cge-campaign-send-every-15m';

    PERFORM cron.schedule(
      'cge-campaign-send-every-15m',
      '*/15 * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://gfgqjuhkbbnrybkbthku.supabase.co/functions/v1/cge-campaign-send',
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
