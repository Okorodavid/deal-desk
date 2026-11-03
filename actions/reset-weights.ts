import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { loadState, now, saveState } from "../server/lib/deal-store.js";
import { DEFAULT_WEIGHTS, resetWeights } from "../shared/deal.js";

export default defineAction({
  description: "Put every signal weight back to the default and show land lots again.",
  schema: z.object({}),
  run: async () => {
    await saveState(resetWeights(await loadState(), now()));
    return { weights: DEFAULT_WEIGHTS };
  },
});
