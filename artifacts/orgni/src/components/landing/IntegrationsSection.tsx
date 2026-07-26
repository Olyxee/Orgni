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
          className="flex items-center gap-4 mb-12 justify-center"
        >
          <div className="h-[2px] w-8 bg-primary"></div>
          <p className="text-center text-xs font-mono font-bold text-primary tracking-widest uppercase">
            Roadmap: Future sources & connected systems
          </p>
          <div className="h-[2px] w-8 bg-primary"></div>
        </motion.div>
        
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
          {integrations.map((tool, i) => (
            <motion.div 
              key={tool.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className="flex flex-col items-center justify-center p-6 gap-4 bg-secondary/10 rounded-md border border-border hover:border-primary/40 hover:bg-secondary/20 transition-all duration-300"
              title={tool.name}
            >
              <img
                src={`${import.meta.env.BASE_URL}integrations/${tool.file}`}
                alt={`${tool.name} logo`}
                className="h-8 w-8 object-contain grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.querySelector('span')!.style.opacity = '1';
                }}
              />
              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase opacity-70">{tool.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}