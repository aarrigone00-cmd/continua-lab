-- Marks assets whose title/description/tags were written by Claude's vision pass.
alter table public.brand_assets
  add column if not exists auto_described_at timestamptz,
  add column if not exists auto_description_model text;
