import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const layers = [
  {
    id: "people",
    name: "People and responsibilities",
    desc: "Orgni maps roles, reporting lines, and operational responsibilities—understanding who actually does the work, not just what the org chart says.",
  },
  {
    id: "processes",
    name: "Processes and workflows",
    desc: "Orgni maps how work moves across people, systems, approvals and exceptions—not only how the process was originally documented.",
  },
  {
    id: "documents",
    name: "Documents and evidence",
    desc: "Every action is linked to its source evidence, giving AI and teams verifiable proof for why a decision was made.",
  },
  {
    id: "systems",
    name: "Systems and data sources",
    desc: "Connections between the tools you use and the data they hold, showing how information flows through your technical stack.",
  },
  {
    id: "policies",
    name: "Policies and business rules",
    desc: "Operational limits, compliance rules, and approval thresholds are extracted and applied as active constraints.",
  },
  {
    id: "decisions",
    name: "Decisions and approvals",
    desc: "A traceable ledger of what was decided, when, and by whom, ensuring accountability across all operational changes.",
  },
  {
    id: "exceptions",
    name: "Risks and exceptions",
    desc: "Identifies when workflows break standard patterns, providing context for manual intervention or AI escalation.",
  },
  {
    id: "dependencies",
    name: "Organisational dependencies",
    desc: "The critical paths between teams, systems, and vendors, revealing bottlenecks before they block transformation.",
  },
];

export function LayersSection() {
  const [activeLayer, setActiveLayer] = useState(layers[1].id);
  const shouldReduceMotion = useReducedMotion();

  const activeData = layers.find((l) => l.id === activeLayer);

  return (
    <section id="layers" className="py-24 md:py-32 bg-background border-t border-white/10">
      <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
        <div className="max-w-3xl mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            What Orgni understands.
          </h2>
          <p className="text-lg text-foreground/70">
            A single, queryable model built from the overlapping layers of your operations.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Layer List */}
          <div className="w-full lg:w-1/3 flex flex-col gap-2">
            {layers.map((layer) => {
              const isActive = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`text-left px-4 py-3 border-l-2 transition-all duration-300 font-mono text-sm md:text-base ${
                    isActive
                      ? "border-primary text-foreground bg-primary/5 font-bold"
                      : "border-white/10 text-foreground/50 hover:text-foreground/80 hover:bg-white/5"
                  }`}
                >
                  {layer.name}
                </button>
              );
            })}
          </div>

          {/* Interactive Visual + Description */}
          <div className="w-full lg:w-2/3 flex flex-col justify-center">
            <div className="relative h-64 md:h-80 w-full mb-10 perspective-1000">
              <div className="absolute inset-0 flex items-center justify-center transform-style-3d">
                {/* 3D Stacked Layers Visual */}
                {layers.map((layer, index) => {
                  const isActive = activeLayer === layer.id;
                  const zIndex = layers.length - index;
                  
                  // Calculate dynamic positions for a 3D isometric stack
                  const translateY = isActive ? -20 : index * 10;
                  const translateZ = isActive ? 50 : -index * 20;
                  const rotateX = 60;
                  const rotateZ = -45;

                  return (
                    <motion.div
                      key={layer.id}
                      animate={{
                        y: translateY,
                        z: translateZ,
                        opacity: isActive ? 1 : 0.3,
                        scale: isActive ? 1.05 : 1,
                      }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.6, type: "spring", bounce: 0.2 }}
                      className={`absolute w-48 md:w-64 h-48 md:h-64 border ${
                        isActive ? "border-primary shadow-lg shadow-primary/10" : "border-white/20"
                      } bg-black/80 backdrop-blur-sm rounded-sm flex items-center justify-center`}
                      style={{
                        transform: `rotateX(${rotateX}deg) rotateZ(${rotateZ}deg)`,
                        zIndex: isActive ? 50 : zIndex,
                      }}
                    >
                      <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full p-4 opacity-50">
                        {/* Abstract internal pattern */}
                        {[...Array(9)].map((_, i) => (
                          <div key={i} className={`rounded-sm ${isActive ? "bg-primary/20" : "bg-white/5"}`} />
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <motion.div
              key={activeLayer}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
              className="bg-white/[0.02] border border-white/10 p-6 md:p-8 rounded-sm"
            >
              <h3 className="font-mono text-sm font-bold text-primary uppercase mb-3">
                {activeData?.name}
              </h3>
              <p className="text-lg md:text-xl text-foreground/80 leading-relaxed">
                {activeData?.desc}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}