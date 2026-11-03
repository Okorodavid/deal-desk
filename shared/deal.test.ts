import { describe, expect, it } from "vitest";

import {
  addDraft, businessDays, checkOfferNote, counts, DEFAULT_WEIGHTS, houseType, liveSignals, mark, newState, rank,
  recordsRequestText, resetWeights, reviewDraft, score, setWeights, type SnapLead,
} from "./deal";
import { SNAPSHOT } from "./snapshot";

const T = "2026-11-03", NOW = "2026-11-03T09:00:00Z";
const lead = (over: Partial<SnapLead>): SnapLead => ({
  id: "X1", addr: "1•• Test St", city: "Clarksville", signals: [], value: 200000, year: 1990, sale: null,
  lat: 36.5, lon: -87.3, notes: [], ...over,
});

describe("scoring", () => {
  it("stacks signals and caps at 100", () => {
    const l = lead({ signals: ["tax_sale", "long_owned", "old_house"] });
    expect(score(l, DEFAULT_WEIGHTS, T).score).toBe(63);
    const big = lead({ signals: ["tax_sale", "foreclosure", "inherited", "out_of_state"], sale: "2026-11-20" });
    expect(score(big, DEFAULT_WEIGHTS, T).score).toBe(100);
  });

  it("works out sale-date signals from today", () => {
    expect(liveSignals(lead({ signals: ["foreclosure"], sale: "2026-11-20" }), T)).toContain("sale_soon");
    expect(liveSignals(lead({ signals: ["foreclosure"], sale: "2027-01-20" }), T)).not.toContain("sale_soon");
    const passed = liveSignals(lead({ signals: ["foreclosure"], sale: "2026-10-15" }), T);
    expect(passed).toContain("sale_passed");
    expect(passed).not.toContain("foreclosure");
  });

  it("picks the house icon from the real property", () => {
    expect(houseType(lead({ signals: ["land_only"] }))).toBe("lot");
    expect(houseType(lead({ year: 2021 }))).toBe("modern");
    expect(houseType(lead({ value: 400000 }))).toBe("large");
    expect(houseType(lead({ value: 90000, year: 1948 }))).toBe("cottage");
  });

  it("ranks the real snapshot with the 1948 tax-sale house on top", () => {
    const r = rank(SNAPSHOT.leads, newState(), T);
    expect(r).toHaveLength(SNAPSHOT.leads.length);
    expect(r[0].addr).toBe("9•• Swift Dr");
    expect(r[0].score).toBe(63);
  });
});

describe("steering", () => {
  it("re-ranks, hides land and logs the reason", () => {
    const r = setWeights(newState(), { inherited: 40 }, true, "push inherited up", NOW);
    expect(r.changed).toEqual(["Heirs on deed 15 → 40", "land lots hidden"]);
    expect(rank(SNAPSHOT.leads, r.state, T).some((l) => l.type === "lot")).toBe(false);
    expect(r.state.log.at(-1)?.text).toContain("push inherited up");
  });

  it("refuses unknown signals and ignores no-op changes", () => {
    expect(() => setWeights(newState(), { pool: 10 } as never, undefined, "", NOW)).toThrow(/Unknown signal/);
    expect(setWeights(newState(), { inherited: 15 }, false, "", NOW).changed).toEqual([]);
  });

  it("resets to the defaults", () => {
    const r = setWeights(newState(), { tax_sale: 90 }, true, "", NOW);
    const back = resetWeights(r.state, NOW);
    expect(back.weights).toEqual(DEFAULT_WEIGHTS);
    expect(back.hideLand).toBe(false);
  });
});

describe("calls and drafts", () => {
  it("marks and clears a lead", () => {
    const s = mark(newState(), "L1", "called", "9•• Swift Dr", NOW);
    expect(counts(rank(SNAPSHOT.leads, s, T), s).called).toBe(1);
    expect(mark(s, "L1", "clear", "9•• Swift Dr", NOW).statuses.L1).toBeUndefined();
  });

  it("holds drafts until a person approves, once", () => {
    const { title, body } = recordsRequestText("code-violations", T);
    const r = addDraft(newState(), { kind: "records-request", title, body, list: "code-violations" }, NOW);
    expect(r.draft.status).toBe("waiting");
    const ok = reviewDraft(r.state, r.draft.id, "approve", body + "\nSigned.", NOW);
    expect(ok.drafts[0].status).toBe("approved");
    expect(ok.drafts[0].body).toContain("Signed.");
    expect(() => reviewDraft(ok, r.draft.id, "reject", undefined, NOW)).toThrow(/already approved/);
  });

  it("dates records requests seven business days out", () => {
    expect(businessDays("2026-11-03", 7)).toBe("2026-11-12");
    expect(recordsRequestText("probate", T).body).toContain("2026-11-12");
  });

  it("keeps offer notes short-form and price-free", () => {
    expect(checkOfferNote("Hi")).toMatch(/too short/);
    expect(checkOfferNote("We buy houses as they are and could offer $90,000 cash for yours this week.")).toMatch(/prices/);
    expect(checkOfferNote("We buy houses in Clarksville as they are and can close quickly. If selling would help, we'd be glad to talk.")).toBeNull();
  });
});
