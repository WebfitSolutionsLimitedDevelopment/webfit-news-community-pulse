-- Expand existing home-loan poll without replacing IDs or votes.
-- Run in Supabase SQL Editor. Safe to re-run.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.polls WHERE slug = 'home-loans-2026') THEN
    RAISE EXCEPTION 'Home-loan poll missing; run money-polls-2026.sql first';
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
  ('Bank of China NZ', 4),
  ('Bank of India NZ', 5),
  ('BNZ', 6),
  ('China Construction Bank NZ', 7),
  ('Co-operative Bank', 8),
  ('ICBC NZ', 9),
  ('Kiwibank', 10),
  ('SBS', 11),
  ('TSB', 12),
  ('Westpac', 13),
  ('Other', 14),
  ('I don''t have a home loan', 15)
) AS o(label, display_order)
WHERE p.slug = 'home-loans-2026'
ON CONFLICT (poll_id, label) DO UPDATE SET
  display_order = EXCLUDED.display_order,
  is_active = true;
COMMIT;

SELECT o.label, o.display_order, COUNT(v.id) AS total_votes,
       COUNT(v.id) FILTER (WHERE v.status::text = 'valid') AS valid_votes
FROM public.polls p
JOIN public.poll_options o ON o.poll_id = p.id
LEFT JOIN public.votes v ON v.poll_id = p.id AND v.option_id = o.id
WHERE p.slug = 'home-loans-2026' AND o.is_active = true
GROUP BY o.id, o.label, o.display_order
ORDER BY o.display_order;
