# 🧾 QuickAudit Dashboard

**QuickAudit** is a full-featured audit trail dashboard for [Supabase](https://supabase.com/) — built with [ShadCN UI](https://ui.shadcn.dev/) and Tailwind CSS.

It lets you:
- Track changes (`INSERT`, `UPDATE`, `DELETE`) in your database
- Filter logs by table, operation, or user
- Revert changes from the UI
- Toggle audit tracking per table

---

## ⚡ Quick Install

If your project already uses `shadcn/ui`, you can install QuickAudit via:

```bash

npx shadcn@latest add https://quickaudit-supa.vercel.app/r/quickaudit-dashboard.json
```

This will copy the component into `components/quickaudit-dashboard.tsx`.

---

## 🔧 Supabase Setup

Before using the UI, you need to install the audit tracking SQL into your Supabase project:

1. Open the SQL Editor in Supabase
2. Paste and run [`install_quickaudit.sql`](./supabase/install_quickaudit.sql)

This will create:
- `audit_log` and `quickaudit_config` tables
- `log_change()` function
- `get_all_tables()` helper
- `quickaudit_sync_triggers()` RPC function

To enable audit logging for a table:

```sql
insert into quickaudit_config (table_name, audit_enabled)
values ('your_table_name', true)
on conflict do nothing;

select quickaudit_sync_triggers();
```

---

## 🧠 Usage Example

```tsx
import { QuickAuditDashboard } from "@/components/quickaudit-dashboard"

export default function AdminPage() {
  return (
    <QuickAuditDashboard />
  )
}
```

You can also pass an existing Supabase client with the `supabase` prop.

---

## 🔄 Trigger Sync

The UI will automatically try to sync triggers when tables are added. You can also manually sync triggers:

```sql
select quickaudit_sync_triggers();
```

---

## 📁 Files included

- `components/quickaudit-dashboard.tsx`: The main dashboard component
- `components.json`: Metadata for ShadCN UI installation
- `supabase/install_quickaudit.sql`: SQL setup script

---

## 🤝 Contributing

Pull requests and suggestions are welcome!
To test locally:

```bash
npx shadcn-ui add quickaudit-dashboard --from ./ --overwrite
```

---

## 📄 License

MIT — free to use, modify, and distribute.

