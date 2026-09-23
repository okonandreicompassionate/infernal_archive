# Universe OS access setup

## 1. Apply the database schema

Run `supabase/schema.sql` in the Supabase SQL Editor. It creates the `profiles` table, the `admin`/`god` role check, profile creation trigger, and row-level security policy.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for server-side admin invites only

Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `NEXT_PUBLIC_` or `VITE_` variable.

## 3. Create the first god account

In Supabase Dashboard, open **Authentication > Users** and create the first user with email/password. The profile trigger creates that user as a normal `admin` by default.

Run this once in the SQL Editor, replacing the email:

```sql
update public.profiles
set role = 'god'
where email = 'okoncompassionate@gmail.com';
```

The same promotion query is saved in `supabase/god-account.sql`. Create the Auth user with the password in the Supabase Dashboard first; passwords are intentionally not stored in this repository.

The god account can now sign in at the app and use the people icon in the header to invite normal admins.

## 4. Admin workflow

- `god`: full workspace access plus admin invitations.
- `admin`: full workspace access, but no ability to invite users.
- Signed-out visitors: login screen only.

Invited admins receive Supabase's email and set their password through the invite flow.

## 5. Navigation guide

After signing in, click the book icon in the header to open the built-in field guide. It explains the dashboard, archive sections, continuity tools, writer/artist workspaces, Lorekeeper, and access controls.
