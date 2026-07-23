const integrations = [
  { name: "SAP", file: "sap.svg" },
  { name: "Salesforce", file: "salesforce.svg" },
  { name: "Slack", file: "slack.svg" },
  { name: "Gmail", file: "gmail.svg" },
  { name: "Google Drive", file: "googledrive.svg" },
  { name: "Google Sheets", file: "googlesheets.svg" },
  { name: "Notion", file: "notion.svg" },
  { name: "Jira", file: "jira.svg" },
  { name: "Asana", file: "asana.svg" },
  { name: "HubSpot", file: "hubspot.svg" },
  { name: "QuickBooks", file: "quickbooks.svg" },
  { name: "Xero", file: "xero.svg" },
  { name: "Stripe", file: "stripe.svg" },
  { name: "Dropbox", file: "dropbox.svg" },
  { name: "GitHub", file: "github.svg" },
  { name: "Zapier", file: "zapier.svg" },
];

export function IntegrationsSection() {
  return (
    <section className="py-16 md:py-20 px-6 md:px-12 max-w-screen-xl mx-auto border-t border-border/50">
      <p className="text-center text-xs font-medium text-muted-foreground tracking-widest uppercase mb-10">
        Connects to the tools you already use
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-8 gap-y-10 items-center justify-items-center">
        {integrations.map((tool) => (
          <div key={tool.name} className="flex flex-col items-center gap-2" title={tool.name}>
            <img
              src={`${import.meta.env.BASE_URL}integrations/${tool.file}`}
              alt={`${tool.name} logo`}
              className="h-8 w-8 object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-200"
              loading="lazy"
            />
            <span className="text-[11px] text-muted-foreground">{tool.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
