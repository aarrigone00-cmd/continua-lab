-- Brand DNA integrity rules, enforced in the database (not only in the UI).

-- 1. A product can only be "verified" once its source is recorded.
alter table public.products
  add constraint verified_products_cite_a_source
  check (fact_status = 'needs_review' or length(trim(coalesce(source, ''))) > 0);

-- 2. Only real photography/video may represent an actual product,
--    and the link must stay inside one workspace.
create or replace function private.check_product_asset_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
  p_ws uuid;
begin
  select workspace_id, origin, kind into a from public.brand_assets where id = new.asset_id;
  select workspace_id into p_ws from public.products where id = new.product_id;
  if a.origin <> 'real' then
    raise exception 'AI-generated assets cannot be linked to real products';
  end if;
  if a.kind not in ('photo', 'video') then
    raise exception 'Only photos and videos can be linked to products';
  end if;
  if a.workspace_id <> p_ws or new.workspace_id <> p_ws then
    raise exception 'Product and asset must belong to the same workspace';
  end if;
  return new;
end;
$$;

create trigger product_assets_check
  before insert or update on public.product_assets
  for each row execute function private.check_product_asset_link();

-- 3. An asset can't switch from AI-generated to real while linked to a product.
create or replace function private.block_origin_change_when_linked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.origin <> old.origin and exists (select 1 from public.product_assets where asset_id = new.id) then
    raise exception 'Unlink this asset from its products before changing its origin';
  end if;
  return new;
end;
$$;

create trigger brand_assets_origin_guard
  before update of origin on public.brand_assets
  for each row execute function private.block_origin_change_when_linked();
