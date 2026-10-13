# AI Receptionist

An AI receptionist for small, booking-based businesses: it answers customer messages in Czech and English using only the business's own information, and hands over to a human when it isn't sure. See `CLAUDE.md` for the full brief, decisions and status.

**Milestone 1 (done):** accounts, a business profile, a 6-step onboarding wizard (basics, contact & booking link, services & prices, opening hours, FAQs, tone & "never answer" rules), settings to edit it all later, and a dashboard. Czech and English UI.

**Milestone 2 (done, waiting for the live test):** a chat bubble for the business's website. Customers ask, Claude answers from the business profile, and hands over to the team when it isn't sure (the conversation is marked "needs a human" and the customer is asked for contact details). Settings → **Chat na webu** has the code to paste and a live test chat.

---

## One-time setup (by hand)

### 1. Create the database tables in Supabase

1. Open your Supabase project, then **SQL Editor** in the left menu, then **New query**.
2. Open [`supabase/migrations/20261012120000_business_profile.sql`](supabase/migrations/20261012120000_business_profile.sql), copy **all** of it, paste it into the editor and click **Run**. It should say "Success. No rows returned".
3. Check under **Table Editor**: you should see `businesses`, `business_members`, `services`, `opening_hours`, `opening_hour_exceptions`, `faqs`, `rules`. Each one should be marked as protected by RLS.

Run each migration file **once**, in date order. Future milestones will add new files. So far there are five:

