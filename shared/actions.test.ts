import { describe, expect, it } from "vitest";

import draftOfferNote from "../actions/draft-offer-note";
import resetDesk from "../actions/reset-desk";
import reviewDraft from "../actions/review-draft";
import setWeights from "../actions/set-weights";

const agentCan = (a: unknown) => (a as { agentTool?: boolean }).agentTool !== false;

describe("action surface", () => {
  it("the agent can steer and draft but not approve or reset", () => {
    expect(agentCan(setWeights)).toBe(true);
    expect(agentCan(draftOfferNote)).toBe(true);
    expect(agentCan(reviewDraft)).toBe(false);
    expect(agentCan(resetDesk)).toBe(false);
  });
});
