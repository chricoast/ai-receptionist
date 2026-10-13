# Project brief: AI Receptionist for small businesses

> Working name: **AI Receptionist** (final product name TBD — keep the name in one config constant so it's easy to change).
> This file is read by Claude Code at the start of every session. Keep it up to date as decisions change.

## What we are building

A web app (SaaS) that gives small, booking-based businesses an **AI receptionist**: it answers every customer message instantly, in Czech and English, using the business's own information — and hands off to a human when it isn't sure.

This is the **first member of an "AI team"** for small businesses. Later employees (not in scope now, but the architecture should not block them):
1. **Receptionist** ← we are building this
2. Marketer (content ideas, posts, offers on slow days)
3. Office manager (invoices, payment reminders, receipts, deadlines)
4. Analyst (insights: busy/slow times, top services, pricing)

All future assistants will share one **business knowledge base** ("business brain"). Design the data model around a central `business` with its profile, services and conversation history, so later assistants can read from it.

## Who it's for

Booking- and reservation-based local businesses where customers message before they book or come in: salons, barbers, clinics (physio, massage), tattoo artists, pilates/yoga studios, cafés and restaurants with reservations, service shops.

**Market:** Czech Republic first (Prague). Czech is the primary language; English must work equally well. UI in Czech and English.

**First test clients** (real businesses, already clients of CostaHub — the founder's social media agency):
- Tattoo artist — long conversations, design questions, deposits (hardest case)
- Pilates studio — class schedules, memberships, cancellations (very repetitive)
- Café — table reservations, opening hours (simple, high volume)
- Bike clinic with an e-shop — service appointments + stock / order questions

If it works for all four, it generalises. Customer zero is **costahub.co** itself.

## Core principles

- **Never make things up.** The AI answers only from the business profile and FAQs. If the answer isn't there, it says it will check with the team and hands off. A wrong price or wrong opening hour is worse than a slow answer.
- **Owner stays in control.** Every conversation is visible. The owner can take over any conversation at any time. There is an optional "approve replies before sending" mode for new businesses.
- **"Never answer" rules.** Each business can list topics the AI must always hand off (e.g. medical advice, custom pricing, complaints, refunds).
- **Multi-tenant from day one.** Every row belongs to a business; one business must never see another's data. Enforce this in the database (Supabase Row Level Security), not just in app code.
- **Simple for non-technical owners.** Onboarding should take under 15 minutes.
- **Mobile-friendly.** Owners will mostly check the inbox on their phone. Later: installable as a PWA.

## Tech stack

- **Next.js** (App Router, TypeScript) — web app, API routes
- **Tailwind CSS** — styling
- **Supabase** — Postgres database, auth, Row Level Security, realtime (for the live inbox)
- **Vercel** — hosting and deployment
- **Claude API** (Anthropic) — the receptionist's brain
- **Resend** (or similar) — transactional email (handoff notifications, weekly summary)
- **Meta Graph API** — Instagram and Facebook Messenger DMs (milestone 5; WhatsApp Business later)

Secrets (API keys) live only in environment variables (`.env.local` locally, Vercel env vars in production). Never commit them. Never expose server keys to the browser.

## Data model (first draft — refine as we build)

- `businesses` — name, type (salon, café, tattoo…), languages, timezone, booking link, tone of voice, plan
- `business_members` — users who can access a business (owner, staff), role
- `services` — name, description, price or price range, duration
- `opening_hours` — per weekday, plus exceptions (holidays)
- `faqs` — question, answer
- `rules` — "never answer" topics and other instructions for the AI
- `channels` — connected channels per business (web_chat, instagram, facebook, whatsapp), with config/tokens
- `contacts` — the end customers (name if known, channel identifiers)
- `conversations` — business, contact, channel, status (`ai_active`, `needs_human`, `human_active`, `closed`), timestamps
- `messages` — conversation, sender (`customer`, `ai`, `human`), content, created_at, metadata (e.g. whether the AI was confident)

## How the receptionist works

1. A customer message arrives (web chat now, Instagram/Facebook later) → stored in `messages`.
2. If the conversation is `human_active`, the AI does nothing.
3. Otherwise build the AI context: business profile, services, hours, FAQs, rules, recent conversation history.
4. Call Claude with a system prompt that enforces: answer only from the provided business info; reply in the customer's language; short, friendly, matching the business's tone; share the booking link when someone wants to book; if unsure or a rule applies, hand off.
5. The AI returns a reply **and** a decision (`answer` or `handoff`). Use structured output for this.
6. On `handoff`: send a polite holding message ("I'll check with the team and get back to you"), set the status to `needs_human`, and notify the owner (email now, push later).
7. ~~Approve mode for all replies~~ dropped (founder: owners would drown in approvals). Instead, sensitive/risky topics are always handed over; Milestone 4 may add "approval only for risky replies".

## Milestones (build in this order — one at a time, test before moving on)

1. **Accounts & business profile** — sign-up/login, create a business, onboarding flow to enter services, prices, hours, FAQs, booking link, tone and "never answer" rules. Editable later in settings.
2. **Website chat widget** — an embeddable script (`<script>` snippet) the business pastes into its website. Opens a chat bubble; messages go to our backend; the AI replies from the business profile. No Meta approval needed, so this is our first real test with customers.
3. **Owner inbox** — dashboard listing all conversations with status, live updates, and the ability to read, take over, reply and hand back to the AI.
4. **Handoff & notifications** — the handoff logic above, plus email notifications to the owner. Possibly: approval only for replies the AI marks as risky/sensitive (no approve-everything mode).
5. **Instagram & Facebook DMs** — connect via Meta Graph API (OAuth to connect a business's page/account, webhooks for incoming messages, respect Meta's 24-hour messaging window). *Meta app review takes weeks — start the application in parallel with milestones 1–2.*
6. **Weekly summary** — email to the owner: number of conversations, answered by AI vs. handed off, common questions, suggested FAQs to add.

**Later (v2):** WhatsApp Business, booking-system integrations (e.g. Reservio, Fresha, Google Calendar), missed-call text-back, review requests after visits, e-shop order lookup, payments/subscriptions (Stripe), PWA with push notifications.

## How to work on this project (for Claude Code)

- The founder is not a professional developer. **Explain what you're doing in plain language**, especially anything about security, secrets, databases and deployment. Say what he needs to do by hand (e.g. create a Supabase project, add an env variable).
- Work **one milestone at a time**. Before building, propose a short plan; after building, explain how to test it.
- Prefer simple, well-known solutions over clever ones. Avoid adding libraries unless they clearly save work.
- Keep all UI text translatable (Czech + English) from the start.
- Write database changes as Supabase migrations, with RLS policies for every table.
- After each milestone, update the "Status" section below.

## Technical decisions (keep this list current)

- **Next.js 16** with the App Router. Its docs ship in `node_modules/next/dist/docs/` (see `AGENTS.md`): read them, APIs differ from older versions. `middleware.ts` is now `src/proxy.ts`.
- **Cache Components is off** (`cacheComponents: false` in `next.config.ts`): nearly every page is per-user and per-language, so plain request-time rendering is simpler. Revisit before upgrading to Next.js 17, where it becomes mandatory.
- **UI language** is chosen by a cookie (`NEXT_LOCALE`), falling back to the browser language; there are no `/cs` or `/en` URL prefixes. Translations live in `src/messages/{cs,en}.json` and use `next-intl` (ICU syntax, so Czech plurals work: 1 služba / 3 služby / 5 služeb). A test checks both files have the same keys.
- **Business content is entered once**, in the owner's main language (first of `businesses.languages`). The AI replies in the customer's language.
- **Login:** Supabase email + password with email confirmation. Email links go to `/auth/confirm`, which accepts both `token_hash` links (custom templates in `supabase/templates/`, work across devices) and `code` links (Supabase default). The live project still uses Supabase's default templates (editing needs custom SMTP, planned with Resend in Milestone 4), so a `code` link opened in another browser confirms the email and then sends the user to `/login?confirmed=1`.
- **Security:** every table has RLS. Members read, owners write. The browser only ever gets the publishable key. Businesses are created only via the `create_business()` database function. The Supabase secret (service role) key is used only on the server, only in `src/lib/chat/` for the public chat widget (see below).
- **Forms** keep values in React state and submit one JSON `payload` field to a Server Action, which validates with `zod` (`src/lib/profile/schemas.ts`). Lists (services, FAQs, hours, rules) are saved as "make the database match this list".
- **AI model:** Claude Opus 5.5 (`claude-opus-5-5`) to start, low effort, set in one config constant. Keep evaluating cheaper models (Sonnet 5.5, Haiku 5.5) against the receptionist test set and switch if they pass.
- **Chat widget:** `public/widget.js` adds a button and an iframe to `/widget/[key]` (our origin, so no CORS, isolated styles). The visitor's browser keeps a random conversation token (only its SHA-256 is stored). Visitors are anonymous, so `/api/widget/messages` uses the server-only Supabase secret key (`src/lib/supabase/admin.ts`, used only in `src/lib/chat/`) after checking the widget key, token and rate limits (`CHAT_LIMITS` in `src/config/app.ts`). App pages send `X-Frame-Options: DENY`; only `/widget/*` may be embedded.
- **Receptionist prompt:** the business profile goes into a cached system prompt (no date in it); the current local time is appended as a mid-conversation system message. Claude returns structured JSON (`decision` answer/handoff, `reply`, `handoff_reason`, extracted contact details). Any failure (no key, API error, refusal, daily cap) falls back to a polite holding message and marks the conversation `needs_human`. Server-side refusal fallback (`fallbacks: "default"`) is on. The widget tells customers they are chatting with an AI (EU AI Act transparency).
- **Gotcha:** during one server render Next.js reuses the result of an identical earlier GET (Supabase reads are fetches). Don't "re-read to check" with the same query in the same render; take the row from the insert (`.insert().select()`).
- **Type of business is free text** in the owner's words (`businesses.type`, max 100 chars). For suggestions, `categorize()` in `src/lib/profile/suggestions.ts` maps it to a category by keywords. The receptionist sees the free text.
- **Description is required.** "Vyplnit podle webu" (`src/lib/ai/website.ts`): the server downloads the owner's homepage (only public addresses, re-checked after redirects; 8 s / 1.5 MB limits), extracts text, and Claude drafts type, description and contact details from it (only facts on the page). Nothing is saved until the owner continues; found contact details fill only empty fields. Known gap: DNS rebinding between the address check and the fetch is not prevented (low risk for this use).
- **Suggestions** (services, FAQs, never-answer topics) are shown in the language the owner uses the app in, and only propose names and questions, never prices or answers.
- **Lead mode** (for agencies and custom services): `businesses.goal` = `answer` (default: answer + booking link) or `meeting` (find out the need, ask the owner's questions = `rules` of kind `question`, steer to a meeting via booking link or contact details in chat). Claude's structured output also returns `lead_ready` + `lead_summary` (in the owner's main language); the server stores it on `conversations.summary` / `lead_at` and marks the conversation `needs_human`. Dashboard → "Poptávky" lists them; `/conversations/[id]` is a read-only transcript (full inbox = Milestone 3). Email about new enquiries comes with Milestone 4 (founder's choice).
- **Whole-website knowledge is opt-in per business** (`businesses.use_website_knowledge`, off by default, because it makes each chat ~1–2 Kč more expensive). When on, `crawlWebsite()` reads the homepage + up to 14 same-site pages (skips files, admin, privacy/cookies pages; 60k chars total) into `knowledge_pages`, re-read in the background (`after()`) when the website address changes or via "Načíst znovu z webu". The receptionist prompt gets it as `<website_content>`; profile facts win if they differ.
- **Naming:** AI employees are named by their role, not with personal names: Receptionist / Recepční, later Marketer / Marketér, Office manager, Analyst / Analytik. The app name stays in `APP_NAME` (`src/config/app.ts`).
- **Domain:** `receptionist.costahub.co` (CNAME to Vercel, set up by hand, see README step 4). `NEXT_PUBLIC_SITE_URL` must match it; widget snippets contain this address, so an old address must keep working if it ever changes.
- **No "approve every reply" mode**: the checkbox was removed (the `approve_replies` column is unused). Sensitive topics (complaints, refunds, health, legal, specific orders/people) are handed over by the receptionist prompt.

## Known limitations (fix when relevant)

- Saving a list (`replaceList` in `src/lib/profile/actions.ts`) is two requests (upsert, then delete the rest), not one transaction, and has no protection against two tabs editing at once. Move to a database function if it ever matters.
- Email links are used on a plain GET, so corporate link scanners could use up a password-reset link. Switch to a "click to confirm" page when the custom email templates go live (Milestone 4, with Resend SMTP).
- There is no "delete my account" feature yet; deletion is by request (see the privacy page). Deleting a user leaves their business behind; add cleanup together with account deletion.
- RLS helpers (`private.is_business_member`) run once per row. Fine for profile tables; the chat tables already use `business_id in (select private.my_business_ids())`.
- The widget doesn't poll for new messages yet; owner replies (Milestone 3) will need polling or Supabase realtime in the widget.
- The receptionist test set (`npm run eval`) has not been run against the real API yet (no key in the sandbox).
- The privacy page is a draft: fill in `OPERATOR` in `src/config/app.ts` (legal name, IČO, address, contact email) and have it reviewed before paying customers.

## Commands

- `npm run dev`: start locally at http://localhost:3000 (needs `.env.local`, see `.env.example`)
- `npm run typecheck`, `npm run lint`, `npm test`: fast checks
- `npm run test:db`: applies all migrations to a throwaway local Postgres and runs the RLS isolation tests (`supabase/tests/`)
- `npx supabase start`: a full local Supabase (needs Docker). With it, emails land in Mailpit at http://localhost:54324

## Status

- [x] Milestone 1 — Accounts & business profile (live at https://ai-receptionist-lac-mu.vercel.app, sign-up and onboarding confirmed working on the founder's phone)
- [x] Milestone 2 — Website chat widget (built and tested locally with a stand-in AI; live test with real Claude pending: needs ANTHROPIC_API_KEY + SUPABASE_SECRET_KEY in Vercel and the third migration)
- [x] Extra (founder request): lead mode, optional whole-website knowledge, enquiries on the dashboard, read-only conversation page (tested locally with a stand-in AI; needs the 5th migration in production)
- [ ] Milestone 3 — Owner inbox
- [ ] Milestone 4 — Handoff & notifications
- [ ] Milestone 5 — Instagram & Facebook DMs
- [ ] Milestone 6 — Weekly summary
- [ ] Meta app review application started

## Open questions

- Umbrella brand for the whole AI team (employees are named by role; domain for now receptionist.costahub.co)
- Pricing (to be informed by client interviews — "what would answering every message within a minute be worth to you per month?"). Founder's direction: premium positioning, around 10,000 Kč/month (possibly plus a setup fee). Pilot: the 4 test clients free for 2–3 months in exchange for feedback.
- Look: friendly and playful. Variants A Slunce, B Máta, C Hrozen and, based on costahub.co (black/white, pink #ff2e7e, blue #0156ff, lime #c6f02e, Inter + Shantell Sans), D Pink, E Night, F Blue, G CostaHub × Máta, plus H Glass (Apple Liquid Glass style, Máta colours) are on a design canvas. Founder liked B Máta, then G CostaHub × Máta most; I (G + Glass) is the current candidate, final pick pending, then it becomes Tailwind theme tokens and the redesign happens together with Milestone 3.
- Which booking systems the test clients use
