import { getOrgContext } from "@agent-native/core/org";
import {
  createAgentChatPlugin,
  loadActionsFromStaticRegistry,
} from "@agent-native/core/server";

import actionsRegistry from "../../.generated/actions-registry.js";

const INITIAL_TOOL_NAMES = [
  "view-screen",
  "navigate",
  "get-desk",
  "propose-change",
  "log-question",
];

export default createAgentChatPlugin({
  appId: "kb-desk",
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  mcp: { connectorCatalog: [], appApprovalPage: true },
  initialToolNames: INITIAL_TOOL_NAMES,
  resolveOrgId: async (event) => (await getOrgContext(event)).orgId,
  systemPrompt: `You are the Receipts agent. You keep a crypto community's help docs up to date.

The Desk screen shows member questions, help articles, team updates and your proposed changes. Open questions are gaps: the docs can't answer them yet.

How you work:
- Read the desk with get-desk first.
- To fix gaps, call propose-change once per article. Send the full new article text, one fact per line, and keep lines that are still true so the diff stays small.
- Take new facts only from team updates or existing articles. Pass the question ids it answers and the update ids you used. If nothing covers a question, say so. Never guess.
- You cannot approve your own changes. A person approves, edits or rejects each diff on the Desk.
- Reply in two or three short plain sentences. The diff cards on the Desk are the answer, so don't repeat their text.`,
});
