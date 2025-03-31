-- ===========================================
-- QuickAudit - Supabase Audit System Installer
-- ===========================================

-- 1. Configuration table to track which tables have auditing enabled
create table if not exists quickaudit_config (
  id uuid primary key default gen_random_uuid(),
  table_name text not null unique,
  audit_enabled boolean default true,
  created_at timestamp with time zone default now()
);

-- 2. Main audit log table
create table if not exists audit_log (
  id bigserial primary key,
  table_name text not null,
  operation text not null,
  row_data jsonb,
  old_data jsonb,
  user_email text,
  timestamp timestamp with time zone default now(),
  reverted boolean default false
);

-- 3. Function to get all user-defined tables (excluding QuickAudit system tables)
create or replace function get_all_tables()
returns table (table_name text) as $$
begin
  return query
  select t.table_name::text
  from information_schema.tables t
  where t.table_schema = 'public'
    and t.table_type = 'BASE TABLE'
    and t.table_name not in ('audit_log', 'quickaudit_config')
  order by t.table_name;
end;
$$ language plpgsql;

-- 4. Function to log INSERT, UPDATE, DELETE operations
create or replace function log_change()
returns trigger as $$
declare
  user_email text;
begin
  begin
    select current_setting('request.headers', true)::json ->> 'x-client-info' into user_email;
  exception
    when others then
      user_email := null;
  end;

  insert into audit_log (
    table_name,
    operation,
    row_data,
    old_data,
    user_email
  ) values (
    TG_TABLE_NAME,
    TG_OP,
    case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end,
    case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end,
    user_email
  );

  return null;
end;
$$ language plpgsql;

-- 5. Function to create triggers automatically on all enabled tables
create or replace function quickaudit_sync_triggers()
returns void as $$
declare
  r record;
  trigger_name text;
begin
  for r in select * from quickaudit_config where audit_enabled loop
    trigger_name := 'trg_' || r.table_name || '_audit';

    -- Create trigger if it does not already exist
    if not exists (
      select 1 from pg_trigger
      where tgname = trigger_name
    ) then
      execute format($f$
        create trigger %I
        after insert or update or delete on %I
        for each row execute procedure log_change();
      $f$, trigger_name, r.table_name);
    end if;
  end loop;
end;
$$ language plpgsql;

-- 6. Initial sync: apply triggers to all enabled tables
select quickaudit_sync_triggers();

-- ✅ Success message
do $$
begin
  raise notice '✅ QuickAudit installed successfully. You can now enable auditing per table using the quickaudit_config table.';
end;
$$;