| File | What it does |
|---|---|
| `20261012120000_business_profile.sql` | Creates the tables and their security rules |
| `20261012180000_profile_hardening.sql` | Extra checks: web addresses must start with http(s), plan values, safe "create business" |
| `20261013090000_web_chat.sql` | Chat tables: channels, contacts, conversations, messages (with security rules) |
| `20261013120000_free_text_business_type.sql` | Type of business becomes free text (in the owner's own words) |
| `20261013150000_lead_mode.sql` | Lead mode: receptionist goal, questions to ask, website knowledge, enquiry summaries |

### 2. Login settings in Supabase

Under **Authentication**:

- **URL Configuration**
  - **Site URL:** your live address, e.g. `https://ai-receptionist-lac-mu.vercel.app`, without a `/` at the end (once Vercel gives you one, see step 3). Email links point here.
  - **Redirect URLs:** add `http://localhost:3000/**` and your exact live address with `/**` at the end, e.g. `https://ai-receptionist-lac-mu.vercel.app/**`. Don't use `https://*.vercel.app/**`: that would allow login links to point to anyone's Vercel site.
- **Sign In / Providers → Email:** keep **Confirm email** on. Set the minimum password length to **8**.
- **Emails → Templates:** leave the defaults for now. Supabase only allows editing templates once you connect your own email sender (SMTP), which we'll do with Resend in Milestone 4. Then paste in [`supabase/templates/confirmation.html`](supabase/templates/confirmation.html) and [`supabase/templates/recovery.html`](supabase/templates/recovery.html), so email links also log people in when opened on another device. Until then: if someone opens the confirmation link in a different browser, their email is still confirmed and the app asks them to log in.

> Supabase's built-in email sender only allows a few emails per hour. That's fine for testing; before real clients we'll connect Resend (Authentication → Emails → SMTP).

### 3. Put it online with Vercel

1. On [vercel.com](https://vercel.com), click **Add New → Project** and import the `ai-receptionist` GitHub repository. Vercel detects Next.js by itself.
2. Before clicking Deploy, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://dfavqhhjkbkothdybtkb.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: your `sb_publishable_…` key
   - `NEXT_PUBLIC_SITE_URL`: your live address, e.g. `https://ai-receptionist-lac-mu.vercel.app` (used in email links)
   - `ANTHROPIC_API_KEY` **(secret)**: from console.anthropic.com → API Keys. Set a monthly spend limit there (Settings → Billing).
   - `SUPABASE_SECRET_KEY` **(secret)**: Supabase → Project Settings → API Keys → Secret keys (`sb_secret_…`). Used only by the server for the public chat widget.
3. Deploy. Every branch also gets its own preview address. The main address follows the `main` branch.
4. Put the main address into Supabase as the **Site URL** (step 2).

**The two secret keys must never get a `NEXT_PUBLIC_` name, be pasted into a chat, or be committed to the code.** `NEXT_PUBLIC_` values are sent to every visitor's browser.

### 4. Own address: receptionist.costahub.co

1. Vercel → the project → **Settings → Domains → Add**, type `receptionist.costahub.co`. Vercel shows a DNS record to create (a `CNAME` named `receptionist`, value like `cname.vercel-dns.com` or a project-specific one: use exactly what Vercel shows).
2. Where `costahub.co` is managed (it looks like Cloudflare) → **DNS → Add record**: type `CNAME`, name `receptionist`, target from step 1. In Cloudflare set the cloud icon to **DNS only** (grey), otherwise Vercel can't issue the HTTPS certificate.
3. Wait until Vercel shows a green "Valid Configuration" (minutes, sometimes up to an hour).
4. Vercel → **Settings → Environment Variables**: change `NEXT_PUBLIC_SITE_URL` to `https://receptionist.costahub.co`, then **Deployments → … → Redeploy** (`NEXT_PUBLIC_` values are baked in at build time).
5. Supabase → **Authentication → URL Configuration**: **Site URL** `https://receptionist.costahub.co`; add `https://receptionist.costahub.co/**` to **Redirect URLs**. Keep the old `vercel.app` entry until everything works, then remove it.
6. Settings → **Chat na webu** now shows the snippet with the new address. Keep the old `vercel.app` address working (Vercel does that automatically), so any snippet already pasted somewhere keeps working.

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

## How to test Milestone 2 (chat widget)

1. Settings → **Chat na webu**. In "Vyzkoušejte svou recepční" ask what customers ask: prices, opening hours ("máte teď otevřeno?"), booking, something that is NOT in your profile, a "never answer" topic, and something in English.
2. Check: answers use only your information; unknown things are handed over ("ověřím s kolegy") with a request for your name and phone; English questions get English answers.
3. Paste the code into a real website (or costahub.co) and try it on your phone.
4. The dashboard shows the number of website conversations and how many are waiting for you (test chats from settings don't count).

---

## For developers

```bash
cp .env.example .env.local   # then fill in the two values
npm install
npm run dev                  # http://localhost:3000
```

Checks: `npm run typecheck`, `npm run lint`, `npm test` (unit tests), `npm run test:db` (migrations and RLS isolation tests on a throwaway local Postgres), `npm run eval` (the receptionist test set against the real Claude API: needs `ANTHROPIC_API_KEY`, costs roughly 10–50 Kč per run).

With Docker you can run a full local Supabase: `npx supabase start` (emails go to Mailpit at http://localhost:54324), then point `.env.local` at the URL and key it prints.

Project layout:

- `src/app/`: pages. `(auth)` holds login/sign-up; `(app)` holds the logged-in area (dashboard, onboarding, settings).
- `src/components/profile/`: one form per profile section, used by both onboarding and settings.
- `src/lib/profile/`: section list, validation (`schemas.ts`), saving (`actions.ts`), per-type suggestions.
- `src/lib/supabase/`: Supabase clients. `src/proxy.ts` refreshes the login session and protects pages.
- `src/messages/`: Czech and English UI texts.
- `src/lib/ai/`: the receptionist: instructions + business info for Claude (`prompt.ts`) and the Claude call (`receptionist.ts`).
- `src/lib/chat/`: chat logic for the widget (visitor tokens, rate limits, handover). `src/app/api/widget/` is its API; `src/app/widget/[key]` the chat window; `public/widget.js` the snippet that shows the bubble.
- `evals/`: the receptionist test set (4 test businesses, ~30 customer questions).
- `supabase/migrations/`: database changes (run in order). `supabase/tests/`: RLS tests.
