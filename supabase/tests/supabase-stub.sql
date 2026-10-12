-- Minimal stand-in for the parts of Supabase that our migrations rely on, so
-- the migrations and RLS tests can run against a plain local Postgres.
-- Never run this against the real Supabase project.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

grant usage on schema public to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key,
  email text
);

-- Same behaviour as Supabase's auth.uid(): the "sub" claim of the request JWT.
create function auth.uid() returns uuid
language sql stable
as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub', '')::uuid
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;
