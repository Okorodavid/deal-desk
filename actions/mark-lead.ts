import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { findLead, loadState, now, saveState } from "../server/lib/deal-store.js";
import { mark } from "../shared/deal.js";

export default defineAction({
  description: 'Mark a lead on the call sheet: "called", "follow-up", "skip", or "clear" to remove the mark.',
  schema: z.object({
    id: z.string().describe("Lead id, e.g. L4"),
    status: z.enum(["called", "follow-up", "skip", "clear"]),
  }),
  run: async ({ id, status }) => {
    const l = findLead(id);
    await saveState(mark(await loadState(), id, status, l.addr, now()));
    return { id, status };
  },
});
