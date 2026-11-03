import { defineAgentNativeConfig } from "@agent-native/core/config";

export default defineAgentNativeConfig({
  changelog: { enabled: false },
  harness: true,
  // The public demo runs with AUTH_DISABLED on purpose: masked public records, no sign-in.
  runtime: { auth: { enabled: false } },
});
