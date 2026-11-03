import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { loadState, now, saveState, snapshot, today } from "../server/lib/deal-store.js";
import { rank, setWeights, SIGNALS, type Signal } from "../shared/deal.js";

export default defineAction({
  description:
    "Re-rank the call list by changing how many points a signal adds (-100 to 100), and/or hide land lots. Use it when the user says things like \"ignore land\", \"push inherited homes up\" or \"sales in the next 30 days first\". Signals: foreclosure, sale_soon, sale_passed, tax_sale, inherited, out_of_state, absentee, long_owned, old_house, land_only. Pass only what changes, plus a short reason in the user's words. Returns the new top 5.",
  schema: z.object({
    changes: z.record(z.string(), z.number()).default({}).describe('Signal to new points, e.g. {"inherited": 40}'),
    hideLand: z.boolean().optional().describe("true hides land-only lots, false shows them"),
    reason: z.string().default("").describe("Why, in a few plain words"),
  }),
  run: async ({ changes, hideLand, reason }) => {
    const bad = Object.keys(changes).filter((k) => !SIGNALS.includes(k as Signal));
    if (bad.length) throw new Error(`Unknown signal(s) ${bad.join(", ")}. Use: ${SIGNALS.join(", ")}`);
    const r = setWeights(await loadState(), changes as Partial<Record<Signal, number>>, hideLand, reason, now());
    await saveState(r.state);
    const top = rank(snapshot.leads, r.state, today()).slice(0, 5)
      .map((l) => ({ id: l.id, addr: l.addr, score: l.score, why: l.why.map((w) => w.label) }));
    return { changed: r.changed.length ? r.changed : ["nothing changed"], top };
  },
});
