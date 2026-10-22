/**
 * Tenant State Concurrency — PostgreSQL Integration Tests.
 *
 * Runs against a REAL PostgreSQL database.
 * Uses the repository standard environment variable convention:
 *   TEST_DATABASE_URL=postgres://... pnpm vitest run tests/product-concurrency-postgres.test.ts
 *
 * Automatically skips when TEST_DATABASE_URL / DATABASE_URL is unset, matching
 * the pattern established in auth-postgres.test.ts and lib/db/tests/repository.test.ts.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq, or, sql } from "drizzle-orm";
import { createDb, type DbHandle } from "@workspace/db/connect";
import {
  organisations,
  members as membersTable,
  orgniActions as actionsTable,
  capabilities as capabilitiesTable,
  connections as connectionsTable,
  approvalPolicies as approvalsTable,
  permissionsState as permissionsTable,
  teamsIntegration as teamsTable,
} from "@workspace/db/schema";
import { getProductStore, __resetProductStore } from "../src/product/store";
import { processRequest, resolveAction } from "../src/product/engine";

const DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const describeLive = DATABASE_URL ? describe : describe.skip;

const TENANT_A = "tenant_pg_concurrency_a";
const TENANT_B = "tenant_pg_concurrency_b";

let handle: DbHandle | null = null;

async function clearTestData(h: DbHandle) {
  const db = h.db;
  await db.transaction(async (tx) => {
    const filter = or(eq(organisations.tenantId, TENANT_A), eq(organisations.tenantId, TENANT_B));
    await tx.delete(membersTable).where(or(eq(membersTable.tenantId, TENANT_A), eq(membersTable.tenantId, TENANT_B)));
    await tx.delete(actionsTable).where(or(eq(actionsTable.tenantId, TENANT_A), eq(actionsTable.tenantId, TENANT_B)));
    await tx.delete(capabilitiesTable).where(or(eq(capabilitiesTable.tenantId, TENANT_A), eq(capabilitiesTable.tenantId, TENANT_B)));
    await tx.delete(approvalsTable).where(or(eq(approvalsTable.tenantId, TENANT_A), eq(approvalsTable.tenantId, TENANT_B)));
    await tx.delete(connectionsTable).where(or(eq(connectionsTable.tenantId, TENANT_A), eq(connectionsTable.tenantId, TENANT_B)));
    await tx.delete(permissionsTable).where(or(eq(permissionsTable.tenantId, TENANT_A), eq(permissionsTable.tenantId, TENANT_B)));
    await tx.delete(teamsTable).where(or(eq(teamsTable.tenantId, TENANT_A), eq(teamsTable.tenantId, TENANT_B)));
    await tx.delete(organisations).where(filter);
  });
}

describeLive("Tenant State Concurrency — PostgreSQL Integration Suite", () => {
  beforeEach(async () => {
    if (!DATABASE_URL) return;
    if (!handle) {
      handle = createDb(DATABASE_URL);
    }
    await clearTestData(handle);
    __resetProductStore();

    // Seed initial state for Tenant A and Tenant B
    const store = getProductStore();
    await store.updateState(TENANT_A, (state) => {
      state.organisation = {
        tenantId: TENANT_A,
        name: "Postgres Concurrency Corp",
        workEmail: "admin@pg-concurrency.test",
        website: "https://pg-concurrency.test",
        onboardingStep: 7,
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
      };
      state.members = [
        {
          email: "alice@pg-concurrency.test",
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
        name: "Postgres Tenant B Corp",
        workEmail: "admin@pg-tenantb.test",
        website: "https://pg-tenantb.test",
        onboardingStep: 7,
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
      };
      state.members = [
        {
          email: "bob@pg-tenantb.test",
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

  afterAll(async () => {
    if (handle) {
      await clearTestData(handle);
      await handle.close();
      handle = null;
    }
  });

  /**
   * Test A — Concurrent member updates on real PostgreSQL
   * Starts two coordinated operations concurrently on separate DB connections/transactions.
   * Both operations attempt to update overlapping tenant state.
   * Verifies that both valid changes survive in PostgreSQL after both complete.
   */
  it("Test A: preserves concurrent member additions in PostgreSQL without lost updates", async () => {
    const store = getProductStore();

    // Run two concurrent updateState calls against PostgreSQL
    const op1 = store.updateState(TENANT_A, async (state) => {
      // Simulate concurrent processing window
      await new Promise((r) => setTimeout(r, 20));
      state.members = [
        ...state.members,
        {
          email: "member_pg_1@concurrency.test",
          name: "PG Member One",
          role: "member",
          status: "invited",
          avatar: null,
          addedAt: new Date().toISOString(),
        },
      ];
      return state;
    });

    const op2 = store.updateState(TENANT_A, async (state) => {
      await new Promise((r) => setTimeout(r, 15));
      state.members = [
        ...state.members,
        {
          email: "member_pg_2@concurrency.test",
          name: "PG Member Two",
          role: "admin",
          status: "invited",
          avatar: null,
          addedAt: new Date().toISOString(),
        },
      ];
      return state;
    });

    await Promise.all([op1, op2]);

    // Inspect directly from PostgreSQL
    const finalState = await store.getState(TENANT_A);
    const emails = finalState.members.map((m) => m.email);

    expect(emails).toContain("alice@pg-concurrency.test");
    expect(emails).toContain("member_pg_1@concurrency.test");
    expect(emails).toContain("member_pg_2@concurrency.test");
    expect(finalState.members).toHaveLength(3);

    // Also verify directly against raw PostgreSQL table rows
    const rows = await handle!.db
      .select()
      .from(membersTable)
      .where(eq(membersTable.tenantId, TENANT_A));
    const dbEmails = rows.map((r) => r.email);
    expect(dbEmails).toContain("alice@pg-concurrency.test");
    expect(dbEmails).toContain("member_pg_1@concurrency.test");
    expect(dbEmails).toContain("member_pg_2@concurrency.test");
  });

  /**
   * Test B — Regression for the reported lost-update scenario in PostgreSQL
   * Demonstrates:
   * 1. The original uncoordinated read-modify-write pattern causes lost updates.
   * 2. The transactional advisory lock fix prevents lost updates completely.
   */
  it("Test B: proves lost update under uncoordinated get/put and safety with updateState", async () => {
    const store = getProductStore();

    // 1. Uncoordinated read-modify-write (reproducing the vulnerability)
    const snap1 = await store.getState(TENANT_A);
    const snap2 = await store.getState(TENANT_A);

    snap1.members.push({
      email: "lost_pg_bob@concurrency.test",
      name: "Lost Bob",
      role: "member",
      status: "invited",
      avatar: null,
      addedAt: new Date().toISOString(),
    });

    snap2.members.push({
      email: "surviving_pg_carol@concurrency.test",
      name: "Surviving Carol",
      role: "member",
      status: "invited",
      avatar: null,
      addedAt: new Date().toISOString(),
    });

    await store.putState(TENANT_A, snap1);
    await store.putState(TENANT_A, snap2);

    const lostState = await store.getState(TENANT_A);
    expect(lostState.members.some((m) => m.email === "lost_pg_bob@concurrency.test")).toBe(false);
    expect(lostState.members.some((m) => m.email === "surviving_pg_carol@concurrency.test")).toBe(true);

    // 2. Coordinated updateState (verifying the fix)
    const fixedOp1 = store.updateState(TENANT_A, async (state) => {
      await new Promise((r) => setTimeout(r, 10));
      state.members.push({
        email: "retained_pg_dan@concurrency.test",
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
        email: "retained_pg_eve@concurrency.test",
        name: "Eve",
        role: "member",
        status: "invited",
        avatar: null,
        addedAt: new Date().toISOString(),
      });
      return state;
    });

    await Promise.all([fixedOp1, fixedOp2]);

    const fixedState = await store.getState(TENANT_A);
    expect(fixedState.members.some((m) => m.email === "retained_pg_dan@concurrency.test")).toBe(true);
    expect(fixedState.members.some((m) => m.email === "retained_pg_eve@concurrency.test")).toBe(true);
  });

  /**
   * Test C — State and action-log consistency in PostgreSQL
   * Concurrent mutations with action logging must remain consistent.
   * Rolled-back transactions must leave no partial rows in PostgreSQL tables.
   */
  it("Test C: verifies action log atomicity and rollback safety in PostgreSQL", async () => {
    const store = getProductStore();

    const [res1, res2] = await Promise.all([
      processRequest({
        tenantId: TENANT_A,
        text: "prepare the tax return summary",
      }),
      processRequest({
        tenantId: TENANT_A,
        text: "find all corporate compliance filings",
      }),
    ]);

    expect(res1.action.status).toBe("completed");
    expect(res2.action.status).toBe("completed");

    const state = await store.getState(TENANT_A);
    const actionIds = state.activity.map((a) => a.id);
    expect(actionIds).toContain(res1.action.id);
    expect(actionIds).toContain(res2.action.id);

    // Verify raw PostgreSQL table rows for actions
    const dbActions = await handle!.db
      .select()
      .from(actionsTable)
      .where(eq(actionsTable.tenantId, TENANT_A));
    const dbActionIds = dbActions.map((a) => a.id);
    expect(dbActionIds).toContain(res1.action.id);
    expect(dbActionIds).toContain(res2.action.id);

    // Test rollback: throwing in updateState must trigger a rollback in PostgreSQL
    const membersBefore = (
      await handle!.db
        .select()
        .from(membersTable)
        .where(eq(membersTable.tenantId, TENANT_A))
    ).length;

    await expect(
      store.updateState(TENANT_A, async (s) => {
        s.members.push({
          email: "phantom_pg@concurrency.test",
          name: "Phantom",
          role: "member",
          status: "invited",
          avatar: null,
          addedAt: new Date().toISOString(),
        });
        throw new Error("Simulated database failure");
      }),
    ).rejects.toThrow("Simulated database failure");

    // Check that PostgreSQL rolled back cleanly
    const membersAfter = (
      await handle!.db
        .select()
        .from(membersTable)
        .where(eq(membersTable.tenantId, TENANT_A))
    ).length;

    expect(membersAfter).toBe(membersBefore);
    const phantomRow = await handle!.db
      .select()
      .from(membersTable)
      .where(eq(membersTable.email, "phantom_pg@concurrency.test"));
    expect(phantomRow).toHaveLength(0);
  });

  /**
   * Test D — Tenant isolation in PostgreSQL
   * Concurrent transactions targeting separate tenants do not lock or cross-pollinate.
   */
  it("Test D: maintains strict tenant isolation across PostgreSQL transactions", async () => {
    const store = getProductStore();

    const opA = store.updateState(TENANT_A, async (state) => {
      await new Promise((r) => setTimeout(r, 20));
      state.members.push({
        email: "tenant_a_pg@concurrency.test",
        name: "Tenant A Member",
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
        email: "tenant_b_pg@tenantb.test",
        name: "Tenant B Member",
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

    expect(stateA.members.map((m) => m.email)).toContain("tenant_a_pg@concurrency.test");
    expect(stateA.members.map((m) => m.email)).not.toContain("tenant_b_pg@tenantb.test");

    expect(stateB.members.map((m) => m.email)).toContain("tenant_b_pg@tenantb.test");
    expect(stateB.members.map((m) => m.email)).not.toContain("tenant_a_pg@concurrency.test");
  });

  /**
   * Test E — Existing workflow regression in PostgreSQL
   * Sequential workflow operations (member update, capability toggle, action resolution).
   */
  it("Test E: supports full sequential workflow in PostgreSQL without regression", async () => {
    const store = getProductStore();

    // 1. Add member
    await store.updateState(TENANT_A, (state) => {
      state.members.push({
        email: "sequential_pg@concurrency.test",
        name: "Sequential Member",
        role: "member",
        status: "invited",
        avatar: null,
        addedAt: new Date().toISOString(),
      });
      return state;
    });

    let state = await store.getState(TENANT_A);
    expect(state.members.find((m) => m.email === "sequential_pg@concurrency.test")?.role).toBe("member");

    // 2. Update role
    await store.updateState(TENANT_A, (state) => {
      const m = state.members.find((x) => x.email === "sequential_pg@concurrency.test");
      if (m) m.role = "admin";
      return state;
    });

    state = await store.getState(TENANT_A);
    expect(state.members.find((m) => m.email === "sequential_pg@concurrency.test")?.role).toBe("admin");

    // 3. Approval workflow
    await store.updateState(TENANT_A, (state) => {
      state.capabilities = state.capabilities.map((c) =>
        c.key === "send_emails" ? { ...c, enabled: true } : c,
      );
      return state;
    });

    const engineRes = await processRequest({
      tenantId: TENANT_A,
      text: "send an email to the auditors",
      requestedBy: "Alice",
    });

    expect(engineRes.needsApproval).toBe(true);
    expect(engineRes.action.status).toBe("awaiting_approval");

    const resolved = await resolveAction(TENANT_A, engineRes.action.id, true);
    expect(resolved?.status).toBe("completed");

    state = await store.getState(TENANT_A);
    const action = state.activity.find((a) => a.id === engineRes.action.id);
    expect(action?.status).toBe("completed");
  });
});
