import { motion } from "framer-motion";
import { AlertCircle, Network, X } from "lucide-react";
import {
  SiGmail,
  SiGooglesheets,
  SiJira,
  SiSap,
  SiZoom,
  SiGoogledrive,
} from "react-icons/si";

export function ProblemSection() {
  const problems = [
    {
      num: "01",
      title: "Fragmented knowledge",
      text: "Context scattered across disconnected systems.",
    },
    {
      num: "02",
      title: "Repeated discovery",
      text: "Rebuilding context entirely from scratch.",
    },
    {
      num: "03",
      title: "Unclear reality",
      text: "Conflicting information masks the truth.",
    },
    {
      num: "04",
      title: "Blind AI execution",
      text: "Acting without trusted operational context.",
    },
  ];

  const silos = [
    {
      id: "email",
      icon: SiGmail,
      iconColor: "#EA4335",
      title: "Gmail",
      content: "Net 60",
      x: 22,
      y: 18,
      delay: 0,
      conflict: false,
    },
    {
      id: "spreadsheet",
      icon: SiGooglesheets,
      iconColor: "#34A853",
      title: "Google Sheets",
      content: "Net 30",
      x: 78,
      y: 22,
      delay: 1,
      conflict: true,
    },
    {
      id: "chat",
      icon: SiJira,
      iconColor: "#0052CC",
      title: "Jira",
      content: "Approved?",
      x: 18,
      y: 50,
      delay: 2,
      conflict: false,
    },
    {
      id: "pdf",
      icon: SiGoogledrive,
      iconColor: "#4285F4",
      title: "Google Drive",
      content: "Liability: 2x",
      x: 82,
      y: 55,
      delay: 0.5,
      conflict: true,
    },
    {
      id: "users",
      icon: SiZoom,
      iconColor: "#2D8CFF",
      title: "Zoom",
      content: "Handshake",
      x: 32,
      y: 82,
      delay: 1.5,
      conflict: false,
    },
    {
      id: "db",
      icon: SiSap,
      iconColor: "#008FD3",
      title: "SAP",
      content: "Pending",
      x: 72,
      y: 80,
      delay: 2.5,
      conflict: false,
    },
  ];

  return (
    <section className="relative py-24 md:py-32 px-6 md:px-12 bg-secondary/30 border-t border-border overflow-hidden">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 items-center">
          {/* Left Column: Text & Condensed Problems */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-4xl md:text-5xl xl:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-6">
                Your organisation has data.
                <br />
                <span className="text-muted-foreground">
                  It lacks shared understanding.
                </span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium mb-12">
                Without a live operational model, your teams and systems are
                guessing at reality.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
              {problems.map((problem, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <div className="text-primary font-mono text-sm font-bold mb-3">
                    {problem.num}
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2">
                    {problem.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    {problem.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Column: Visual Constellation */}
          <div className="lg:col-span-7 relative w-full aspect-[4/5] sm:aspect-square md:aspect-[4/3] lg:aspect-square xl:aspect-[4/3]">
            <div className="absolute inset-0 bg-background border border-dashed border-border/80 rounded-2xl md:rounded-[2rem] overflow-hidden shadow-sm">
              {/* Dot Grid Background */}
              <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--muted-foreground)/0.3)_1px,transparent_1px)] [background-size:24px_24px] opacity-20 z-0" />

              {/* Central gradient fade to hide grid in center */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--background))_10%,transparent_60%)] opacity-90 z-0" />

              {/* SVG Lines */}
              <svg
                className="absolute inset-0 w-full h-full z-0"
                pointerEvents="none"
              >
                {silos.map((silo) => (
                  <line
                    key={`line-${silo.id}`}
                    x1="50%"
                    y1="50%"
                    x2={`${silo.x}%`}
                    y2={`${silo.y}%`}
                    className="stroke-border/80"
                    strokeWidth="2"
                    strokeDasharray="4 6"
                  />
                ))}
              </svg>

              {/* Severed Line Markers */}
              {silos.map((silo) => {
                const midX = 50 + (silo.x - 50) * 0.45;
                const midY = 50 + (silo.y - 50) * 0.45;
                return (
                  <div
                    key={`break-${silo.id}`}
                    className="absolute bg-background border border-dashed border-border text-muted-foreground w-6 h-6 rounded-full flex items-center justify-center -translate-x-1/2 -translate-y-1/2 z-10 shadow-sm"
                    style={{ left: `${midX}%`, top: `${midY}%` }}
                  >
                    <X size={12} strokeWidth={2.5} />
                  </div>
                );
              })}

              {/* Central Node */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center w-28 h-28 md:w-32 md:h-32 bg-secondary/90 backdrop-blur-md rounded-full border border-border shadow-lg">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-background border flex items-center justify-center mb-2 shadow-sm">
                  <Network className="text-primary" size={20} />
                </div>
                <span className="text-[10px] md:text-[11px] uppercase tracking-wider font-bold text-foreground text-center leading-tight">
                  Fragmented
                  <br />
                  Reality
                </span>
              </div>

              {/* Silo Tiles */}
              {silos.map((silo, i) => (
                <div
                  key={silo.id}
                  className="absolute z-10 w-[135px] md:w-[170px] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${silo.x}%`, top: `${silo.y}%` }}
                >
                  <motion.div
                    animate={{ y: [0, i % 2 === 0 ? -6 : 6, 0] }}
                    transition={{
                      duration: 4 + (i % 3),
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: silo.delay * 0.1 }}
                      className={`w-full bg-card border rounded-md p-2.5 md:p-3 relative transition-all duration-300 ${
                        silo.conflict
                          ? "border-primary/50 shadow-[0_0_15px_rgba(254,81,1,0.1)]"
                          : "border-border shadow-sm"
                      }`}
                    >
                      {silo.conflict && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-sm">
                          <AlertCircle size={12} strokeWidth={3} />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                        <silo.icon
                          size={14}
                          className="shrink-0"
                          style={{ color: silo.iconColor }}
                        />
                        <span className="text-[10px] md:text-xs font-semibold truncate text-muted-foreground">
                          {silo.title}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] md:text-xs font-medium leading-tight ${
                          silo.conflict ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {silo.content}
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
