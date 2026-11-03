import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { DEFAULT_WEIGHTS, SHORT, type Draft, type Ranked, type Signal, type Status, type Weights } from "../../../shared/deal";
import { HouseIcon } from "./HouseIcon";

interface Desk {
  run: { county: string; city: string; ranOn: string; seconds: number; today: string; parcels: number; notices: number; taxSale: number; toCheck: number };
  counts: { hot: number; foreclosure: number; saleSoon: number; taxSale: number; stacked: number; called: number; waiting: number };
  weights: Weights; hideLand: boolean; leads: Ranked[]; quiet: Ranked[]; drafts: Draft[];
  log: { id: string; at: string; text: string }[];
}

const money = (n: number) => (n ? "$" + n.toLocaleString("en-US") : "");
const when = (iso: string | null) => (iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");
const kindColor = (r: Ranked) => (r.why.some((w) => w.signal === "tax_sale") ? "text-[var(--deal-tax)]" : r.why.some((w) => w.signal === "sale_passed") ? "text-muted-foreground" : "text-[var(--deal)]");

const STEER_PROMPT = (ask: string) =>
  `On the Deal Desk: "${ask}". Use set-weights (or reset-weights) to change the ranking, with my words as the reason, then tell me in one or two sentences what changed and which lead is now on top. Don't invent signals or facts.`;
const OFFER_PROMPT = (r: Ranked) =>
  `Draft a first letter to the owner of ${r.addr} (lead ${r.id}). Call explain-lead first and use only its facts, then save it with draft-offer-note so I can approve it.`;

function Stat({ n, label, accent }: { n: number | string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className={cn("text-4xl font-extrabold tracking-tight tabular-nums", accent && "text-[var(--deal)]")}>{n}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function SteerCard({ title, effect, on, onClick, busy }: { title: string; effect: string; on: boolean; onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={busy}
      onClick={onClick}
      className={cn(
        "flex min-h-[72px] flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deal)]",
        on ? "border-[var(--deal)] bg-[var(--deal-soft)]" : "bg-muted/40 hover:bg-muted",
      )}
    >
      <span className="font-semibold">{on ? "✓ " : ""}{title}</span>
      <span className="text-sm text-muted-foreground">{effect}</span>
    </button>
  );
}

const STATUS_WORD: Record<Status, string> = { called: "Called", "follow-up": "Follow up", skip: "Skipped" };

function LeadCard({ r, open, onToggle }: { r: Ranked; open: boolean; onToggle: () => void }) {
  const markLead = useActionMutation("mark-lead");
  const set = (s: Status) => markLead.mutate({ id: r.id, status: r.status === s ? "clear" : s });
  return (
    <article className={cn("rounded-2xl border bg-card p-4 transition-shadow", open && "border-[var(--deal)] ring-4 ring-[var(--deal-soft)]", r.status === "skip" && "opacity-60")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-4 text-left focus-visible:outline-none">
        <HouseIcon type={r.type} className={cn("mt-1 h-9 w-11 shrink-0", kindColor(r))} />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex flex-wrap items-baseline justify-between gap-2">
            <b className="text-base">{r.addr}</b>
            <span className="text-sm tabular-nums text-muted-foreground">{money(r.value)}</span>
          </span>
          <span className="flex flex-wrap gap-1.5">
            {r.why.map((w) => (
              <span key={w.signal} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{SHORT[w.signal]}{w.signal === "foreclosure" && r.sale ? ` · ${when(r.sale)}` : ""}</span>
            ))}
            {r.status && <span className="rounded-full bg-[var(--deal-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--deal)]">{STATUS_WORD[r.status]}</span>}
          </span>
        </span>
        <span className="text-3xl font-extrabold tracking-tight tabular-nums text-[var(--deal)]">{r.score}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-3 border-t pt-3 text-sm">
          <ul className="space-y-1.5">
            {r.why.map((w) => (
              <li key={w.signal} className="flex justify-between gap-3"><span>{w.label}</span><b className="tabular-nums">{w.points > 0 ? "+" : ""}{w.points}</b></li>
            ))}
            <li className="flex justify-between gap-3 border-t pt-1.5 font-semibold"><span>Score</span><span className="tabular-nums">{r.score}</span></li>
          </ul>
          {r.notes.map((n) => <p key={n} className="text-muted-foreground">{n}</p>)}
          <p className="text-muted-foreground">{r.year ? `Built ${r.year}` : "No house on record"} · rank {r.rank}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => set("called")} variant={r.status === "called" ? "default" : "outline"}>Called</Button>
            <Button size="sm" onClick={() => set("follow-up")} variant={r.status === "follow-up" ? "default" : "outline"}>Follow up</Button>
            <Button size="sm" onClick={() => set("skip")} variant="ghost">Skip</Button>
            {r.type !== "lot" && (
              <Button size="sm" variant="ghost" onClick={() => sendToAgentChat({ message: OFFER_PROMPT(r), submit: true, openSidebar: true })}>Draft offer note</Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function DraftCard({ d }: { d: Draft }) {
  const review = useActionMutation("review-draft");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(d.body);
  return (
    <article className="rounded-2xl border bg-card p-4" data-testid={`draft-${d.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <b>{d.title}</b>
        <span className={cn("text-sm font-semibold", d.status === "approved" ? "text-emerald-600" : d.status === "rejected" ? "text-muted-foreground" : "text-[var(--deal)]")}>
          {d.status === "waiting" ? "Waiting for your OK" : d.status === "approved" ? "Approved" : "Rejected"}
        </span>
      </div>
      {editing ? (
        <textarea className="mt-3 block min-h-48 w-full resize-y rounded-lg border bg-transparent p-3 font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      ) : (
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 font-sans text-sm">{d.body}</pre>
      )}
      {d.status === "waiting" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: d.id, decision: "approve", editedBody: editing ? text : undefined })}>Approve</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>{editing ? "Done editing" : "Edit"}</Button>
          <Button size="sm" variant="ghost" disabled={review.isPending} onClick={() => review.mutate({ id: d.id, decision: "reject" })}>Reject</Button>
        </div>
      )}
    </article>
  );
}

type Filter = "all" | "foreclosure" | "tax_sale" | "called";

export default function DealDeskPage() {
  const { data } = useActionQuery("get-desk", {}, { refetchInterval: 2500 });
  const setWeights = useActionMutation("set-weights");
  const resetWeights = useActionMutation("reset-weights");
  const draftRequest = useActionMutation("draft-records-request");
  const reset = useActionMutation("reset-desk");
  const [params, setParams] = useSearchParams();
  const [ask, setAsk] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const desk = data as Desk | undefined;
  if (!desk) return <main className="p-6" />;

  const open = params.get("lead");
  const toggle = (id: string) => {
    const next = new URLSearchParams(params);
    if (open === id) next.delete("lead"); else next.set("lead", id);
    setParams(next, { replace: true });
  };
  const w = desk.weights;
  const busy = setWeights.isPending || resetWeights.isPending;
  const changed = desk.hideLand || (Object.keys(DEFAULT_WEIGHTS) as Signal[]).some((s) => w[s] !== DEFAULT_WEIGHTS[s]);
  const steer = (changes: Partial<Weights>, hideLand: boolean | undefined, reason: string) => setWeights.mutate({ changes, hideLand, reason });
  const sendAsk = () => {
    if (!ask.trim()) return;
    sendToAgentChat({ message: STEER_PROMPT(ask.trim()), submit: true, openSidebar: true });
    setAsk("");
  };
  const top = desk.leads[0];
  const list = desk.leads.filter((r) =>
    filter === "all" ? true : filter === "called" ? r.status === "called" : r.why.some((x) => x.signal === filter));
  const shown = showAll ? list : list.slice(0, 12);
  const latest = desk.log[0];

  return (
    <main className="@container w-full">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 @3xl:px-8 @3xl:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <span className="mr-2 inline-block size-2 rounded-full bg-emerald-500 align-middle" />
            {desk.run.county} · run {when(desk.run.ranOn)} · {desk.run.seconds} s · public records
          </p>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm"><a href="/story.html">How it works</a></Button>
            <Button variant="ghost" size="sm" onClick={() => reset.mutate({})} disabled={reset.isPending}>Reset demo</Button>
          </div>
        </div>

        <section className="space-y-3">
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight @3xl:text-5xl">
            {desk.counts.hot} hot leads in {desk.run.county.replace(", TN", "")}
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            {desk.counts.foreclosure} foreclosure sales are scheduled, {desk.counts.saleSoon} of them in the next 30 days.{" "}
            {desk.counts.taxSale} owners lost their property at the tax sale and can still buy it back.
          </p>
        </section>

        <section aria-label="This run" className="grid grid-cols-2 gap-3 @3xl:grid-cols-6">
          <Stat n={desk.counts.foreclosure} label="foreclosure sales" accent />
          <Stat n={desk.counts.taxSale} label="tax-sale redemptions" />
          <Stat n={desk.counts.stacked} label="with 2+ signals" />
          <Stat n={desk.run.parcels.toLocaleString("en-US")} label="properties read" />
          {top && (
            <button
              type="button"
              onClick={() => toggle(top.id)}
              className="col-span-2 flex flex-col justify-between gap-2 rounded-2xl bg-foreground p-5 text-left text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deal)]"
            >
              <span className="text-sm opacity-70">Start here</span>
              <span className="text-xl font-bold">{top.addr}</span>
              <span className="text-sm opacity-80">{top.why.map((x) => SHORT[x.signal]).join(" · ")}</span>
              <span className="text-3xl font-extrabold text-[var(--deal-on-dark)]">{top.score}</span>
            </button>
          )}
        </section>

        <section aria-label="Steer the list" className="space-y-3 rounded-3xl border bg-card p-5">
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); sendAsk(); }}>
            <label htmlFor="ask" className="sr-only">What should I change about this list?</label>
            <input
              id="ask"
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="What should I change about this list?"
              className="min-h-12 min-w-0 flex-[1_1_320px] rounded-xl border bg-transparent px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--deal)]"
            />
            <Button type="submit" className="min-h-12 bg-[var(--deal)] px-6 text-white hover:bg-[var(--deal)]/90">Send</Button>
          </form>
          <div className="grid gap-2 @2xl:grid-cols-3">
            <SteerCard title="Hide land lots" effect="Only houses stay on the list" on={desk.hideLand} busy={busy}
              onClick={() => steer({}, !desk.hideLand, desk.hideLand ? "show land lots" : "ignore land")} />
            <SteerCard title="Push inherited homes up" effect="Heirs on the deed count 40, not 15" on={w.inherited >= 40} busy={busy}
              onClick={() => steer({ inherited: w.inherited >= 40 ? DEFAULT_WEIGHTS.inherited : 40 }, undefined, "push inherited homes up")} />
            <SteerCard title="Sales within 30 days first" effect="Soonest foreclosure dates rise" on={w.sale_soon >= 40} busy={busy}
              onClick={() => steer({ sale_soon: w.sale_soon >= 40 ? DEFAULT_WEIGHTS.sale_soon : 40 }, undefined, "sales within 30 days first")} />
          </div>
          {(latest || changed) && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--deal-soft)] px-4 py-2.5 text-sm">
              <span>{latest?.text}</span>
              {changed && <button type="button" className="font-semibold text-[var(--deal)] underline-offset-2 hover:underline" onClick={() => resetWeights.mutate({})}>Back to defaults</button>}
            </div>
          )}
        </section>

        <section aria-label="Call list" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Call list</h2>
            <div role="tablist" aria-label="Filter" className="flex flex-wrap gap-1.5">
              {([["all", `All ${desk.leads.length}`], ["foreclosure", `Foreclosure ${desk.counts.foreclosure}`], ["tax_sale", `Tax sale ${desk.counts.taxSale}`], ["called", `Called ${desk.counts.called}`]] as [Filter, string][]).map(([f, label]) => (
                <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                  className={cn("min-h-9 rounded-full border px-3.5 text-sm font-medium", filter === f ? "border-foreground bg-foreground text-background" : "bg-card")}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 @3xl:grid-cols-2">
            {shown.map((r) => <LeadCard key={r.id} r={r} open={open === r.id} onToggle={() => toggle(r.id)} />)}
          </div>
          {list.length > 12 && (
            <Button variant="outline" className="w-full" onClick={() => setShowAll((v) => !v)}>{showAll ? "Show the top 12" : `Show all ${list.length}`}</Button>
          )}
          {list.length === 0 && <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">Nothing here yet.</p>}
        </section>

        <section aria-label="Drafts" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Waiting for your OK</h2>
            <div className="flex flex-wrap gap-1.5">
              <span className="self-center text-sm text-muted-foreground">Not online here:</span>
              {([["code-violations", "Code violations"], ["delinquent-taxes", "Unpaid taxes"], ["probate", "New estates"]] as const).map(([list, label]) => (
                <Button key={list} size="sm" variant="outline" disabled={draftRequest.isPending} onClick={() => draftRequest.mutate({ list })}>Request {label.toLowerCase()}</Button>
              ))}
            </div>
          </div>
          {desk.drafts.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
              Drafts land here: records requests for lists that aren't online, and offer notes the agent writes. Nothing leaves until you approve it.
            </p>
          ) : (
            desk.drafts.map((d) => <DraftCard key={d.id} d={d} />)
          )}
        </section>

        <footer className="border-t pt-4 text-xs text-muted-foreground">
          Sources: Montgomery County assessor parcels (APSU GIS), foreclosure notices on tnpublicnotice.com, Chancery Court tax-sale results. House numbers masked; no owner names. {desk.run.toCheck} records need a person to check them.
        </footer>
      </div>
    </main>
  );
}
