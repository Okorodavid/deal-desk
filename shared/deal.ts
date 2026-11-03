// Deal Desk core: score county leads from stacked public-record signals, re-rank them when someone (or the agent)
// changes the weights, track calls, and hold drafts until a person approves them. Pure functions, no I/O.

export type Signal =
  | "foreclosure" | "sale_soon" | "sale_passed" | "tax_sale" | "inherited"
  | "out_of_state" | "absentee" | "long_owned" | "old_house" | "land_only";

export type Weights = Record<Signal, number>;
export type Status = "called" | "follow-up" | "skip";
export type HouseType = "lot" | "cottage" | "house" | "family" | "large" | "modern";

export interface SnapLead {
  id: string; addr: string; city: string; signals: Signal[]; value: number; year: number;
  sale: string | null; lat: number | null; lon: number | null; notes: string[];
}
export interface Snapshot {
  county: string; city: string; ranOn: string; seconds: number;
  counts: { parcels: number; notices: number; taxSale: number; toCheck: number };
  leads: SnapLead[]; quiet: SnapLead[];
}

export interface Draft {
  id: string; kind: "records-request" | "offer-note"; title: string; body: string;
  leadId?: string; list?: RecordsList; status: "waiting" | "approved" | "rejected"; createdAt: string;
}
export interface LogEntry { id: string; at: string; text: string }
export interface DealState {
  weights: Weights; hideLand: boolean; statuses: Record<string, Status>;
  drafts: Draft[]; log: LogEntry[]; nextId: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  foreclosure: 45, sale_soon: 10, sale_passed: 20, tax_sale: 45, inherited: 15,
  out_of_state: 12, absentee: 6, long_owned: 10, old_house: 8, land_only: -20,
};

export const LABELS: Record<Signal, string> = {
  foreclosure: "Foreclosure sale scheduled", sale_soon: "Sale within 30 days",
  sale_passed: "Sale date passed (check if postponed)", tax_sale: "Sold at tax sale, can still redeem",
  inherited: "Heirs or several owners on the deed", out_of_state: "Owner lives out of state",
  absentee: "Owner lives elsewhere", long_owned: "Owned 20+ years", old_house: "Built before 1960",
  land_only: "Land only, no house",
};

export const SHORT: Record<Signal, string> = {
  foreclosure: "Foreclosure", sale_soon: "Sale in 30 days", sale_passed: "Sale passed", tax_sale: "Tax sale",
  inherited: "Heirs on deed", out_of_state: "Owner out of state", absentee: "Absentee owner",
  long_owned: "Owned 20+ yrs", old_house: "Built pre-1960", land_only: "Land only",
};

export const SIGNALS = Object.keys(DEFAULT_WEIGHTS) as Signal[];

export function newState(): DealState {
  return { weights: { ...DEFAULT_WEIGHTS }, hideLand: false, statuses: {}, drafts: [], log: [], nextId: 1 };
}

const day = (iso: string) => new Date(iso + "T12:00:00Z").getTime();
const DAY = 86_400_000;

/** The signals a lead carries today: a scheduled foreclosure becomes "passed" once its date has gone by. */
export function liveSignals(l: SnapLead, today: string): Signal[] {
  const out = new Set(l.signals);
  if (out.has("foreclosure") && l.sale) {
    const days = (day(l.sale) - day(today)) / DAY;
    if (days < 0) { out.delete("foreclosure"); out.add("sale_passed"); }
    else if (days <= 30) out.add("sale_soon");
  }
  return [...out];
}

export function houseType(l: SnapLead): HouseType {
  if (l.signals.includes("land_only")) return "lot";
  if (l.year >= 2015) return "modern";
  if (l.value >= 350_000) return "large";
  if (l.value >= 250_000) return "family";
  if (l.value >= 150_000) return "house";
  return "cottage";
}

export interface Ranked {
  id: string; addr: string; city: string; score: number; rank: number; type: HouseType;
  why: { signal: Signal; label: string; points: number }[];
  value: number; year: number; sale: string | null; lat: number | null; lon: number | null;
  notes: string[]; status: Status | null;
}

export function score(l: SnapLead, w: Weights, today: string) {
  const why = liveSignals(l, today).map((s) => ({ signal: s, label: LABELS[s], points: w[s] }))
    .sort((a, b) => b.points - a.points);
  const total = Math.max(0, Math.min(100, why.reduce((a, x) => a + x.points, 0)));
  return { score: total, why };
}

