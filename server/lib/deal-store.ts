import { getSetting, putSetting } from "@agent-native/core/settings";

import { newState, type DealState } from "../../shared/deal.js";
import { SNAPSHOT } from "../../shared/snapshot.js";

const KEY = "dealdesk";

export const snapshot = SNAPSHOT;

/** Today's date (UTC); sale-date signals are worked out from it. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const now = () => new Date().toISOString();

export async function loadState(): Promise<DealState> {
  const raw = await getSetting(KEY);
  if (raw?.weights) return raw as unknown as DealState;
  const fresh = newState();
  await saveState(fresh);
  return fresh;
}

export async function saveState(state: DealState) {
  await putSetting(KEY, state as unknown as Record<string, unknown>, { requestSource: "action" });
}

export function findLead(id: string) {
  const l = SNAPSHOT.leads.find((x) => x.id === id) ?? SNAPSHOT.quiet.find((x) => x.id === id);
  if (!l) throw new Error(`No lead ${id}. Lead ids look like L1 (hot) or Q1 (quiet distress); get-desk lists them.`);
  return l;
}
