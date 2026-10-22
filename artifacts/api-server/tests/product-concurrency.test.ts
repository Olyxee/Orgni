/**
 * Tenant State Concurrency and Data Integrity Unit Tests.
 *
 * Covers:
 *  - Test A: Concurrent member updates (both survive)
 *  - Test B: Regression for the reported lost-update scenario (shows naive get/put loses updates, updateState preserves all)
 *  - Test C: State and action-log consistency (failed mutation leaves no phantom action)
 *  - Test D: Tenant isolation (concurrent operations across distinct tenants remain isolated)
 *  - Test E: Existing workflow regression (sequential member-updates, action logging, approvals)
 */
import { beforeEach, describe, expect, it } from "vitest";
import { __resetProductStore, getProductStore } from "../src/product/store.js";
import { processRequest, resolveAction } from "../src/product/engine.js";

const TENANT_A = "tenant_test_concurrency_a";
const TENANT_B = "tenant_test_concurrency_b";

beforeEach(async () => {
  __resetProductStore();
  const store = getProductStore();
  await store.updateState(TENANT_A, (state) => {
    state.organisation = {
      tenantId: TENANT_A,
      name: "Concurrency Corp",
      workEmail: "admin@concurrency.test",
      website: "https://concurrency.test",
      onboardingStep: 7,
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
    };
    state.members = [
      {
        email: "alice@concurrency.test",
        name: "Alice Owner",
        role: "owner",
        status: "active",
        avatar: null,
        addedAt: new Date().toISOString(),
      },
    ];
    return state;
  });

  await store.updateState(TENANT_B, (state) => {
    state.organisation = {
      tenantId: TENANT_B,
      name: "Tenant B Corp",
      workEmail: "admin@tenantb.test",
      website: "https://tenantb.test",
      onboardingStep: 7,
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
    };
    state.members = [
      {
        email: "bob@tenantb.test",
        name: "Bob Owner",
        role: "owner",
        status: "active",
        avatar: null,
        addedAt: new Date().toISOString(),
      },
    ];
    return state;
  });
});

