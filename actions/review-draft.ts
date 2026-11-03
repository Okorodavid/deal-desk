import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { loadState, now, saveState } from "../server/lib/deal-store.js";
import { reviewDraft } from "../shared/deal.js";

// People only: the agent drafts, a person approves. Hidden from the agent's tools.
export default defineAction({
  description: "Approve or reject a draft. Approving can carry edited text.",
  schema: z.object({
    id: z.string().describe("Draft id, e.g. d4"),
    decision: z.enum(["approve", "reject"]),
    editedBody: z.string().optional(),
  }),
  agentTool: false,
  run: async ({ id, decision, editedBody }) => {
    await saveState(reviewDraft(await loadState(), id, decision, editedBody, now()));
    return { id, decision };
  },
});