export function rank(leads: SnapLead[], st: DealState, today: string): Ranked[] {
  return leads
    .filter((l) => !(st.hideLand && l.signals.includes("land_only")))
    .map((l) => {
      const s = score(l, st.weights, today);
      return { id: l.id, addr: l.addr, city: l.city, score: s.score, rank: 0, type: houseType(l), why: s.why,
        value: l.value, year: l.year, sale: l.sale, lat: l.lat, lon: l.lon, notes: l.notes, status: st.statuses[l.id] ?? null };
    })
    .sort((a, b) => b.score - a.score || (a.sale ?? "9999").localeCompare(b.sale ?? "9999") || a.id.localeCompare(b.id))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

function log(st: DealState, text: string, now: string): DealState {
  return { ...st, log: [...st.log, { id: `g${st.nextId}`, at: now, text }].slice(-60), nextId: st.nextId + 1 };
}

/** Change how much each signal counts (and whether land is shown). Every change is logged with its reason. */
export function setWeights(st: DealState, changes: Partial<Weights>, hideLand: boolean | undefined, reason: string, now: string) {
  const weights = { ...st.weights };
  const parts: string[] = [];
  for (const [k, v] of Object.entries(changes) as [Signal, number][]) {
    if (!(k in weights)) throw new Error(`Unknown signal "${k}". Known: ${SIGNALS.join(", ")}`);
    const n = Math.max(-100, Math.min(100, Math.round(v)));
    if (n !== weights[k]) { parts.push(`${SHORT[k]} ${weights[k]} → ${n}`); weights[k] = n; }
  }
  let next: DealState = { ...st, weights };
  if (hideLand !== undefined && hideLand !== st.hideLand) { next.hideLand = hideLand; parts.push(hideLand ? "land lots hidden" : "land lots shown"); }
  if (!parts.length) return { state: st, changed: [] as string[] };
  next = log(next, `Re-ranked: ${parts.join(", ")}${reason ? ` (${reason})` : ""}`, now);
  return { state: next, changed: parts };
}

export function resetWeights(st: DealState, now: string): DealState {
  return log({ ...st, weights: { ...DEFAULT_WEIGHTS }, hideLand: false }, "Weights back to the defaults", now);
}

export function mark(st: DealState, leadId: string, status: Status | "clear", addr: string, now: string): DealState {
  const statuses = { ...st.statuses };
  if (status === "clear") delete statuses[leadId]; else statuses[leadId] = status;
  const words = { called: "Called", "follow-up": "Follow up", skip: "Skipped", clear: "Cleared" }[status];
  return log({ ...st, statuses }, `${words}: ${addr}`, now);
}

// ---- Drafts. Nothing leaves the app: a draft waits until a person approves it.

export type RecordsList = "code-violations" | "delinquent-taxes" | "probate";

const REQUESTS: Record<RecordsList, { title: string; to: string; what: string; fields: string }> = {
  "code-violations": {
    title: "Records request: code violations", to: "City of Clarksville, Building & Codes, (931) 645-7426",
    what: "a list of property maintenance and code enforcement cases opened or still open in the last 12 months",
    fields: "case number, property address, parcel number if recorded, violation type, date opened and current status",
  },
  "delinquent-taxes": {
    title: "Records request: unpaid property taxes", to: "Montgomery County Trustee, 350 Pageant Lane, Suite 101-B, Clarksville, TN 37040",
    what: "the current list of real property with unpaid property taxes for last year and earlier",
    fields: "map and parcel number, owner name, property address, tax years unpaid and amount due",
  },
  probate: {
    title: "Records request: new estates", to: "the Montgomery County court clerk that handles estates",
    what: "a list of estates opened in the last 90 days",
    fields: "case number, name of the deceased, date opened, and the personal representative's name and mailing address",
  },
};

export function businessDays(from: string, n: number): string {
  const d = new Date(from + "T12:00:00Z");
  while (n > 0) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() % 6 !== 0) n--; }
  return d.toISOString().slice(0, 10);
}

export function recordsRequestText(list: RecordsList, today: string): { title: string; body: string } {
  const r = REQUESTS[list];
  const due = businessDays(today, 7);
  return {
    title: r.title,
    body: [
      `To: ${r.to}`, `Date: ${today}`, "",
      `Under the Tennessee Public Records Act (T.C.A. 10-7-503), I request ${r.what}.`, "",
      `Please include, where the records hold them: ${r.fields}.`, "",
      "An electronic copy (CSV or Excel) is preferred. If there is a charge, please tell me the amount first. If any part is denied, please give the legal basis in writing.", "",
      "I am a Tennessee citizen; proof is attached.", "", "Name:", "Address:", "Phone / email:", "",
      `(The office should reply by ${due}, seven business days.)`,
    ].join("\n"),
  };
}

export function addDraft(st: DealState, d: Omit<Draft, "id" | "status" | "createdAt">, now: string) {
  const draft: Draft = { ...d, id: `d${st.nextId}`, status: "waiting", createdAt: now };
  const next = log({ ...st, drafts: [...st.drafts, draft], nextId: st.nextId + 1 }, `Draft waiting for your OK: ${d.title}`, now);
  return { state: next, draft };
}

export function reviewDraft(st: DealState, id: string, decision: "approve" | "reject", editedBody: string | undefined, now: string): DealState {
  const d = st.drafts.find((x) => x.id === id);
  if (!d) throw new Error(`No draft ${id}`);
  if (d.status !== "waiting") throw new Error(`Draft ${id} is already ${d.status}`);
  const drafts = st.drafts.map((x) => x.id === id
    ? { ...x, status: decision === "approve" ? ("approved" as const) : ("rejected" as const), body: editedBody ?? x.body } : x);
  return log({ ...st, drafts }, `${decision === "approve" ? "Approved" : "Rejected"}: ${d.title}`, now);
}

/** Names on the public demo are never shown, so an offer note must not invent one either. */
export function checkOfferNote(body: string): string | null {
  if (body.trim().length < 40) return "The note is too short. Write two or three plain sentences.";
  if (/\$\s?\d/.test(body)) return "Leave prices out of a first note; the offer comes after a conversation.";
  return null;
}

export function counts(ranked: Ranked[], st: DealState) {
  const by = (s: Signal) => ranked.filter((r) => r.why.some((w) => w.signal === s)).length;
  return {
    hot: ranked.length, foreclosure: by("foreclosure"), saleSoon: by("sale_soon"), taxSale: by("tax_sale"),
    stacked: ranked.filter((r) => r.why.filter((w) => w.signal !== "sale_soon").length >= 2).length,
    called: Object.values(st.statuses).filter((s) => s === "called").length,
    waiting: st.drafts.filter((d) => d.status === "waiting").length,
  };
}
