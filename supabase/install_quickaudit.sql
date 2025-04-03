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
$$ language plpgsql security definer;

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
$$ language plpgsql security definer;

-- 5. Function to create triggers automatically on all enabled tables
create or replace function quickaudit_sync_triggers()
returns void as $$
declare
  r record;
  trigger_name text;
begin
  -- Create triggers for enabled tables
  for r in select * from quickaudit_config where audit_enabled = true loop
    trigger_name := 'trg_' || r.table_name || '_audit';

    -- Create trigger if it does not already exist
    if not exists (
      select 1 from pg_trigger
      join pg_class on pg_trigger.tgrelid = pg_class.oid
      where pg_trigger.tgname = trigger_name
      and pg_class.relname = r.table_name
    ) then
      execute format($f$
        create trigger %I
        after insert or update or delete on %I
        for each row execute procedure log_change();
      $f$, trigger_name, r.table_name);
    end if;
  end loop;
  
  -- Drop triggers for disabled tables
  for r in select * from quickaudit_config where audit_enabled = false loop
    trigger_name := 'trg_' || r.table_name || '_audit';
    
    -- Drop trigger if it exists
    if exists (
      select 1 from pg_trigger
      join pg_class on pg_trigger.tgrelid = pg_class.oid
      where pg_trigger.tgname = trigger_name
      and pg_class.relname = r.table_name
    ) then
      execute format($f$
        drop trigger if exists %I on %I;
      $f$, trigger_name, r.table_name);
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- 6. Create a safer RLS-compliant function to toggle audit
create or replace function toggle_table_audit(table_name text, enable boolean)
returns void as $$
declare
  table_id uuid;
begin
  -- Update the config table
  update quickaudit_config 
  set audit_enabled = enable
  where quickaudit_config.table_name = $1
  returning id into table_id;
  
  -- Run the trigger sync function
  perform quickaudit_sync_triggers();
end;
$$ language plpgsql security definer;

-- 7. Create a function to enable all tables
create or replace function enable_all_audits()
returns void as $$
begin
  update quickaudit_config set audit_enabled = true
  where audit_enabled = false;
  
  perform quickaudit_sync_triggers();
end;
$$ language plpgsql security definer;

-- 8. Initial sync: apply triggers to all enabled tables
select quickaudit_sync_triggers();

-- ✅ Success message
do $$
begin
  raise notice '✅ QuickAudit installed successfully. You can now enable auditing per table using the quickaudit_config table.';
end;
$$;