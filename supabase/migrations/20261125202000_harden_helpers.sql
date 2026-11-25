-- Move membership helpers out of the API-exposed schema, add missing
-- foreign-key indexes and split the overlapping member policy.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_workspace_member(uuid) set schema private;
alter function public.can_edit_workspace(uuid) set schema private;
alter function public.is_workspace_owner(uuid) set schema private;
-- Policies reference functions by OID, so they follow the move automatically.

-- Foreign-key indexes
create index if not exists activity_log_actor_idx on public.activity_log (actor_id);
create index if not exists brand_assets_uploaded_by_idx on public.brand_assets (uploaded_by);
create index if not exists products_created_by_idx on public.products (created_by);
create index if not exists products_source_asset_idx on public.products (source_asset_id);

-- One SELECT policy on workspace_members; owners get separate write policies.
drop policy "owners manage members" on public.workspace_members;
create policy "owners add members" on public.workspace_members
  for insert to authenticated with check (private.is_workspace_owner(workspace_id));
create policy "owners change member roles" on public.workspace_members
  for update to authenticated using (private.is_workspace_owner(workspace_id)) with check (private.is_workspace_owner(workspace_id));
create policy "owners remove members" on public.workspace_members
  for delete to authenticated using (private.is_workspace_owner(workspace_id));
