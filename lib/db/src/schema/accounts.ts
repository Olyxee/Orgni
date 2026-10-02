import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organisations } from "./product";

export const accounts = pgTable("accounts", {
  email: text("email").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => organisations.tenantId),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
