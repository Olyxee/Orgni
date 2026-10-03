CREATE TABLE "email_verifications" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "email_verifications_email_idx" ON "email_verifications" USING btree ("email");--> statement-breakpoint
-- Accounts that already exist were created by this deployment, not by
-- unverified self-registration, so treat them as proven. Without this every
-- existing account is locked out the moment verification is switched on.
UPDATE "accounts" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;