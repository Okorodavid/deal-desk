# Deal Desk — Agent Guide

## Deal Desk (this app)

Deal Desk turns a county's public records into a wholesaler's call list. The run (Montgomery County, TN: 92,436 assessor parcels, foreclosure notices from tnpublicnotice.com, the Chancery Court tax-sale results) comes from the County List Agent and ships as a masked snapshot in `shared/snapshot.ts`: house numbers are masked and there are no owner names. Never invent a name, a price or a fact about a lead; `explain-lead` holds everything known.

The Desk (`/home`, `app/components/desk/DealDeskPage.tsx`) shows the run, a steer box, the ranked call list (`?lead=L4` is the open lead, so "this one" means that id) and drafts waiting for approval. Pure logic is in `shared/deal.ts` (tested in `shared/*.test.ts`); state is one `dealdesk` row in the settings store (`server/lib/deal-store.ts`). `/story.html` is the scroll story of how a lead is found.

| Action | Who | What |
| --- | --- | --- |
| `get-desk` | agent, UI | The run, ranked leads with the points behind each score, weights, marks, drafts, log |
| `explain-lead` | agent, UI | One lead's signals, points, public-record notes, value, year |
| `set-weights` | agent, UI | Re-rank: change a signal's points and/or hide land. Pass the user's words as the reason |
| `reset-weights` | agent, UI | Default weights |
| `mark-lead` | agent, UI | called / follow-up / skip / clear |
| `draft-records-request` | agent, UI | Tennessee records request for code violations, unpaid taxes or new estates (not online in this county) |
| `draft-offer-note` | agent | Save a short first letter for a lead, from `explain-lead` facts only; no price, no names |
| `review-draft` | people only (`agentTool: false`) | Approve (optionally edited) or reject a draft |
| `reset-desk` | people only | Back to the first run |

Scoring: points stack and cap at 100. Defaults: foreclosure 45, sale within 30 days +10, sale passed 20, tax sale 45, heirs on deed 15, owner out of state 12, owner lives elsewhere 6, owned 20+ years 10, built before 1960 8, land only -20. Sale-date signals are worked out from today's date.

## Chat template notes

Chat is the minimal chat-first agent-native app. `/` redirects to shared sign-in, then `/home`, the editable Get started page. Chat lives at `/chat`; new chats start there. Actions carry capabilities; screens exist only for durable workflows.

## Skills

Search with `rg --hidden --follow`; read the exact linked guide before deeper work. `.agents/skills/build-an-app/SKILL.md` — start here for vague requests to create a domain app. `.agents/skills/adding-a-feature/SKILL.md` — cross-area feature checklist. Data/integrations: `.agents/skills/actions/SKILL.md`, `.agents/skills/storing-data/SKILL.md`, `.agents/skills/security/SKILL.md`, `.agents/skills/secrets/SKILL.md`, `.agents/skills/sharing/SKILL.md`. UI: `.agents/skills/frontend-design/SKILL.md`, `.agents/skills/shadcn-ui/SKILL.md`, `.agents/skills/client-side-routing/SKILL.md`. Agent context/workflows: `.agents/skills/context-awareness/SKILL.md`, `.agents/skills/real-time-sync/SKILL.md`, `.agents/skills/reliable-mutations/SKILL.md`, `.agents/skills/performance/SKILL.md`, `.agents/skills/delegate-to-agent/SKILL.md`. Framework: `.agents/skills/agent-native-docs/SKILL.md`, `.agents/skills/agent-native-toolkit/SKILL.md`, `.agents/skills/customizing-agent-native/SKILL.md`.

Use local docs only (no web research): `pnpm action docs-search --query "<topic>"`, `pnpm action docs-search --slug "<slug>"`, `pnpm action docs-search --list`, `pnpm action source-search --query "<pattern>"`, `pnpm action source-search --path <path>`, or `pnpm action source-search --list`. For external-agent integrations, read `pnpm action docs-search --slug "external-agents"`.

## Core rules

- UI feedback: target 100 ms, never exceed 400 ms; acknowledge before network work.
- Normal app data must flow through actions. Keep actions deterministic and focused; use agent chat/AgentSidebar for AI work and follow-ups in the same thread. Keep structured state in SQL and large files in configured storage; persist references only.
- For external integrations, inspect the workspace/provider connection catalog first; reuse its scoped resolver. Never hardcode credentials, webhook URLs, or private/customer data.
- Never fabricate. Report failures and recover; verify writes by reading the row or screen. Navigation is in `<current-screen>`; use `view-screen` for fresh visible-record details.

For custom branding, keep `server/plugins/agent-native-email-branding.ts` aligned: `app.name` appears in transactional email and optional `app.logoUrl` must be an absolute HTTPS URL.

## Application state

- `navigation` describes the view and selected ids. Chat is `chat` at `/chat` and `/chat/<threadId>`; the Get started page is `home` at `/home`; `/` opens shared sign-in/signup.
- Use `navigate` when supported and `view-screen` for a fresh read of visible details; basic navigation is already in `<current-screen>`.

## Building a domain app

Choose the primary workflow and route before editing. Add a domain route under `app/routes/` and set `app.homePath` in `server/plugins/agent-native-email-branding.ts` with `defineAppConfig`. The default Get started page lives at `/home`, and Chat stays at `/chat`; edit `app/routes/home.tsx` when replacing that page with a domain-specific home. Add a static link in `app/components/layout/Sidebar.tsx` before `ChatThreadsSection`; `Header.tsx` uses `APP_TITLE` elsewhere. Shared sidebar and AgentInspector remain.

Use `adding-a-feature` for functional parity and `frontend-design` for a user-facing screen. Keep feature guidance here; do not rewrite `README.md` or `DESIGN.md`. After all edits, run one typecheck, one doctor check, and one browser smoke of the primary workflow, including overlap rejection, cancellation freeing the slot, and authenticated landing. Skip production build and extra test suites.

Before building common workspace or agent UI, read `agent-native-toolkit`; for supported customization, read `customizing-agent-native`.

- Guarded verification: run `pnpm agent-native:doctor`; fix findings before done.
