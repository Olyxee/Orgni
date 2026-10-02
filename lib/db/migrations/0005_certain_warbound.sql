CREATE TABLE "accounts" (
	"email" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_organisations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organisations"("tenant_id") ON DELETE no action ON UPDATE no action;