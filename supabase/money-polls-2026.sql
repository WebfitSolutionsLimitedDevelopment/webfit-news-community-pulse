-- Money and banking reader polls (Webfit News Community Pulse 2026)
-- Run once in the Supabase SQL Editor for project fxbwcbhewqyqorpcwbma.
--
-- Creates three public, open polls with live results, and their options.
-- It does NOT insert any votes: every poll starts from zero.
-- Safe to re-run: a poll whose slug already exists is skipped (with its options).

begin;

-- Which app or bank do you use to send money to India?
with new_poll as (
  insert into public.polls (
    internal_name, slug, title, question, description,
    hero_subtitle, disclaimer, methodology, privacy_notice,
    poll_type, status, results_visibility, is_public
  )
  select
    'Money poll 2026: sending money to India', 'send-money-to-india-2026', 'Which app or bank do you use to send money to India?', 'Which app or bank do you use to send money to India?', null,
    'Tell us which service you use most often to send money from New Zealand to India.',
    'This is an independent, voluntary Webfit News reader poll and is not a scientifically representative survey of New Zealanders.',
    'One response per browser per poll, with a per-network rate limit. Results are shown as percentages only; raw vote counts are never published.',
    'No email address or sign-up is required. Network and browser identifiers are stored only as one-way hashes for duplicate and abuse control.',
    'multiple_choice', 'open', 'live', true
  where not exists (select 1 from public.polls where slug = 'send-money-to-india-2026')
  returning id
)
insert into public.poll_options (poll_id, label, display_order, is_active)
select new_poll.id, o.label, o.display_order, true
from new_poll
cross join (values
    ('ANZ', 1),
    ('ASB', 2),
    ('Bank of Baroda NZ', 3),
    ('BNZ', 4),
    ('Kiwibank', 5),
    ('Remitly', 6),
    ('Western Union', 7),
    ('Westpac', 8),
    ('Wise', 9),
    ('Other', 10)
) as o(label, display_order);

-- Which bank do you use for term deposits?
with new_poll as (
  insert into public.polls (
    internal_name, slug, title, question, description,
    hero_subtitle, disclaimer, methodology, privacy_notice,
    poll_type, status, results_visibility, is_public
  )
  select
    'Money poll 2026: term deposits', 'term-deposits-2026', 'Which bank do you use for term deposits?', 'Which bank do you use for term deposits?', null,
    'Tell us which bank holds your main term deposit.',
    'This is an independent, voluntary Webfit News reader poll and is not a scientifically representative survey of New Zealanders.',
    'One response per browser per poll, with a per-network rate limit. Results are shown as percentages only; raw vote counts are never published.',
    'No email address or sign-up is required. Network and browser identifiers are stored only as one-way hashes for duplicate and abuse control.',
    'multiple_choice', 'open', 'live', true
  where not exists (select 1 from public.polls where slug = 'term-deposits-2026')
  returning id
)
insert into public.poll_options (poll_id, label, display_order, is_active)
select new_poll.id, o.label, o.display_order, true
from new_poll
cross join (values
    ('ANZ', 1),
    ('ASB', 2),
    ('Bank of Baroda NZ', 3),
    ('BNZ', 4),
    ('Heartland', 5),
    ('Kiwibank', 6),
    ('Rabobank', 7),
    ('Westpac', 8),
    ('Other', 9),
    ('I don''t have a term deposit', 10)
) as o(label, display_order);

-- Which bank is your home loan with?
with new_poll as (
  insert into public.polls (
    internal_name, slug, title, question, description,
    hero_subtitle, disclaimer, methodology, privacy_notice,
    poll_type, status, results_visibility, is_public
  )
  select
    'Money poll 2026: home loans', 'home-loans-2026', 'Which bank is your home loan with?', 'Which bank is your home loan with?', null,
    'Tell us which bank your main home loan is with.',
    'This is an independent, voluntary Webfit News reader poll and is not a scientifically representative survey of New Zealanders.',
    'One response per browser per poll, with a per-network rate limit. Results are shown as percentages only; raw vote counts are never published.',
    'No email address or sign-up is required. Network and browser identifiers are stored only as one-way hashes for duplicate and abuse control.',
    'multiple_choice', 'open', 'live', true
  where not exists (select 1 from public.polls where slug = 'home-loans-2026')
  returning id
)
insert into public.poll_options (poll_id, label, display_order, is_active)
select new_poll.id, o.label, o.display_order, true
from new_poll
cross join (values
    ('ANZ', 1),
    ('ASB', 2),
    ('Bank of Baroda NZ', 3),
    ('BNZ', 4),
    ('Co-operative Bank', 5),
    ('Kiwibank', 6),
    ('SBS', 7),
    ('TSB', 8),
    ('Westpac', 9),
    ('Other', 10),
    ('I don''t have a home loan', 11)
) as o(label, display_order);

commit;

-- Check (read-only). Expect one row per poll:
--   status = open, results_visibility = live, is_public = true,
--   options = 10, 10 and 11, votes = 0.
select
  p.slug,
  p.status,
  p.results_visibility,
  p.is_public,
  (select count(*) from public.poll_options o where o.poll_id = p.id and o.is_active) as options,
  (select count(*) from public.votes v where v.poll_id = p.id) as votes
from public.polls p
where p.slug in ('send-money-to-india-2026', 'term-deposits-2026', 'home-loans-2026')
order by p.slug;
