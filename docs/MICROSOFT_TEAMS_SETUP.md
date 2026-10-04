# Local Orgni Teams setup

This guide is for testing Orgni in one Microsoft 365 work/school tenant.
You need Teams, permission to upload a custom Teams app, and Azure access to
register an Azure Bot. Azure resources can incur charges; use a test subscription.

## Registration

1. Sign into https://portal.azure.com with your work/school account. Create an
   Azure Bot resource with a **Single Tenant** app identity. Record its Microsoft
   App ID and the Directory (tenant) ID of its Entra app registration.
2. In that Entra app registration, create a client secret under Certificates &
   secrets. Copy the secret **Value**, not its ID, into the local env file below.
   Do not put secrets in chat, source control, or screenshots.
3. In the Azure Bot resource, enable the Microsoft Teams channel.

New multi-tenant bot registrations are no longer supported after 31 July 2025.
Existing registrations may continue working. The repository uses the older
Bot Framework SDK; migration to a maintained SDK is a separate follow-up.

## Local configuration

Copy `artifacts/api-server/.env.example` to `artifacts/api-server/.env` if that
file does not exist. The `.env` file is gitignored, and `npm run dev` loads it.
Set these entries without the angle-bracket placeholders:

```dotenv
MICROSOFT_APP_TYPE=SingleTenant
MICROSOFT_APP_ID=<bot app client ID>
MICROSOFT_APP_TENANT_ID=<Microsoft directory tenant ID>
MICROSOFT_APP_PASSWORD=<client secret VALUE>
TEAMS_APP_ID=<a new stable GUID for the Teams app>
PUBLIC_BASE_URL=<public HTTPS tunnel origin for port 8080>
APP_BASE_URL=http://localhost:5173
```

Generate TEAMS_APP_ID in PowerShell using `[guid]::NewGuid()`.
The local launcher uses API_PORT (default 8080) and WEB_PORT (default 5173) to
keep the servers on separate ports, regardless of PORT in the API env file.

Microsoft needs a public HTTPS endpoint for your local API. Use a development
tunnel to port 8080, then configure the Azure Bot messaging endpoint as:

```text
https://<your-tunnel-host>/api/teams/messages
```

Opening the tunnel exposes the development API, including passwordless dev
login. Use disposable test data and a short-lived tunnel; close it after testing.
Verify the tunnel reaches `/api/health` before trying the bot.

## Link, install, and ask

1. Restart `npm run dev` after changing the env file. Keep it and the tunnel running.
2. Sign into Orgni under the organisation you want to test.
3. Open http://localhost:5173/app/settings/teams and select Details/Manage.
4. For this local test, use the manual Microsoft tenant-ID link field to link
   your directory tenant ID to your current Orgni organisation. It is a local
   testing shortcut, not proof that you own that Microsoft tenant. Do not link
   another organisation's tenant. Links are lost on API restart without a database.
5. Download the generated Teams app package once bot status is Configured.
6. In Teams, use Apps → Manage your apps → Upload an app → Upload a custom app
   (labels may vary). Upload `orgni-teams-app.zip`, then add Orgni to a personal chat.
   If upload is absent, your Teams administrator must enable it for your account.
7. Send a personal-chat question, or mention `@Orgni` in a channel where it is installed.
8. Check the API terminal and Orgni activity to confirm processing. A reply does
   not prove business-context accuracy; retrieval gaps are documented in the report.

The existing Connect Microsoft Teams button uses an admin-consent flow intended
for broader onboarding. For this single-tenant local test, use the manual link
instead of assuming the current `/organizations` consent URL supports the new
registration. Account verification and production linking need separate review.

## Test before Azure registration

At http://localhost:5173/app/settings/teams there is already an **Ask Orgni**
test box. This calls the engine without Teams transport or identity resolution.
Use it to check replies while preparing the real bot registration.

## Troubleshooting

- Not configured: check app ID and client secret, then restart the API.
- Teams receives no reply: verify the public messaging endpoint and Teams channel;
  check API logs for authentication or unlinked-user errors.
- Unknown tenant: link the directory ID under the intended Orgni organisation.
- Unknown/blocked user: check the organisation's member and audience settings.
- Changes disappear: local product and identity state is in memory without DATABASE_URL.

References:
- https://learn.microsoft.com/en-us/azure/bot-service/provision-and-publish-a-bot?view=azure-bot-service-4.0
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/debug/locally-with-an-ide
