-- Add verified NZ-to-India remittance providers; preserve existing IDs and votes.
-- Run in Supabase SQL Editor. Safe to re-run.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.polls WHERE slug = 'send-money-to-india-2026') THEN
    RAISE EXCEPTION 'Remittance poll missing; run money-polls-2026.sql first';
  END IF;
END
$$;
INSERT INTO public.poll_options (poll_id, label, display_order, is_active)
SELECT p.id, o.label, o.display_order, true
FROM public.polls p
CROSS JOIN (VALUES
  ('ANZ', 1),
  ('ASB', 2),
  ('Bank of Baroda NZ', 3),
  ('Bank of India NZ', 4),
  ('BNZ', 5),
  ('Kiwibank', 6),
  ('OFX', 7),
  ('OrbitRemit', 8),
  ('Remitly', 9),
  ('Ria Money Transfer', 10),
  ('Western Union', 11),
  ('Westpac', 12),
  ('Wise', 13),
  ('WorldRemit', 14),
  ('Xe', 15),
  ('Other', 16)
) AS o(label, display_order)
WHERE p.slug = 'send-money-to-india-2026'
ON CONFLICT (poll_id, label) DO UPDATE SET
  display_order = EXCLUDED.display_order,
  is_active = true;
COMMIT;

SELECT o.id, o.label, o.display_order, COUNT(v.id) AS total_votes,
       COUNT(v.id) FILTER (WHERE v.status::text = 'valid') AS valid_votes
FROM public.polls p
JOIN public.poll_options o ON o.poll_id = p.id
LEFT JOIN public.votes v ON v.poll_id = p.id AND v.option_id = o.id
WHERE p.slug = 'send-money-to-india-2026' AND o.is_active = true
GROUP BY o.id, o.label, o.display_order
ORDER BY o.display_order;
