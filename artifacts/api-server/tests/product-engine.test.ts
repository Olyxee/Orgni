/**
 * Engine + product-store behaviour (in-memory store, no DB, no Teams).
 *
 * Covers the two gates the Teams bot depends on:
 *  - capability gate: a disabled capability declines the request
 *  - approval gate: an action that changes the outside world with a non-"none"
 *    policy is held for approval, and resolving it completes/rejects
 */
import { beforeEach, describe, expect, it } from "vitest";
import { __resetProductStore, getProductStore } from "../src/product/store.js";
import { processRequest, resolveAction } from "../src/product/engine.js";

const TENANT = "tenant_test_engine";

beforeEach(async () => {
  __resetProductStore();
  const store = getProductStore();
  const state = await store.getState(TENANT);
  state.organisation = {
    tenantId: TENANT,
    name: "Test Co",
    workEmail: "a@test.co",
    website: "",
    onboardingStep: 7,
    onboardingComplete: true,
    createdAt: new Date().toISOString(),
  };
  await store.putState(TENANT, state);
});

describe("engine capability gate", () => {
  it("declines when the capability is disabled", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "send an email to the client about the delay",
    });
    expect(res.action.status).toBe("rejected");
    expect(res.needsApproval).toBe(false);
    expect(res.reply).toMatch(/turned off/i);
  });

  it("completes an allowed, no-approval capability", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "prepare everything for tomorrow's client meeting",
    });
    expect(res.action.status).toBe("completed");
    expect(res.action.capability).toBe("prepare_work");
  });
});

describe("engine approval gate", () => {
  it("holds an external action for approval, then completes on approve", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "send_emails" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "send an email to the supplier",
      requestedBy: "Sam",
    });
    expect(res.needsApproval).toBe(true);
    expect(res.action.status).toBe("awaiting_approval");
    expect(res.action.approval?.kind).toBe("email");

    const approved = await resolveAction(TENANT, res.action.id, true);
    expect(approved?.status).toBe("completed");

    const after = await store.getState(TENANT);
    expect(after.activity.find((a) => a.id === res.action.id)?.status).toBe(
      "completed",
    );
  });

  it("respects an 'always' policy for financial actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "pay invoice 4821",
    });
    expect(res.needsApproval).toBe(true);
    expect(res.action.approval?.kind).toBe("financial");
  });
});

describe("engine intent routing — invoice questions vs financial actions", () => {
  it("routes 'What is the total on invoice CI-2026-01052?' to answer_questions", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "What is the total on invoice CI-2026-01052?",
    });
    expect(res.action.capability).toBe("answer_questions");
    expect(res.action.status).toBe("completed");
    expect(res.needsApproval).toBe(false);
  });

  it("routes 'What is the amount due on invoice CI-2026-01052?' to answer_questions", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "What is the amount due on invoice CI-2026-01052?",
    });
    expect(res.action.capability).toBe("answer_questions");
    expect(res.action.status).toBe("completed");
    expect(res.needsApproval).toBe(false);
  });

  it("routes 'show me invoice CI-2026-01052' to find_documents", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "find_documents" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "show me invoice CI-2026-01052",
    });
    expect(res.action.capability).toBe("find_documents");
    expect(res.action.status).toBe("completed");
    expect(res.needsApproval).toBe(false);
  });

  it("still routes genuine pay/financial actions to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "pay invoice 4821 to the supplier",
    });
    expect(res.action.capability).toBe("financial_actions");
    expect(res.needsApproval).toBe(true);
  });

  it("routes 'reconcile our accounts for Q3' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "reconcile our accounts for Q3",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("does not route plain invoice-query to financial_actions when that capability is disabled", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "What is the amount due on invoice CI-2026-01052?",
    });
    expect(res.action.status).not.toBe("rejected");
    expect(res.action.capability).toBe("answer_questions");
  });

  // A. Read-only, NOT financial_actions
  it("routes 'Who is the customer on invoice CI-2026-01052?' to answer_questions", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "Who is the customer on invoice CI-2026-01052?",
    });
    expect(res.action.capability).toBe("answer_questions");
    expect(res.needsApproval).toBe(false);
  });

  it("routes 'What is the outstanding balance on invoice CI-2026-01052?' to answer_questions", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "What is the outstanding balance on invoice CI-2026-01052?",
    });
    expect(res.action.capability).toBe("answer_questions");
    expect(res.needsApproval).toBe(false);
  });

  it("routes 'Find the invoice for Apex' to find_documents", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "find_documents" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "Find the invoice for Apex",
    });
    expect(res.action.capability).toBe("find_documents");
    expect(res.needsApproval).toBe(false);
  });

  it("routes 'Show me the payment remittance for invoice CI-2026-01052' to find_documents", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "find_documents" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "Show me the payment remittance for invoice CI-2026-01052",
    });
    expect(res.action.capability).toBe("find_documents");
    expect(res.needsApproval).toBe(false);
  });

  it("routes 'What is our refund policy?' to answer_questions", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "What is our refund policy?",
    });
    expect(res.action.capability).toBe("answer_questions");
    expect(res.needsApproval).toBe(false);
  });

  it("routes 'How do we pay suppliers?' to answer_questions", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "How do we pay suppliers?",
    });
    expect(res.action.capability).toBe("answer_questions");
    expect(res.needsApproval).toBe(false);
  });

  // B. Operations, must be financial_actions
  it("routes 'reconcile the bank statement' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "reconcile the bank statement",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'refund Apex' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "refund Apex",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'refund the customer' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "refund the customer",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'transfer funds to the supplier' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "transfer funds to the supplier",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'make a payment of R500 to the supplier' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "make a payment of R500 to the supplier",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'send payment to Unified Steel' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "send payment to Unified Steel",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'process the payment' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "process the payment",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'approve payment 4821' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "approve payment 4821",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'schedule payment for Friday' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "schedule payment for Friday",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'wire R5000 to the supplier' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "wire R5000 to the supplier",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'create an invoice for Meridian' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "create an invoice for Meridian",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'issue an invoice to Apex' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "issue an invoice to Apex",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'void invoice CI-2026-01052' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "void invoice CI-2026-01052",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  it("routes 'can you pay invoice 4821?' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "can you pay invoice 4821?",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  // C. Compound, fail closed
  it("routes 'what is the total on invoice CI-2026-01052 and pay it' to financial_actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "what is the total on invoice CI-2026-01052 and pay it",
    });
    expect(res.action.capability).toBe("financial_actions");
  });

  // D. Unchanged intents
  it("asserts unchanged intent: send an email to the client about the delay -> send_emails", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "send an email to the client about the delay",
    });
    expect(res.action.capability).toBe("send_emails");
  });

  it("asserts unchanged intent: send an email to the supplier -> send_emails", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "send an email to the supplier",
    });
    expect(res.action.capability).toBe("send_emails");
  });

  it("asserts unchanged intent: prepare everything for tomorrow's client meeting -> prepare_work", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "prepare everything for tomorrow's client meeting",
    });
    expect(res.action.capability).toBe("prepare_work");
  });

  it("asserts unchanged intent: schedule a meeting with the team -> schedule_meetings", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "schedule a meeting with the team",
    });
    expect(res.action.capability).toBe("schedule_meetings");
  });

  it("asserts unchanged intent: update the delivery date in crm -> update_systems", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "update the delivery date in crm",
    });
    expect(res.action.capability).toBe("update_systems");
  });
});

