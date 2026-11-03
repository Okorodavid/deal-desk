import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { findLead, loadState, snapshot, today } from "../server/lib/deal-store.js";
import { houseType, rank, score } from "../shared/deal.js";

export default defineAction({
  description:
    "Explain one lead: every signal and the points it adds under the current weights, its rank, the public-record notes behind it (notice dates, tax-sale facts), value, year built and call mark. Use these facts and nothing else when writing about a lead.",
  schema: z.object({ id: z.string().describe("Lead id, e.g. L1 or Q3") }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ id }) => {
    const st = await loadState();
    const l = findLead(id);
    const s = score(l, st.weights, today());
    const r = rank(snapshot.leads, st, today()).find((x) => x.id === id);
    return {
      id, addr: l.addr, city: l.city, score: s.score, rank: r?.rank ?? null, of: snapshot.leads.length,
      why: s.why, notes: l.notes, value: l.value, year: l.year || null, sale: l.sale, type: houseType(l),
      status: st.statuses[id] ?? null,
    };
  },
});
