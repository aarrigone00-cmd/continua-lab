-- Extra brand-brief fields for the creative philosophy and the visual direction.
alter table public.brand_brief
  add column if not exists creative_philosophy text,
  add column if not exists visual_direction text;
