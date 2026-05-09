# Gibraltar Supabase Setup

Early access emails are saved to:

```text
public.early_access_signups
```

Approved Gmail users and draft events are stored in:

```text
public.gmail_connections
public.gmail_messages
public.gmail_draft_events
public.business_profiles
public.reply_playbooks
public.follow_up_reminders
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

New signups start with `status = 'pending'`. Approve users from the app admin
page or by changing the row to `status = 'approved'`.

## Notes

- Do not use the anon key for `SUPABASE_SERVICE_ROLE_KEY`.
- Do not expose the service role key in browser/client code.
- Submitting the same email again updates the same row instead of creating a duplicate.
- Gmail OAuth tokens are encrypted before they are saved. Set
  `GMAIL_TOKEN_ENCRYPTION_KEY` to a long random secret before connecting Gmail.
- Google sign-in for app login is configured in Supabase Auth providers. It is
  separate from the direct Gmail OAuth connection used to create Gmail drafts.
- Gmail message summaries and AI triage are stored in `public.gmail_messages`.
  This lets Gibraltar reuse triage on later app loads instead of sending the
  same message back to AI.
- One-sentence email briefs are stored in `public.gmail_messages.ai_summary`.
  They are generated from full Gmail message bodies and reused on later loads.
- Messages marked as junk are hidden from Gibraltar review by setting
  `public.gmail_messages.is_junk`; this does not delete or modify the message in
  Gmail.
- Business profiles store lightweight context used to improve generated Gmail
  drafts. Users can edit their own context from the app workspace.
- Reply playbooks store reusable owner-approved guidance by category. Gibraltar
  can include enabled playbooks during reply generation without storing full
  email bodies.
- Draft events can store the playbook id, title, and category used for a reply
  so Activity and analytics can explain which reusable guidance helped.
- Follow-up reminders are manual reminders only. They do not send emails or
  trigger background jobs in this MVP.
- The app does not use Supabase CLI migrations. If you see `supabase_migrations.schema_migrations` errors, that is separate from this MVP signup form. The form only writes to `public.early_access_signups`.

## Naming

Keep the table name `early_access_signups` for now. It describes the data instead of the brand, so you do not need a database migration if the public product name changes again. Use project-level names like `gibraltar` in Supabase project settings, environment labels, and deployment names, but keep durable table names based on what the data stores.
