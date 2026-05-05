# Gibraltar Supabase Setup

Early access emails are saved to:

```text
public.early_access_signups
```

## Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Paste and run the SQL in `supabase/early-access.sql`.
4. In your project settings, copy:
   - Project URL
   - `service_role` key
5. Add them to `.env.local`:

```text
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

6. Restart the Next.js dev server.
7. Submit a new email from the early access form.

You should then see rows in Supabase under Table Editor > `early_access_signups`.

## Notes

- Do not use the anon key for `SUPABASE_SERVICE_ROLE_KEY`.
- Do not expose the service role key in browser/client code.
- Submitting the same email again updates the same row instead of creating a duplicate.
- The app does not use Supabase CLI migrations. If you see `supabase_migrations.schema_migrations` errors, that is separate from this MVP signup form. The form only writes to `public.early_access_signups`.

## Naming

Keep the table name `early_access_signups` for now. It describes the data instead of the brand, so you do not need a database migration if the public product name changes again. Use project-level names like `gibraltar` in Supabase project settings, environment labels, and deployment names, but keep durable table names based on what the data stores.
