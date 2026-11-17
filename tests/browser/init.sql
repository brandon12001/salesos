create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit password 'local-test-only-password';
grant anon, authenticated, service_role to authenticator;
create role supabase_auth_admin login createrole password 'local-test-only-password';
create schema auth authorization supabase_auth_admin;
grant usage on schema auth, public to anon, authenticated, service_role;
alter role supabase_auth_admin set search_path to auth;
