import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organisations } from "./product";

export const accounts = pgTable("accounts", {
  email: text("email").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => organisations.tenantId),
  passwordHash: text("password_hash").notNull(),
  /**
   * When the address was proven. NULL means the account has never been
   * verified, so it must not receive a session while verification is on.
   */
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Outstanding email-verification tokens.
 *
 * Same design as password_resets: only the SHA-256 of the emailed token is
 * stored, rows are deleted on use, and requesting a new link voids the old.
 */
export const emailVerifications = pgTable(
  "email_verifications",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_verifications_email_idx").on(t.email)],
);

/**
 * Outstanding password-reset tokens.
 *
 * Only the SHA-256 of the emailed token is stored, so a leaked database dump
 * cannot be replayed against the reset endpoint. Rows are deleted on use and on
 * any new request, which keeps at most one live token per address and lets the
 * table stay small without a cleanup job.
 */
export const passwordResets = pgTable(
  "password_resets",
  {
    /** SHA-256 hex of the emailed token; the token itself is never stored. */
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_resets_email_idx").on(t.email)],
);
