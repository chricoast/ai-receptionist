# AI Receptionist

An AI receptionist for small, booking-based businesses: it answers customer messages in Czech and English using only the business's own information, and hands over to a human when it isn't sure. See `CLAUDE.md` for the full brief, decisions and status.

**Milestone 1 (done):** accounts, a business profile, a 6-step onboarding wizard (basics, contact & booking link, services & prices, opening hours, FAQs, tone & "never answer" rules), settings to edit it all later, and a dashboard. Czech and English UI.

---

## One-time setup (by hand)

### 1. Create the database tables in Supabase

1. Open your Supabase project, then **SQL Editor** in the left menu, then **New query**.
2. Open [`supabase/migrations/20261012120000_business_profile.sql`](supabase/migrations/20261012120000_business_profile.sql), copy **all** of it, paste it into the editor and click **Run**. It should say "Success. No rows returned".
3. Check under **Table Editor**: you should see `businesses`, `business_members`, `services`, `opening_hours`, `opening_hour_exceptions`, `faqs`, `rules`. Each one should be marked as protected by RLS.

Run each migration file **once**, in date order. Future milestones will add new files.

### 2. Login settings in Supabase

Under **Authentication**:

- **URL Configuration**
  - **Site URL:** your live address, e.g. `https://ai-receptionist.vercel.app` (once Vercel gives you one, see step 3). Email links point here.
  - **Redirect URLs:** add `http://localhost:3000/**` and `https://*.vercel.app/**`.
- **Sign In / Providers → Email:** keep **Confirm email** on. Set the minimum password length to **8**.
- **Emails → Templates:** replace two templates so that email links work even when opened on a different device (e.g. sign up on a laptop, click the link on a phone):
  - **Confirm signup:** subject `Potvrďte svůj e-mail / Confirm your email`, body: the contents of [`supabase/templates/confirmation.html`](supabase/templates/confirmation.html)
  - **Reset password:** subject `Nové heslo / Reset your password`, body: the contents of [`supabase/templates/recovery.html`](supabase/templates/recovery.html)

> Supabase's built-in email sender only allows a few emails per hour. That's fine for testing; before real clients we'll connect Resend (Authentication → Emails → SMTP).

### 3. Put it online with Vercel

1. On [vercel.com](https://vercel.com), click **Add New → Project** and import the `ai-receptionist` GitHub repository. Vercel detects Next.js by itself.
2. Before clicking Deploy, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://dfavqhhjkbkothdybtkb.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: your `sb_publishable_…` key
3. Deploy. Every branch also gets its own preview address. The main address follows the `main` branch.
4. Put the main address into Supabase as the **Site URL** (step 2).

**Never add the Supabase secret / service_role key to Vercel or anywhere with `NEXT_PUBLIC_` in its name.**

---

## How to test Milestone 1

On your phone and on a computer:

1. **Sign up** with a real email. You should see "Check your email".
2. Click the link in the email. You land on step 1 of the onboarding.
3. Go through all 6 steps. Try the suggestion chips (they add a service or question; you fill in the price or answer). Leave halfway and log back in: you should continue where you left off.
4. On the **Dashboard**, the checklist should match what you entered.
5. In **Settings**, change something, click **Save**, reload the page: the change is still there.
6. Switch the language (CS / EN, top right). All text should change.
7. **Forgot password:** log out, request a reset link, set a new password, log in with it.
8. **Data isolation:** sign up with a second email (in a private window) and create another business. Neither account should ever see the other's data.

---

## For developers

```bash
cp .env.example .env.local   # then fill in the two values
npm install
npm run dev                  # http://localhost:3000
```

Checks: `npm run typecheck`, `npm run lint`, `npm test` (unit tests), `npm run test:db` (migrations and RLS isolation tests on a throwaway local Postgres).

With Docker you can run a full local Supabase: `npx supabase start` (emails go to Mailpit at http://localhost:54324), then point `.env.local` at the URL and key it prints.

Project layout:

- `src/app/`: pages. `(auth)` holds login/sign-up; `(app)` holds the logged-in area (dashboard, onboarding, settings).
- `src/components/profile/`: one form per profile section, used by both onboarding and settings.
- `src/lib/profile/`: section list, validation (`schemas.ts`), saving (`actions.ts`), per-type suggestions.
- `src/lib/supabase/`: Supabase clients. `src/proxy.ts` refreshes the login session and protects pages.
- `src/messages/`: Czech and English UI texts.
- `supabase/migrations/`: database changes (run in order). `supabase/tests/`: RLS tests.
