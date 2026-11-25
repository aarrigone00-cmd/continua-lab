-- Creative Director: brand brief + conversations with Claude.

create table public.brand_brief (
  workspace_id   uuid primary key references public.workspaces(id) on delete cascade,
  summary        text,  -- what the company is and what makes it different
  offerings      text,  -- furniture, surfaces, finishes, services
  showroom       text,  -- location and what people should do there
  brands         text,  -- makers/designers represented (public names only)
  audience       text,  -- ranked audiences
  voice          text,  -- tone in a few words
  never_sound    text,  -- tones to avoid
  avoid_words    text,  -- words, phrases, emoji rules
  inspirations   text,  -- accounts/brands admired
  language       text not null default 'English (US)',
  presenter      text,  -- digital twin (with consent) or stock avatar
  off_limits     text,  -- topics, competitors, claims not allowed
  updated_at     timestamptz not null default now()
);

create trigger brand_brief_updated_at before update on public.brand_brief
  for each row execute function public.set_updated_at();

create table public.cd_conversations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title        text not null default 'New conversation',
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index cd_conversations_ws_idx on public.cd_conversations (workspace_id, updated_at desc);
create index cd_conversations_created_by_idx on public.cd_conversations (created_by);

create trigger cd_conversations_updated_at before update on public.cd_conversations
  for each row execute function public.set_updated_at();

create table public.cd_messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references public.cd_conversations(id) on delete cascade,
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  model           text,
  usage           jsonb,
  created_at      timestamptz not null default now()
);
create index cd_messages_conv_idx on public.cd_messages (conversation_id, id);
create index cd_messages_ws_idx on public.cd_messages (workspace_id);

alter table public.brand_brief      enable row level security;
alter table public.cd_conversations enable row level security;
alter table public.cd_messages      enable row level security;

create policy "members read brief" on public.brand_brief
  for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "editors write brief" on public.brand_brief
  for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy "editors update brief" on public.brand_brief
  for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));

create policy "members read conversations" on public.cd_conversations
  for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "editors start conversations" on public.cd_conversations
  for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy "editors rename conversations" on public.cd_conversations
  for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy "editors delete conversations" on public.cd_conversations
  for delete to authenticated using (private.can_edit_workspace(workspace_id));

-- Messages are written only by the backend function (service role); members read them.
create policy "members read messages" on public.cd_messages
  for select to authenticated using (private.is_workspace_member(workspace_id));

revoke all on public.brand_brief, public.cd_conversations, public.cd_messages from anon;
grant select, insert, update, delete on public.brand_brief, public.cd_conversations to authenticated;
grant select on public.cd_messages to authenticated;

insert into public.brand_brief (workspace_id) select id from public.workspaces on conflict do nothing;
