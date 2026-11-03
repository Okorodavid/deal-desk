# Deal Desk

A wholesaler's desk built on [Agent-Native](https://www.builder.io/hackathon). An agent reads a county's public foreclosure and tax-sale records, matches each record to a house, stacks the signals into a ranked call list, and lets you steer that list by talking to it. Drafts never leave the app until a person approves them.

The first county is Montgomery County, Tennessee (Clarksville). One run produced:
- 92,436 assessor parcels;
- 84 foreclosure notices;
- 17 tax-sale results;
- **73 hot leads**, scored.

## What you can do
- **Read the run:** a headline, the numbers, and a "Start here" lead.
- **Steer the ranking:**
  - by tapping a card: "Hide land lots", "Push inherited homes up" or "Sales within 30 days first";
  - by typing to the agent, for example *"ignore land, I only want houses"*. The agent calls `set-weights`, and the list re-ranks live.
- **Open a lead** (`?lead=L4`) to see:
  - every signal and the points it adds;
  - the public-record facts behind it;
  - a house icon that matches the real property: a lot, cottage, house, family home, large house or new build.
- **Mark leads** as Called, Follow up or Skip.
- **Make drafts:**
  - Tennessee records requests for the lists that aren't online (code violations, unpaid taxes, new estates);
  - short offer notes that the agent writes from the lead's facts.

  **Approve**, **Edit** or **Reject** each one. The agent can't approve its own work.
- **`/story.html`:** the scroll story of how a lead is found, drawn from the real parcel data.

## How it uses Agent-Native
- One set of `defineAction()` files is the whole contract. The UI, the agent, the CLI and HTTP all call the same code:
  - `get-desk`
  - `explain-lead`
  - `set-weights`
  - `reset-weights`
  - `mark-lead`
  - `draft-records-request`
  - `draft-offer-note`
  - `review-draft`
  - `reset-desk`
- `review-draft` and `reset-desk` are `agentTool: false`. People can use them from the UI, but they aren't in the agent's tool list.
- The open lead rides along in the URL, so "why is this one top?" works without a follow-up question.
- The steer box and the "Draft offer note" button hand work to the agent chat with `sendToAgentChat`, and the desk refreshes as the agent's actions land.

## Run it
```bash
dev.cmd dev                    # Windows, from this folder (maps R: because the CLI breaks on paths with spaces)
pnpm dev                       # elsewhere
pnpm test                      # 12 offline tests
dev.cmd action get-desk --limit 3
```
`.env` needs `GOOGLE_GENERATIVE_AI_API_KEY` (or another provider key), plus `AGENT_MODEL=gemini-3.5-flash-lite` on the free tier. `AUTH_DISABLED=true` is set for local use and the public demo.

## Data and privacy
- `shared/snapshot.ts` comes from a [County List Agent](../../county-list-agent/README.md) run, by `python scripts/build_snapshot.py`.
- It's **masked**: house numbers are hidden, and there are no owner names, buyer names or mailing addresses.
- Sale-date signals (within 30 days, passed) are worked out from today's date.

## Honest limits
- The hosted demo uses that saved snapshot. Live county pulls run in the Python agent on a laptop.
- Only Montgomery County, TN is wired up so far.
- The offer-note check is simple: it blocks prices and very short notes, and a person still approves every draft.

## Built during the hackathon
Started 3 Nov 2026 from the Agent-Native chat template. The county pipeline (`county-list-agent/`) was written on 30 Oct 2026, inside the hackathon window. The house icons and the scroll story were made on 3 Nov.
