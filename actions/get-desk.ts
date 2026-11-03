import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { loadState, snapshot, today } from "../server/lib/deal-store.js";
import { counts, LABELS, rank, SIGNALS } from "../shared/deal.js";

export default defineAction({
  description:
    "Read the Deal Desk: the county run (public records only, house numbers masked), every hot lead ranked by its stacked signals with the points behind its score, the current signal weights, call marks, drafts waiting for approval and the activity log. Lead ids: L1… are hot leads, Q1… are quiet-distress homes.",
  schema: z.object({
    limit: z.number().int().min(1).max(200).optional().describe("Only return the top N hot leads (default: all)"),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ limit }) => {
    const st = await loadState();
    const t = today();
    const ranked = rank(snapshot.leads, st, t);
    return {
      run: { county: snapshot.county, city: snapshot.city, ranOn: snapshot.ranOn, seconds: snapshot.seconds, today: t, ...snapshot.counts },
      counts: counts(ranked, st),
      weights: st.weights,
      hideLand: st.hideLand,
      signals: SIGNALS.map((s) => ({ signal: s, label: LABELS[s] })),
      leads: limit ? ranked.slice(0, limit) : ranked,
      quiet: rank(snapshot.quiet, { ...st, hideLand: false }, t).slice(0, 12),
      drafts: [...st.drafts].reverse(),
      log: [...st.log].reverse().slice(0, 20),
    };
  },
});
