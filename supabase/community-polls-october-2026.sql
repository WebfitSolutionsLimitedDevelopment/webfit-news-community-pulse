-- Four October 2026 reader polls. Run on the existing poll database.
-- Reuses /api/voting/submit: no OTP or sign-up, one vote per browser per poll.
-- Does not modify existing polls or votes. Safe to rerun.
begin;

with new_poll as (
  insert into public.polls (internal_name, slug, title, question, hero_subtitle, disclaimer, methodology, privacy_notice, poll_type, status, results_visibility, is_public)
  select 'Would you vote for the same party again?', 'same-party-2026', 'Would you vote for the same party again?', 'Would you vote for the same party you backed in 2023?', 'Loyalty, second thoughts, or a fresh start. Where do you stand today?', 'This is an independent, voluntary Webfit News reader poll and is not a scientifically representative survey of New Zealanders.', 'One response per browser per poll, with a per-network rate limit. Results are shown as percentages only; raw vote counts are never published.', 'No email address, OTP or sign-up is required. Network and browser identifiers are stored only as one-way hashes for duplicate and abuse control.', 'multiple_choice', 'open', 'live', true
  where not exists (select 1 from public.polls where slug = 'same-party-2026')
  returning id
)
insert into public.poll_options (poll_id, label, display_order, is_active)
select new_poll.id, o.label, o.display_order, true
from new_poll cross join (values
  ('Yes, the same party', 1),
  ('No, a different party', 2),
  ('Undecided', 3),
  ('I did not vote in 2023', 4),
  ('I was not eligible to vote in 2023', 5)
) as o(label, display_order);

with new_poll as (
  insert into public.polls (internal_name, slug, title, question, hero_subtitle, disclaimer, methodology, privacy_notice, poll_type, status, results_visibility, is_public)
  select 'A future in New Zealand?', 'children-future-nz-2026', 'A future in New Zealand?', 'Would you encourage your children to build their future in New Zealand?', 'Think about opportunities, family and the life the next generation could build here.', 'This is an independent, voluntary Webfit News reader poll and is not a scientifically representative survey of New Zealanders.', 'One response per browser per poll, with a per-network rate limit. Results are shown as percentages only; raw vote counts are never published.', 'No email address, OTP or sign-up is required. Network and browser identifiers are stored only as one-way hashes for duplicate and abuse control.', 'multiple_choice', 'open', 'live', true
  where not exists (select 1 from public.polls where slug = 'children-future-nz-2026')
  returning id
)
insert into public.poll_options (poll_id, label, display_order, is_active)
select new_poll.id, o.label, o.display_order, true
from new_poll cross join (values
  ('Yes, I would encourage them to stay', 1),
  ('No, I would encourage them to look overseas', 2),
  ('It depends on their circumstances', 3),
  ('Undecided', 4)
) as o(label, display_order);

with new_poll as (
  insert into public.polls (internal_name, slug, title, question, hero_subtitle, disclaimer, methodology, privacy_notice, poll_type, status, results_visibility, is_public)
  select 'Could you buy your home today?', 'buy-your-home-today-2026', 'Could you buy your home today?', 'Could you afford your current home if you had to buy it today?', 'Whether you own or rent, could you buy the home you live in on your current finances?', 'This is an independent, voluntary Webfit News reader poll and is not a scientifically representative survey of New Zealanders.', 'One response per browser per poll, with a per-network rate limit. Results are shown as percentages only; raw vote counts are never published.', 'No email address, OTP or sign-up is required. Network and browser identifiers are stored only as one-way hashes for duplicate and abuse control.', 'multiple_choice', 'open', 'live', true
  where not exists (select 1 from public.polls where slug = 'buy-your-home-today-2026')
  returning id
)
insert into public.poll_options (poll_id, label, display_order, is_active)
select new_poll.id, o.label, o.display_order, true
from new_poll cross join (values
  ('Yes, comfortably', 1),
  ('Yes, but it would be a stretch', 2),
  ('No', 3),
  ('Unsure', 4),
  ('Not applicable to my living situation', 5)
) as o(label, display_order);

with new_poll as (
  insert into public.polls (internal_name, slug, title, question, hero_subtitle, disclaimer, methodology, privacy_notice, poll_type, status, results_visibility, is_public)
  select 'MPs on the median wage?', 'mp-median-wage-2026', 'MPs on the median wage?', 'Should MPs receive the median New Zealand wage?', 'Should MPs'' base pay match the middle wage earned by New Zealand workers?', 'This is an independent, voluntary Webfit News reader poll and is not a scientifically representative survey of New Zealanders.', 'One response per browser per poll, with a per-network rate limit. Results are shown as percentages only; raw vote counts are never published.', 'No email address, OTP or sign-up is required. Network and browser identifiers are stored only as one-way hashes for duplicate and abuse control.', 'multiple_choice', 'open', 'live', true
  where not exists (select 1 from public.polls where slug = 'mp-median-wage-2026')
  returning id
)
insert into public.poll_options (poll_id, label, display_order, is_active)
select new_poll.id, o.label, o.display_order, true
from new_poll cross join (values
  ('Yes', 1),
  ('No', 2),
  ('Undecided', 3)
) as o(label, display_order);

commit;

select p.slug, p.status, p.results_visibility, p.is_public,
  (select count(*) from public.poll_options o where o.poll_id = p.id and o.is_active) as options,
  (select count(*) from public.votes v where v.poll_id = p.id) as votes
from public.polls p where p.slug in ('same-party-2026', 'children-future-nz-2026', 'buy-your-home-today-2026', 'mp-median-wage-2026') order by p.slug;
