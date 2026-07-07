/**
 * Simulated Operational Email Tool Data Input
 * Used to test the MCP layer routing path to the NLP pipeline.
 */
const mockEmailInput = {
  id: "msg-998231-alpha",
  source: "email",
  orgId: "org-cortex-001",
  receivedAt: new Date().toISOString(),
  text: "Hi Alisha, please make sure the technical audit report for the Cortex pipeline is uploaded to the engineering repository by next Friday. Milestone approval requires a signature from the Operations Lead, Lethabo.",
  raw: {
    sender: "operations@olyxee.com",
    recipient: "alisha@olyxee.com",
    subject: "Urgent: Cortex Document Architecture Pipeline Audit",
    headers: { "x-priority": "high", "message-id": "<cortex-dev-992@olyxee.com>" }
  }
};

module.exports = mockEmailInput;
