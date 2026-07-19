import { motion, useScroll, useTransform, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const stages = [
  {
    id: 1,
    title: "Stage 1 — Fragmented",
    desc: "Documents, roles, systems and processes appear as disconnected objects.",
  },
  {
    id: 2,
    title: "Stage 2 — Interpreted",
    desc: "Orgni identifies entities, events, rules and operational signals.",
  },
  {
    id: 3,
    title: "Stage 3 — Connected",
    desc: "Relationships form between the objects.",
  },
  {
    id: 4,
    title: "Stage 4 — Living context",
    desc: "The map updates as new documents, decisions and workflow events arrive.",
  },
  {
    id: 5,
    title: "Stage 5 — Usable intelligence",
    desc: "Teams, systems and AI agents query the same organisational context.",
  },
];

const nodes = [
  { id: "A", label: "Invoice 492", type: "document" },
  { id: "B", label: "Finance Team", type: "people" },
  { id: "C", label: "Approval Policy", type: "rule" },
  { id: "D", label: "ERP System", type: "system" },
  { id: "E", label: "Payment Process", type: "process" },
];

const connections = [
  { source: "A", target: "E", label: "triggers" },
  { source: "B", target: "E", label: "performs" },
  { source: "C", target: "E", label: "governs" },
  { source: "E", target: "D", label: "updates" },
];

const getPositions = (stage: number) => {
  if (stage === 0) {
    return [
      { x: -150, y: -100 },
      { x: 180, y: -120 },
      { x: -200, y: 150 },
      { x: 150, y: 120 },
      { x: 0, y: -50 },
    ];
  }
  if (stage === 1) {
    return [
      { x: -100, y: -80 },
      { x: 100, y: -80 },
      { x: -100, y: 80 },
      { x: 100, y: 80 },
      { x: 0, y: 0 },
    ];
  }
  return [
    { x: -120, y: -80 },
    { x: 120, y: -80 },
    { x: 0, y: -140 },
    { x: 0, y: 120 },
    { x: 0, y: 0 },
  ];
};

export function TransformationSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const [activeStage, setActiveStage] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (shouldReduceMotion) {
      if (activeStage !== 4) setActiveStage(4);
      return;
    }
    const stage = Math.min(4, Math.floor(latest * 5));
    if (stage !== activeStage) {
      setActiveStage(stage);
    }
  });

  // Ensure fully expanded on mount if reduced motion
  useEffect(() => {
    if (shouldReduceMotion) {
      setActiveStage(4);
    }
  }, [shouldReduceMotion]);

  const positions = getPositions(activeStage);

  return (
    <section 
      id="transformation" 
      ref={containerRef} 
      className={`relative bg-background border-t border-white/10 ${shouldReduceMotion ? 'py-24' : 'h-[400vh]'}`}
    >
      <div className={`${shouldReduceMotion ? 'relative h-[500px]' : 'sticky top-0 h-screen'} w-full flex items-center overflow-hidden`}>
        <div className="container max-w-screen-xl px-4 md:px-8 mx-auto flex flex-col md:flex-row h-full">
          
          {/* Text Content (Left) */}
          <div className="w-full md:w-1/3 flex flex-col justify-center h-full z-20 pt-16 md:pt-0">
            <div className="relative h-[200px] w-full">
              {stages.map((stage, index) => {
                const isActive = shouldReduceMotion ? index === 4 : activeStage === index;
                return (
                  <motion.div
                    key={stage.id}
                    initial={false}
                    animate={{ 
                      opacity: isActive ? 1 : 0, 
                      y: isActive ? 0 : (activeStage > index ? -20 : 20),
                      pointerEvents: isActive ? "auto" : "none"
                    }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
                    className="absolute inset-0 flex flex-col justify-center"
                  >
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-4 text-foreground">
                      {stage.title}
                    </h3>
                    <p className="text-foreground/70 text-lg leading-relaxed">
                      {stage.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Visualization (Right) */}
          <div className="w-full md:w-2/3 h-[50vh] md:h-full relative flex items-center justify-center pointer-events-none overflow-hidden">
            <div className="relative w-full h-full scale-[0.65] sm:scale-[0.85] md:scale-100 flex items-center justify-center">
            
            {/* Connection Lines */}
            <svg viewBox="-400 -300 800 600" className="absolute inset-0 w-full h-full z-0 overflow-visible pointer-events-none">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-border)" opacity="0.6"/>
                </marker>
              </defs>
              {connections.map((conn, i) => {
                const sourceIdx = nodes.findIndex(n => n.id === conn.source);
                const targetIdx = nodes.findIndex(n => n.id === conn.target);
                const p1 = positions[sourceIdx];
                const p2 = positions[targetIdx];
                
                const isVisible = activeStage >= 2;
                
                return (
                  <motion.g 
                    key={i} 
                    initial={false}
                    animate={{ opacity: isVisible ? 1 : 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.8 }}
                  >
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="var(--color-border)"
                      strokeWidth="1.5"
                      markerEnd="url(#arrowhead)"
                      opacity={0.6}
                    />
                    <text
                      x={(p1.x + p2.x)/2}
                      y={(p1.y + p2.y)/2 - 10}
                      textAnchor="middle"
                      fill="var(--color-foreground)"
                      className="text-[10px] font-mono opacity-60"
                    >
                      {conn.label}
                    </text>
                  </motion.g>
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node, index) => {
              const pos = positions[index];
              const isInterpreted = activeStage >= 1;
              const isLiving = activeStage >= 3;
              const isUsable = activeStage >= 4;

              return (
                <motion.div
                  key={node.id}
                  animate={{
                    x: pos.x,
                    y: pos.y,
                  }}
                  transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 50, damping: 15 }}
                  className="absolute top-1/2 left-1/2 z-10 flex flex-col items-center justify-center pointer-events-none"
                  style={{ marginLeft: "-60px", marginTop: "-20px", width: "120px" }}
                >
                  <motion.div
                    animate={{
                      borderColor: isInterpreted ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                      backgroundColor: isUsable ? "rgba(20,20,20,1)" : "rgba(20,20,20,0.8)",
                      scale: isUsable ? 1.05 : 1
                    }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
                    className="px-4 py-2 w-full bg-black/90 backdrop-blur-sm border rounded-sm shadow-sm flex flex-col items-center"
                  >
                    {isInterpreted && (
                      <span className="text-[9px] uppercase tracking-wider text-primary font-bold mb-1 font-mono">
                        {node.type}
                      </span>
                    )}
                    <span className="font-medium text-sm text-foreground/90 whitespace-nowrap">
                      {node.label}
                    </span>
                  </motion.div>

                  {/* Activity pulses */}
                  {isLiving && index === 4 && !shouldReduceMotion && (
                    <motion.div 
                      className="absolute inset-0 border border-primary rounded-sm"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
              );
            })}

            {/* Stage 5 Overlay Elements */}
            <motion.div
              initial={false}
              animate={{ opacity: activeStage >= 4 ? 1 : 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.8 }}
              className="absolute top-1/4 right-0 md:right-1/4 bg-primary text-primary-foreground font-mono text-[10px] px-2 py-1 rounded-sm shadow-md z-20"
            >
              QUERY: "Who approves this?"
            </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
