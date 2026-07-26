import { motion } from "framer-motion";

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
    <section className="py-20 md:py-24 px-6 md:px-12 bg-background border-t border-border overflow-hidden">
      <div className="max-w-[1600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center gap-6 mb-12"
        >
          <div className="flex items-center gap-4 justify-center">
            <div className="h-[2px] w-8 bg-primary"></div>
            <p className="text-center text-xs font-mono font-bold text-primary tracking-widest uppercase">
              Where the answers come from
            </p>
            <div className="h-[2px] w-8 bg-primary"></div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-[1.1] tracking-tight text-center">
            Plugs into the tools you already use.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl text-center">
            No migration, no new system of record. Orgni connects to where your
            work already lives and keeps its model current as things change.
          </p>
        </motion.div>

        {/* Orgni hub node */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center"
        >
          <div className="flex items-center gap-3 px-6 py-3 rounded-full border border-primary/30 bg-primary/5 shadow-sm">
            <img
              src={`${import.meta.env.BASE_URL}orgni-logo.png`}
              alt="Orgni logo"
              className="h-6 w-6 object-cover"
            />
            <span className="font-serif text-lg font-bold tracking-tight text-foreground">
              Orgni
            </span>
          </div>
          {/* Connector from hub down to the bus line */}
          <div className="w-px h-10 bg-gradient-to-b from-primary/60 to-primary/25"></div>
        </motion.div>

        {/* Horizontal bus line the sources plug into */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent mb-0"></div>

        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-4">
          {integrations.map((tool, i) => (
            <div key={tool.name} className="flex flex-col items-center">
              {/* Tick connecting each source card to the bus */}
              <div className="w-px h-5 bg-primary/25"></div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className="w-full flex flex-col items-center justify-center p-6 gap-4 bg-secondary/10 rounded-md border border-border hover:border-primary/40 hover:bg-secondary/20 hover:shadow-sm transition-all duration-300"
                title={tool.name}
              >
                <img
                  src={`${import.meta.env.BASE_URL}integrations/${tool.file}`}
                  alt={`${tool.name} logo`}
                  className="h-8 w-8 object-contain"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.querySelector(
                      "span",
                    )!.style.opacity = "1";
                  }}
                />
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase opacity-70">
                  {tool.name}
                </span>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
