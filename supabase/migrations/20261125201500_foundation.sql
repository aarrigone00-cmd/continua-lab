-- =====================================================================
-- CONTINUA LAB · Foundation schema
-- Workspaces (white-label ready), Brand DNA (products + assets),
-- activity log, API usage ledger and studio settings.
-- Every table has Row Level Security; access is by workspace membership.
-- =====================================================================

-- ---------- helpers --------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- workspaces ----------------------------------------------

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

-- Membership checks run with definer rights so policies can use them
-- without recursing through workspace_members' own RLS.
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_edit_workspace(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'editor')
  );
$$;

create or replace function public.is_workspace_owner(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.can_edit_workspace(uuid) from public, anon;
revoke execute on function public.is_workspace_owner(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.can_edit_workspace(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;

create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ---------- studio settings -----------------------------------------

create table public.workspace_settings (
  workspace_id             uuid primary key references public.workspaces(id) on delete cascade,
  videos_per_month         int  not null default 20 check (videos_per_month between 0 and 200),
  video_min_seconds        int  not null default 30 check (video_min_seconds > 0),
  video_max_seconds        int  not null default 45 check (video_max_seconds >= video_min_seconds),
  content_language         text not null default 'en',
  -- Monthly mix of the 20 videos, editable in Settings.
  category_mix             jsonb not null default '{
    "interior_design_education": 5,
    "product_spotlight": 4,
    "materials_craftsmanship": 3,
    "design_trends": 3,
    "styling_tips_mistakes": 3,
    "showroom_brand_story": 2
  }'::jsonb,
  require_script_approval  boolean not null default true,
  monthly_budget_usd       numeric(10,2) not null default 100 check (monthly_budget_usd >= 0),
  automation_paused        boolean not null default true,
  grok_enabled             boolean not null default false,
  updated_at               timestamptz not null default now()
);

create trigger workspace_settings_updated_at before update on public.workspace_settings
  for each row execute function public.set_updated_at();

-- ---------- brand assets --------------------------------------------

create table public.brand_assets (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  kind          text not null check (kind in ('photo', 'video', 'catalog', 'logo', 'font', 'guideline', 'document', 'other')),
  -- Real photography and AI imagery are never mixed up.
  origin        text not null check (origin in ('real', 'ai_generated')),
  ai_model      text,
  title         text not null check (length(trim(title)) > 0),
  description   text,
  storage_path  text not null unique,
  mime_type     text,
  size_bytes    bigint check (size_bytes >= 0),
  width         int,
  height        int,
  tags          text[] not null default '{}',
  approval      text not null default 'pending' check (approval in ('pending', 'approved', 'rejected')),
  source        text,
  uploaded_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint ai_assets_name_their_model check (origin = 'real' or ai_model is not null),
  constraint storage_path_in_workspace check (split_part(storage_path, '/', 1) = workspace_id::text)
);
create index brand_assets_workspace_idx on public.brand_assets (workspace_id, kind, approval);
create index brand_assets_tags_idx on public.brand_assets using gin (tags);

create trigger brand_assets_updated_at before update on public.brand_assets
  for each row execute function public.set_updated_at();

-- ---------- products -------------------------------------------------

create table public.products (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  name             text not null check (length(trim(name)) > 0),
  sku              text,
  category         text not null check (category in ('furniture', 'surface', 'finish', 'lighting', 'accessory', 'other')),
  collection       text,
  designer         text,
  maker            text,
  materials        text[] not null default '{}',
  finishes         text[] not null default '{}',
  dimensions       text,
  description      text,
  -- Where these facts came from (catalog page, website URL, supplier sheet).
  source           text,
  source_asset_id  uuid references public.brand_assets(id) on delete set null,
  -- Facts start unverified; Claude may only rely on verified products.
  fact_status      text not null default 'needs_review' check (fact_status in ('needs_review', 'verified')),
  review_notes     text,
  created_by       uuid references auth.users(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (workspace_id, sku)
);
create index products_workspace_idx on public.products (workspace_id, category, fact_status);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_assets (
  product_id   uuid not null references public.products(id) on delete cascade,
  asset_id     uuid not null references public.brand_assets(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  is_primary   boolean not null default false,
  primary key (product_id, asset_id)
);
create index product_assets_asset_idx on public.product_assets (asset_id);
create index product_assets_workspace_idx on public.product_assets (workspace_id);

-- ---------- activity log & API usage ---------------------------------

create table public.activity_log (
  id           bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id     uuid references auth.users(id) on delete set null default auth.uid(),
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index activity_log_workspace_idx on public.activity_log (workspace_id, created_at desc);

-- Written only by backend functions (service role); readable by members.
create table public.api_usage (
  id                  bigint generated always as identity primary key,
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  provider            text not null check (provider in ('anthropic', 'xai', 'heygen', 'canva', 'metricool', 'supabase', 'other')),
  operation           text not null,
  units               jsonb not null default '{}'::jsonb,
  estimated_cost_usd  numeric(12,4) check (estimated_cost_usd >= 0),
  actual_cost_usd     numeric(12,4) check (actual_cost_usd >= 0),
  created_at          timestamptz not null default now()
);
create index api_usage_workspace_idx on public.api_usage (workspace_id, created_at desc);

-- ---------- Row Level Security ---------------------------------------

alter table public.workspaces         enable row level security;
alter table public.workspace_members  enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.brand_assets       enable row level security;
alter table public.products           enable row level security;
alter table public.product_assets     enable row level security;
alter table public.activity_log       enable row level security;
alter table public.api_usage          enable row level security;

-- workspaces
create policy "members read their workspaces" on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
create policy "owners rename their workspaces" on public.workspaces
  for update to authenticated using (public.is_workspace_owner(id)) with check (public.is_workspace_owner(id));

-- workspace_members
create policy "members see who is in their workspace" on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "owners manage members" on public.workspace_members
  for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

-- workspace_settings
create policy "members read settings" on public.workspace_settings
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "owners change settings" on public.workspace_settings
  for update to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

-- brand_assets
create policy "members read assets" on public.brand_assets
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "editors add assets" on public.brand_assets
  for insert to authenticated with check (public.can_edit_workspace(workspace_id));
create policy "editors change assets" on public.brand_assets
  for update to authenticated using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "editors remove assets" on public.brand_assets
  for delete to authenticated using (public.can_edit_workspace(workspace_id));

-- products
create policy "members read products" on public.products
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "editors add products" on public.products
  for insert to authenticated with check (public.can_edit_workspace(workspace_id));
create policy "editors change products" on public.products
  for update to authenticated using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "editors remove products" on public.products
  for delete to authenticated using (public.can_edit_workspace(workspace_id));

-- product_assets
create policy "members read product links" on public.product_assets
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "editors link assets" on public.product_assets
  for insert to authenticated with check (public.can_edit_workspace(workspace_id));
create policy "editors unlink assets" on public.product_assets
  for delete to authenticated using (public.can_edit_workspace(workspace_id));

-- activity_log: append-only for members
create policy "members read activity" on public.activity_log
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members record activity" on public.activity_log
  for insert to authenticated with check (public.is_workspace_member(workspace_id) and actor_id = (select auth.uid()));

-- api_usage: read-only from the app
create policy "members read usage" on public.api_usage
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- Nothing is readable without signing in.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------- private file storage -------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets', 'brand-assets', false, 52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/pdf',
    'font/otf', 'font/ttf', 'font/woff', 'font/woff2'
  ]
)
on conflict (id) do nothing;

-- Files live under "<workspace_id>/…"; only that workspace's members reach them.
create policy "members read brand files" on storage.objects
  for select to authenticated
  using (bucket_id = 'brand-assets' and public.is_workspace_member(((storage.foldername(name))[1])::uuid));
create policy "editors upload brand files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.can_edit_workspace(((storage.foldername(name))[1])::uuid));
create policy "editors replace brand files" on storage.objects
  for update to authenticated
  using (bucket_id = 'brand-assets' and public.can_edit_workspace(((storage.foldername(name))[1])::uuid));
create policy "editors delete brand files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brand-assets' and public.can_edit_workspace(((storage.foldername(name))[1])::uuid));
