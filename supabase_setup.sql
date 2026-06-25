-- eMediaProse · AI Readiness Audit
-- Run this in your Supabase SQL Editor (Database → SQL Editor → New Query)
-- Creates the audit_submissions table for lead capture from the Netlify function

create table if not exists audit_submissions (
  id                 uuid primary key default gen_random_uuid(),
  submitted_at       timestamptz not null default now(),

  -- Identity
  company_name       text,
  industry           text,

  -- Business context
  team_size          text,
  tech_stack         text,
  tech_stack_other   text,
  revenue_workflows  text,

  -- Content & brand assets
  content_home       text,
  content_types      text,
  content_owner      text,

  -- AI exposure
  ai_tools           text,
  ai_use             text,
  ai_readiness       text,

  -- Pain & ambition
  biggest_pain       text,
  time_waste         text,
  win_90             text,

  -- Full Claude-generated report (stored for reference / re-delivery)
  report_generated   text,

  -- Contact (optional)
  contact_email      text,

  -- Metadata
  source             text default 'ai-readiness-audit'
);

-- Index for sorting leads by submission date
create index if not exists idx_audit_submissions_submitted_at
  on audit_submissions (submitted_at desc);

-- Index for filtering by industry (useful for ICP analysis)
create index if not exists idx_audit_submissions_industry
  on audit_submissions (industry);

-- Index for filtering submissions that have an email (for follow-up campaigns)
create index if not exists idx_audit_submissions_contact_email
  on audit_submissions (contact_email)
  where contact_email is not null;

-- Enable Row Level Security (RLS) — service key bypasses this,
-- so your Netlify function can always write; anon users cannot read
alter table audit_submissions enable row level security;

-- Optional: allow your own authenticated Supabase dashboard reads
-- (comment out if you want the table fully locked to service key only)
create policy "Service role full access"
  on audit_submissions
  using (true)
  with check (true);
