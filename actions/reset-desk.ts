import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { saveState } from "../server/lib/deal-store.js";
import { newState } from "../shared/deal.js";

// People only: wipes marks, drafts and weights back to the first run.
export default defineAction({
  description: "Reset the desk: default weights, no call marks, no drafts, empty log.",
  schema: z.object({}),
  agentTool: false,
  run: async () => {
    await saveState(newState());
    return { ok: true };
  },
});
