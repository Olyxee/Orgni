import { motion } from "framer-motion";
import { User, HelpCircle } from "lucide-react";
import {
  SiGmail,
  SiGooglesheets,
  SiJira,
  SiSap,
} from "react-icons/si";

const answers = [
  {
    icon: SiGmail,
    iconColor: "#EA4335",
    tool: "Gmail",
    quote: "\u201CWe agreed Net 60 with them last quarter.\u201D",
    meta: "Email thread, 4 months ago",
  },
  {
    icon: SiGooglesheets,
    iconColor: "#34A853",
    tool: "Google Sheets",
    quote: "\u201CVendor tracker says Net 30.\u201D",
    meta: "Last edited by someone who left",
  },
  {
    icon: SiJira,
    iconColor: "#0052CC",
    tool: "Jira",
    quote: "\u201CTicket says renegotiation still pending.\u201D",
    meta: "Status: unresolved",
  },
  {
    icon: SiSap,
    iconColor: "#008FD3",
    tool: "SAP",
    quote: "\u201CSystem still shows the old contract terms.\u201D",
    meta: "Never updated",
  },
];

const costs = [
  {
    stat: "4 tools",
    label: "One answer, scattered across four different systems.",
  },
  {
    stat: "0 sources",
    label: "Nobody can say where the \u201Ctruth\u201D actually came from.",
  },
  {
    stat: "Hours lost",
    label: "Every new person rebuilds the same context from scratch.",
  },
  {
    stat: "Blind AI",
    label: "Your AI tools guess, because they can\u2019t see how you really work.",
  },
];

export function ProblemSection() {
  return (
    <section className="relative py-24 md:py-32 px-6 md:px-12 bg-secondary/30 border-t border-border overflow-hidden">
      <div className="relative max-w-[1100px] mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16 md:mb-20"
        >
          <div className="flex items-center gap-4 justify-center mb-6">
            <div className="h-[2px] w-8 bg-primary"></div>
            <p className="text-xs font-mono font-bold text-primary tracking-widest uppercase">
              The problem
            </p>
            <div className="h-[2px] w-8 bg-primary"></div>
          </div>
          <h2 className="text-4xl md:text-5xl xl:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-6">
            Your organisation has data.
            <br />
            <span className="text-muted-foreground">
              It lacks shared understanding.
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium">
            Ask a simple question and watch what happens.
          </p>
        </motion.div>

        {/* The question */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-start justify-center gap-3 mb-10 md:mb-12"
        >
          <div className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
            <User className="text-muted-foreground" size={18} />
          </div>
          <div className="bg-foreground text-background rounded-2xl rounded-tl-sm px-5 py-3.5 text-base md:text-lg font-semibold shadow-sm max-w-md">
            What are our payment terms with Acme Corp?
          </div>
        </motion.div>

        {/* Four conflicting answers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 md:mb-12">
          {answers.map((a, i) => (
            <motion.div
              key={a.tool}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.2 + i * 0.12 }}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-secondary border border-border/60 flex items-center justify-center shrink-0">
                  <a.icon size={16} style={{ color: a.iconColor }} />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">
                  {a.tool}
                </span>
              </div>
              <p className="text-[15px] leading-snug font-medium text-foreground mb-3">
                {a.quote}
              </p>
              <p className="text-xs text-muted-foreground/70 font-medium">
                {a.meta}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Punchline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex items-center justify-center mb-16 md:mb-20"
        >
          <div className="flex items-center gap-3 bg-card border border-border rounded-full px-6 py-3 shadow-sm">
            <HelpCircle className="text-primary shrink-0" size={18} />
            <span className="text-sm md:text-base font-semibold text-foreground">
              One question. Four different answers. Nobody knows which is true.
            </span>
          </div>
        </motion.div>

        {/* What it costs you */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-2xl overflow-hidden">
          {costs.map((c, i) => (
            <motion.div
              key={c.stat}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              className="bg-card p-6 md:p-8"
            >
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">
                {c.stat}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                {c.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
