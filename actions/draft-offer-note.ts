import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { findLead, loadState, now, saveState } from "../server/lib/deal-store.js";
import { addDraft, checkOfferNote } from "../shared/deal.js";

export default defineAction({
  description:
    "Save a short, respectful first letter to the owner of a lead, for a person to approve. Call explain-lead first and use only its facts. Two or three plain sentences: who you are, that you buy houses as they are and can close quickly, an invitation to talk. No price, no pressure, no names (the desk never shows owner names), no claims you can't back up.",
  schema: z.object({
    id: z.string().describe("Lead id, e.g. L1"),
    body: z.string().describe("The note text"),
  }),
  run: async ({ id, body }) => {
    const l = findLead(id);
    const problem = checkOfferNote(body);
    if (problem) throw new Error(problem);
    const r = addDraft(await loadState(), { kind: "offer-note", title: `Offer note: ${l.addr}`, body: body.trim(), leadId: id }, now());
    await saveState(r.state);
    return { draft: r.draft, note: "Waiting for a person to approve it on the Desk." };
  },
});
