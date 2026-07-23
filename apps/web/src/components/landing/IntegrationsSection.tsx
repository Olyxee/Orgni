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
    <section className="py-16 md:py-24 px-6 md:px-12 max-w-screen-xl mx-auto border-t border-border bg-white">
      <div className="flex items-center gap-3 mb-10 justify-center">
        <div className="h-px w-8 bg-primary"></div>
        <p className="text-center text-xs font-mono font-medium text-muted-foreground tracking-widest uppercase">
          Connects to the tools you already use
        </p>
        <div className="h-px w-8 bg-primary"></div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-px bg-border">
        {integrations.map((tool) => (
          <div key={tool.name} className="flex flex-col items-center justify-center p-6 gap-3 bg-white hover:bg-secondary/20 transition-colors duration-200" title={tool.name}>
            <img
              src={`${import.meta.env.BASE_URL}integrations/${tool.file}`}
              alt={`${tool.name} logo`}
              className="h-7 w-7 object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
              loading="lazy"
            />
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{tool.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
