-- Expand the existing term-deposit poll without replacing options or votes.
-- Run in Supabase SQL Editor. Safe to re-run.
begin;

do $$
begin
  if not exists (select 1 from public.polls where slug = 'term-deposits-2026') then
    raise exception 'term-deposits-2026 is missing; run money-polls-2026.sql first';
  end if;
end
$$;

insert into public.poll_options (poll_id, label, display_order, is_active)
select p.id, o.label, o.display_order, true
from public.polls p
cross join (values
    ('ANZ', 1),
    ('ASB', 2),
    ('Bank of Baroda NZ', 3),
    ('Bank of China NZ', 4),
    ('Bank of India NZ', 5),
    ('BNZ', 6),
    ('China Construction Bank NZ', 7),
    ('Heartland', 8),
    ('ICBC NZ', 9),
    ('Kiwibank', 10),
    ('Rabobank', 11),
    ('SBS Bank', 12),
    ('The Co-operative Bank', 13),
    ('TSB', 14),
    ('Westpac', 15),
    ('Other', 16),
    ('I don''t have a term deposit', 17)
) as o(label, display_order)
where p.slug = 'term-deposits-2026'
on conflict (poll_id, label) do update
set display_order = excluded.display_order,
    is_active = true;

commit;

-- Verify all 17 options and the unchanged vote counts.
select o.id, o.label, o.display_order, o.is_active,
       count(v.id) as total_votes,
       count(v.id) filter (where v.status::text = 'valid') as valid_votes
from public.polls p
join public.poll_options o on o.poll_id = p.id
left join public.votes v on v.poll_id = p.id and v.option_id = o.id
where p.slug = 'term-deposits-2026'
group by o.id, o.label, o.display_order, o.is_active
order by o.display_order;
