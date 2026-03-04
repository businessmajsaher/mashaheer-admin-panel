-- Initialize payment_recurrence setting
INSERT INTO app_settings (key, value, updated_at)
VALUES ('payment_recurrence', 'monthly', NOW())
ON CONFLICT (key) DO NOTHING;
