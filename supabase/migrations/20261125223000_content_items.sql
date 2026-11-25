-- Content items: posts, carousels and stories produced by the studio.
create table public.content_items (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid not null references public.workspaces(id) on delete cascade,
  content_code           text,
  kind                   text not null check (kind in ('post', 'carousel', 'story', 'video')),
  status                 text not null default 'ready_for_review' check (status in (
                           'idea', 'draft', 'ready_for_review', 'revision_requested', 'approved',
                           'scheduled', 'published', 'rejected', 'failed')),
  title                  text not null check (length(trim(title)) > 0),
  concept                text,
  aspect                 text not null default '4:5' check (aspect in ('4:5', '1:1', '9:16')),
  slides                 jsonb not null default '[]'::jsonb,
  caption                text,
  hashtags               text[] not null default '{}',
  cta                    text,
  alt_text               text,
  missing_facts          text[] not null default '{}',
  feedback               text,
  source_conversation_id uuid references public.cd_conversations(id) on delete set null,
  version                int not null default 1,
  approved_at            timestamptz,
  approved_by            uuid references auth.users(id) on delete set null,
  created_by             uuid references auth.users(id) on delete set null default auth.uid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index content_items_ws_idx on public.content_items (workspace_id, status, created_at desc);
create index content_items_conv_idx on public.content_items (source_conversation_id);
create index content_items_approved_by_idx on public.content_items (approved_by);
create index content_items_created_by_idx on public.content_items (created_by);

create trigger content_items_updated_at before update on public.content_items
  for each row execute function public.set_updated_at();

-- Approval rules enforced in the database, not only in the UI.
create or replace function private.content_items_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  changed boolean := (new.slides, new.caption, new.hashtags, new.aspect, new.title, new.alt_text, new.cta)
                     is distinct from (old.slides, old.caption, old.hashtags, old.aspect, old.title, old.alt_text, old.cta);
begin
  if changed then
    new.version := old.version + 1;
    -- Material edits to approved/scheduled content require approval again.
    if old.status in ('approved', 'scheduled') then
      new.status := 'ready_for_review';
      new.approved_at := null;
      new.approved_by := null;
    end if;
  end if;
  if new.status = 'approved' and old.status <> 'approved' then
    new.approved_at := now();
    new.approved_by := auth.uid();
  end if;
  if new.status in ('scheduled', 'published') and old.status not in ('approved', 'scheduled') then
    raise exception 'Only approved content can be scheduled or published';
  end if;
  return new;
end;
$$;

create trigger content_items_guard before update on public.content_items
  for each row execute function private.content_items_guard();

alter table public.content_items enable row level security;
create policy "members read content" on public.content_items
  for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "editors create content" on public.content_items
  for insert to authenticated with check (private.can_edit_workspace(workspace_id) and status not in ('approved', 'scheduled', 'published'));
create policy "editors change content" on public.content_items
  for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy "editors delete content" on public.content_items
  for delete to authenticated using (private.can_edit_workspace(workspace_id));

revoke all on public.content_items from anon;
grant select, insert, update, delete on public.content_items to authenticated;
grant all on public.content_items to service_role;