describe("Tenant State Concurrency — Unit Suite", () => {
  /**
   * Test A — Concurrent member updates
   * Two coordinated operations concurrently add different members to the same tenant.
   * Both valid changes must survive.
   */
  it("Test A: preserves all concurrent member additions on the same tenant", async () => {
    const store = getProductStore();

    // Start two concurrent operations targeting the same tenant
    const op1 = store.updateState(TENANT_A, async (state) => {
      // Simulate minor async work (e.g. email validation or network delay)
      await new Promise((r) => setTimeout(r, 15));
      state.members = [
        ...state.members,
        {
          email: "member1@concurrency.test",
          name: "Member One",
          role: "member",
          status: "invited",
          avatar: null,
          addedAt: new Date().toISOString(),
        },
      ];
      return state;
    });

    const op2 = store.updateState(TENANT_A, async (state) => {
      await new Promise((r) => setTimeout(r, 10));
      state.members = [
        ...state.members,
        {
          email: "member2@concurrency.test",
          name: "Member Two",
          role: "admin",
          status: "invited",
          avatar: null,
          addedAt: new Date().toISOString(),
        },
      ];
      return state;
    });

    await Promise.all([op1, op2]);

    const finalState = await store.getState(TENANT_A);
    const emails = finalState.members.map((m) => m.email);

    expect(emails).toContain("alice@concurrency.test");
    expect(emails).toContain("member1@concurrency.test");
    expect(emails).toContain("member2@concurrency.test");
    expect(finalState.members).toHaveLength(3);

    const m1 = finalState.members.find((m) => m.email === "member1@concurrency.test");
    const m2 = finalState.members.find((m) => m.email === "member2@concurrency.test");
    expect(m1?.role).toBe("member");
    expect(m2?.role).toBe("admin");
  });

  /**
   * Test B — Regression for the reported lost-update scenario
   * Demonstrates:
   * 1. The original uncoordinated read-modify-write pattern causes lost updates.
   * 2. The transactional `updateState` fix prevents lost updates completely.
   */
  it("Test B: demonstrates lost update with naive get/put, and proves updateState prevents it", async () => {
    const store = getProductStore();

    // 1. Reproduce the vulnerability with the naive get/put sequence
    const snapshot1 = await store.getState(TENANT_A);
    const snapshot2 = await store.getState(TENANT_A);

    // Op 1 modifies its snapshot
    snapshot1.members.push({
      email: "lost_bob@concurrency.test",
      name: "Bob",
      role: "member",
      status: "invited",
      avatar: null,
      addedAt: new Date().toISOString(),
    });

    // Op 2 modifies its snapshot
    snapshot2.members.push({
      email: "surviving_carol@concurrency.test",
      name: "Carol",
      role: "member",
      status: "invited",
      avatar: null,
      addedAt: new Date().toISOString(),
    });

    // Op 1 writes its state
    await store.putState(TENANT_A, snapshot1);
    // Op 2 writes its stale state, overwriting Op 1's member!
    await store.putState(TENANT_A, snapshot2);

    const lostUpdateState = await store.getState(TENANT_A);
    // Bob was lost!
    expect(lostUpdateState.members.some((m) => m.email === "lost_bob@concurrency.test")).toBe(false);
    expect(lostUpdateState.members.some((m) => m.email === "surviving_carol@concurrency.test")).toBe(true);

    // 2. Now run the same concurrent scenario with the transactional updateState fix
    const fixedOp1 = store.updateState(TENANT_A, async (state) => {
      await new Promise((r) => setTimeout(r, 10));
      state.members.push({
        email: "fixed_dan@concurrency.test",
        name: "Dan",
        role: "member",
        status: "invited",
        avatar: null,
        addedAt: new Date().toISOString(),
      });
      return state;
    });

    const fixedOp2 = store.updateState(TENANT_A, async (state) => {
      await new Promise((r) => setTimeout(r, 10));
      state.members.push({
        email: "fixed_eve@concurrency.test",
        name: "Eve",
        role: "member",
        status: "invited",
        avatar: null,
        addedAt: new Date().toISOString(),
      });
      return state;
    });

    await Promise.all([fixedOp1, fixedOp2]);

    const fixedFinalState = await store.getState(TENANT_A);
    expect(fixedFinalState.members.some((m) => m.email === "fixed_dan@concurrency.test")).toBe(true);
    expect(fixedFinalState.members.some((m) => m.email === "fixed_eve@concurrency.test")).toBe(true);
  });

  /**
   * Test C — State and action-log consistency
   * Concurrent mutations with action logging must remain consistent.
   * A rolled-back mutation must not leave phantom actions.
   */
  it("Test C: ensures state and action log consistency and rollback safety", async () => {
    const store = getProductStore();

    // Run two concurrent requests through engine.processRequest
    const req1 = processRequest({
      tenantId: TENANT_A,
      text: "prepare everything for the quarterly audit meeting",
    });

    const req2 = processRequest({
      tenantId: TENANT_A,
      text: "find all contracts and vendor documents from 2026",
    });

    const [res1, res2] = await Promise.all([req1, req2]);
    expect(res1.action.status).toBe("completed");
    expect(res2.action.status).toBe("completed");

    const afterState = await store.getState(TENANT_A);
    const actionIds = afterState.activity.map((a) => a.id);

    // Both action records must be recorded in activity history
    expect(actionIds).toContain(res1.action.id);
    expect(actionIds).toContain(res2.action.id);

    // Verify rollback safety: an error inside updateState rolls back and leaves no partial state
    const memberCountBefore = afterState.members.length;
    const actionCountBefore = afterState.activity.length;

    await expect(
      store.updateState(TENANT_A, async (state) => {
        state.members.push({
          email: "phantom@concurrency.test",
          name: "Phantom",
          role: "member",
          status: "invited",
          avatar: null,
          addedAt: new Date().toISOString(),
        });
        state.activity.unshift({
          id: "phantom_action",
          title: "Phantom action",
          status: "completed",
          at: new Date().toISOString(),
          requestedBy: null,
          capability: "prepare_work",
          understood: "phantom",
          sourcesUsed: [],
          actionsPerformed: [],
          reason: "",
          result: "",
          source: "web",
        });
        throw new Error("Simulated mutation failure");
      }),
    ).rejects.toThrow("Simulated mutation failure");

    const rolledBackState = await store.getState(TENANT_A);
    expect(rolledBackState.members).toHaveLength(memberCountBefore);
    expect(rolledBackState.activity).toHaveLength(actionCountBefore);
    expect(rolledBackState.members.some((m) => m.email === "phantom@concurrency.test")).toBe(false);
    expect(rolledBackState.activity.some((a) => a.id === "phantom_action")).toBe(false);
  });

  /**
   * Test D — Tenant isolation
   * Concurrent operations targeting distinct tenants must never cross-pollinate.
   */
  it("Test D: preserves strict tenant isolation during concurrent operations", async () => {
    const store = getProductStore();

    const opA = store.updateState(TENANT_A, async (state) => {
      await new Promise((r) => setTimeout(r, 15));
      state.members.push({
        email: "member_a@concurrency.test",
        name: "Member A",
        role: "member",
        status: "invited",
        avatar: null,
        addedAt: new Date().toISOString(),
      });
      return state;
    });

    const opB = store.updateState(TENANT_B, async (state) => {
      await new Promise((r) => setTimeout(r, 10));
      state.members.push({
        email: "member_b@tenantb.test",
        name: "Member B",
        role: "admin",
        status: "invited",
        avatar: null,
        addedAt: new Date().toISOString(),
      });
      return state;
    });

    await Promise.all([opA, opB]);

    const stateA = await store.getState(TENANT_A);
    const stateB = await store.getState(TENANT_B);

    const emailsA = stateA.members.map((m) => m.email);
    const emailsB = stateB.members.map((m) => m.email);

    expect(emailsA).toContain("member_a@concurrency.test");
    expect(emailsA).not.toContain("member_b@tenantb.test");

    expect(emailsB).toContain("member_b@tenantb.test");
    expect(emailsB).not.toContain("member_a@concurrency.test");
  });

  /**
   * Test E — Existing workflow regression
   * Tests sequential member updates, role modifications, and action resolution.
   */
  it("Test E: supports sequential workflow without regressions", async () => {
    const store = getProductStore();

    // 1. Add member
    await store.updateState(TENANT_A, (state) => {
      state.members.push({
        email: "dave@concurrency.test",
        name: "Dave",
        role: "member",
        status: "invited",
        avatar: null,
        addedAt: new Date().toISOString(),
      });
      return state;
    });

    let state = await store.getState(TENANT_A);
    expect(state.members.find((m) => m.email === "dave@concurrency.test")?.role).toBe("member");

    // 2. Change member role
    await store.updateState(TENANT_A, (state) => {
      const m = state.members.find((x) => x.email === "dave@concurrency.test");
      if (m) m.role = "admin";
      return state;
    });

    state = await store.getState(TENANT_A);
    expect(state.members.find((m) => m.email === "dave@concurrency.test")?.role).toBe("admin");

    // 3. Enable email capability and test approval workflow
    await store.updateState(TENANT_A, (state) => {
      state.capabilities = state.capabilities.map((c) =>
        c.key === "send_emails" ? { ...c, enabled: true } : c,
      );
      return state;
    });

    const engineRes = await processRequest({
      tenantId: TENANT_A,
      text: "send an email to the client about tomorrow",
      requestedBy: "Alice",
    });

    expect(engineRes.needsApproval).toBe(true);
    expect(engineRes.action.status).toBe("awaiting_approval");

    const resolved = await resolveAction(TENANT_A, engineRes.action.id, true);
    expect(resolved?.status).toBe("completed");

    state = await store.getState(TENANT_A);
    const recordedAction = state.activity.find((a) => a.id === engineRes.action.id);
    expect(recordedAction?.status).toBe("completed");
  });
});
