# Webfit News Community Pulse 2026

Premium Next.js + Supabase polling platform for Webfit News.

## Included

- Premium public homepage
- Public poll pages
- Supabase connection
- Secure admin login
- Admin dashboard
- Create and edit polls
- Open, pause and close controls
- Private, live and published results controls
- Add and remove poll options
- Audit-log writes for major admin actions
- Webfit Solutions Limited footer link
- RLS-compatible public reads

## Not yet included

The OTP voting workflow is intentionally left for the next phase because it needs:
- transactional email provider
- rate limiting
- CAPTCHA
- abuse prevention
- secure OTP hashing
- final Electoral Commission review wording

The current public poll page clearly labels the voting module as pending.

## Setup

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase values
3. Run:

```bash
npm install
npm run dev
```

## Create the first admin

In Supabase:

1. Authentication
2. Users
3. Add user
4. Create an email and password

Then run this SQL in Supabase SQL Editor, replacing the values:

```sql
insert into public.admin_users (
  id,
  full_name,
  email,
  role,
  is_active
)
select
  id,
  'Sandy',
  email,
  'owner',
  true
from auth.users
where email = 'YOUR_ADMIN_EMAIL'
on conflict (id)
do update set
  full_name = excluded.full_name,
  role = 'owner',
  is_active = true;
```

## Deployment

Push to GitHub. Vercel will deploy automatically.

Add the same environment variables in:
Vercel > Project > Settings > Environment Variables

## Domain

Production URL:
https://poll.webfitnews.co.nz

## Footer

Powered by Webfit Solutions Limited:
https://webfitt.co.nz

## Luxon Leadership Pulse, no OTP

This package includes a low-friction `leadership_pulse` poll mode for the August 2026 Christopher Luxon reader pulse.

After deployment, run `LUXON_LEADERSHIP_PULSE_SETUP.sql` in Supabase SQL Editor.

Public URL after setup:
`https://poll.webfitnews.co.nz/polls/luxon-leadership-pulse-2026`

This mode collects no email address and sends no OTP. It uses a pseudonymous browser cookie plus hashed technical signals for basic repeat-vote and rate-limit controls. It is intentionally labelled as an open reader pulse, not a scientific or representative election poll.
