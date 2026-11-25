-- New Supabase projects do not grant table privileges automatically.
-- The backend (Edge Functions, service role) needs full access; RLS still protects browser users.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
-- Signed-in users need sequences for identity columns they insert into (activity_log).
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
