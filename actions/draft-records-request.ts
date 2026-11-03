import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { loadState, now, saveState, today } from "../server/lib/deal-store.js";
import { addDraft, recordsRequestText } from "../shared/deal.js";

export default defineAction({
  description:
    "Draft a Tennessee public-records request for a list that isn't online in Montgomery County: code-violations (City of Clarksville), delinquent-taxes (County Trustee) or probate (new estates). The draft waits for a person to approve it; only a Tennessee citizen can send it.",
  schema: z.object({ list: z.enum(["code-violations", "delinquent-taxes", "probate"]) }),
  run: async ({ list }) => {
    const { title, body } = recordsRequestText(list, today());
    const r = addDraft(await loadState(), { kind: "records-request", title, body, list }, now());
    await saveState(r.state);
    return { draft: r.draft, note: "Waiting for a person to approve it on the Desk." };
  },
});
