import { motion, useScroll, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Search, Database, FileText, Users, ShieldAlert, GitMerge, Terminal, ArrowRight } from "lucide-react";

const bgImages = [
  `${import.meta.env.BASE_URL}stages/stage1-fragmented.jpg`,
  `${import.meta.env.BASE_URL}stages/stage2-interpreted.jpg`,
  `${import.meta.env.BASE_URL}stages/stage3-connected.jpg`,
  `${import.meta.env.BASE_URL}stages/stage4-living.jpg`,
  `${import.meta.env.BASE_URL}stages/stage5-usable.jpg`,
];

const stages = [
  {
    id: 1,
    title: "Stage 1 — Fragmented",
    desc: "Documents, roles, systems and processes appear as disconnected objects scattered across the organisation.",
  },
  {
    id: 2,
    title: "Stage 2 — Interpreted",
    desc: "Orgni identifies each object—classifying entities, events, rules and operational signals.",
  },
  {
    id: 3,
    title: "Stage 3 — Connected",
    desc: "Relationships form between the objects, creating a structural map of how work is actually governed and performed.",
  },
  {
    id: 4,
    title: "Stage 4 — Living context",
    desc: "The map updates continuously as new documents, decisions and exceptions occur in real time.",
  },
  {
    id: 5,
    title: "Stage 5 — Usable intelligence",
    desc: "Teams, applications and AI agents query the unified context to get actionable operational answers.",
  },
];

const nodes = [
  { id: "A", label: "Invoice 492", type: "document", icon: FileText },
  { id: "B", label: "Finance Team", type: "people", icon: Users },
  { id: "C", label: "Approval Policy", type: "rule", icon: ShieldAlert },
  { id: "D", label: "ERP System", type: "system", icon: Database },
  { id: "E", label: "Payment Process", type: "process", icon: GitMerge },
];

const dynamicNodes = [
  { id: "F", label: "Exception Alert", type: "event", icon: ShieldAlert },
  { id: "G", label: "Decision #88", type: "decision", icon: FileText }
];

const allNodes = [...nodes, ...dynamicNodes];

const connections = [
  { source: "A", target: "E", label: "triggers" },
  { source: "B", target: "E", label: "performs" },
  { source: "C", target: "E", label: "governs" },
  { source: "E", target: "D", label: "updates" },
];

const dynamicConnections = [
  { source: "F", target: "E", label: "interrupts" },
  { source: "B", target: "G", label: "makes" },
  { source: "G", target: "F", label: "resolves" },
];

const allConnections = [...connections, ...dynamicConnections];

const getPositions = (stage: number) => {
  // Fragmented: very scattered
  if (stage === 0) {
    return {
      A: { x: -220, y: -180 },
      B: { x: 260, y: -220 },
      C: { x: -280, y: 180 },
      D: { x: 240, y: 220 },
      E: { x: -60, y: -40 },
      F: { x: -350, y: 0 },
      G: { x: 350, y: 0 },
    };
  }
  // Interpreted: coming closer but still separate
  if (stage === 1) {
    return {
      A: { x: -160, y: -140 },
      B: { x: 160, y: -140 },
      C: { x: -160, y: 140 },
      D: { x: 160, y: 140 },
      E: { x: 0, y: 0 },
      F: { x: -300, y: 0 },
      G: { x: 300, y: 0 },
    };
  }
  // Connected and onwards: Structured map
  return {
    A: { x: -160, y: -100 }, // Invoice
    B: { x: 160, y: -100 },  // Finance Team
    C: { x: 0, y: -160 },    // Policy
    D: { x: 0, y: 140 },     // ERP
    E: { x: 0, y: -20 },     // Payment process
    F: { x: -180, y: 40 },   // Exception
    G: { x: 180, y: 40 },    // Decision
  };
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
    // Expand the scroll range map to fit 5 stages cleanly
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
  
  // Highlight rules for Stage 4 (Usable Intelligence)
  const queryActive = activeStage === 4;
  const highlightedNodeIds = new Set(["A", "E", "B", "C"]);
  const highlightedConnIds = new Set(["A-E", "B-E", "C-E"]);

  return (
    <section 
      id="transformation" 
      ref={containerRef} 
      className={`relative bg-background border-t border-white/10 ${shouldReduceMotion ? 'py-24' : 'h-[400vh]'}`}
    >
      <div className={`${shouldReduceMotion ? 'relative h-auto' : 'sticky top-0 h-screen'} w-full flex items-center`}>
        
        {/* Background Images */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {bgImages.map((src, i) => (
            <motion.img 
              key={src}
              src={src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen"
              initial={false}
              animate={{ opacity: activeStage === i && !shouldReduceMotion ? 0.3 : (shouldReduceMotion && i === 4 ? 0.3 : 0) }}
              transition={{ duration: 1 }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 md:via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
        </div>

        <div className="container max-w-screen-xl px-4 md:px-8 mx-auto flex flex-col md:flex-row h-full relative z-10">
          
          {/* Text Content (Left) */}
          <div className="w-full md:w-5/12 flex flex-col justify-center h-full pt-16 md:pt-0 pb-8 md:pb-0">
            <div className="relative border-l border-white/10 ml-4 md:ml-8 pl-8 md:pl-12 py-4 space-y-8 md:space-y-12">
              {stages.map((stage, index) => {
                const isActive = shouldReduceMotion ? index === 4 : activeStage === index;
                const isPast = activeStage > index;
                
                return (
                  <div key={stage.id} className={`relative transition-all duration-500 ${isActive ? 'opacity-100' : isPast ? 'opacity-40' : 'opacity-20'}`}>
                    {/* Node Dot */}
                    <div className={`absolute -left-[41px] md:-left-[57px] top-1.5 w-4 h-4 rounded-full border-2 bg-background transition-colors duration-500 ${isActive ? 'border-primary shadow-[0_0_12px_rgba(255,123,84,0.6)]' : 'border-white/20'}`}>
                      {isActive && <div className="absolute inset-[2px] rounded-full bg-primary" />}
                    </div>
                    
                    <h3 className={`text-2xl md:text-3xl font-bold tracking-tight mb-2 transition-colors duration-500 ${isActive ? 'text-white' : 'text-white'}`}>
                      <span className={`font-mono text-sm md:text-base mr-3 ${isActive ? 'text-primary' : 'text-white/50'}`}>0{index + 1}</span>
                      {stage.title.split('—')[1]?.trim() || stage.title}
                    </h3>
                    
                    <motion.div
                      initial={false}
                      animate={{ height: isActive ? 'auto' : 0, opacity: isActive ? 1 : 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-foreground/70 text-base md:text-lg leading-relaxed pt-2 pb-2">
                        {stage.desc}
                      </p>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visualization (Right) */}
          <div className="w-full md:w-7/12 h-[50vh] md:h-full relative flex items-center justify-center pointer-events-none">
            <div className="relative w-full h-full scale-[0.6] sm:scale-[0.8] md:scale-100 flex items-center justify-center">
            
            {/* Connection Lines */}
            <svg viewBox="-400 -300 800 600" className="absolute inset-0 w-full h-full z-0 overflow-visible pointer-events-none">
              <defs>
                <marker id="arrowhead-dim" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-border)" opacity="0.4"/>
                </marker>
                <marker id="arrowhead-highlight" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-primary)"/>
                </marker>
              </defs>
              
              {allConnections.map((conn, i) => {
                const isDynamic = dynamicConnections.includes(conn);
                
                // When does this connection appear?
                let isVisible = false;
                if (!isDynamic && activeStage >= 2) isVisible = true;
                if (isDynamic && activeStage >= 3) isVisible = true;

                const p1 = positions[conn.source as keyof typeof positions];
                const p2 = positions[conn.target as keyof typeof positions];
                
                const connId = `${conn.source}-${conn.target}`;
                const isHighlight = queryActive && highlightedConnIds.has(connId);
                const isDimmed = queryActive && !isHighlight;
                
                if (!p1 || !p2) return null;

                return (
                  <motion.g 
                    key={i} 
                    initial={false}
                    animate={{ opacity: isVisible ? (isDimmed ? 0.2 : 1) : 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
                  >
                    <motion.line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={isHighlight ? "var(--color-primary)" : "var(--color-border)"}
                      strokeWidth={isHighlight ? 2.5 : 1.5}
                      markerEnd={isHighlight ? "url(#arrowhead-highlight)" : "url(#arrowhead-dim)"}
                      opacity={isHighlight ? 1 : 0.6}
                      initial={false}
                      animate={{ 
                        pathLength: isVisible ? 1 : 0,
                      }}
                      transition={{ duration: shouldReduceMotion ? 0 : 1.5, ease: "easeInOut" }}
                    />
                    
                    {isVisible && (
                      <motion.text
                        initial={false}
                        animate={{ opacity: isDimmed ? 0 : 1 }}
                        x={(p1.x + p2.x)/2}
                        y={(p1.y + p2.y)/2 - 10}
                        textAnchor="middle"
                        fill={isHighlight ? "var(--color-primary)" : "var(--color-foreground)"}
                        className={`text-[10px] font-mono ${isHighlight ? 'font-bold' : 'opacity-60'}`}
                      >
                        {conn.label}
                      </motion.text>
                    )}
                  </motion.g>
                );
              })}
            </svg>

            {/* Nodes */}
            {allNodes.map((node) => {
              const pos = positions[node.id as keyof typeof positions];
              const isDynamic = dynamicNodes.includes(node);
              
              // Node visibility logic
              let isVisible = true;
              if (isDynamic && activeStage < 3) isVisible = false;

              // Node styling logic
              const isInterpreted = activeStage >= 1;
              const isLiving = activeStage >= 3;
              
              const isHighlight = queryActive && highlightedNodeIds.has(node.id);
              const isDimmed = queryActive && !isHighlight;

              if (!pos) return null;

              return (
                <motion.div
                  key={node.id}
                  initial={false}
                  animate={{
                    x: pos.x,
                    y: pos.y,
                    opacity: isVisible ? (isDimmed ? 0.3 : (activeStage === 0 ? 0.4 : 1)) : 0,
                    scale: isVisible ? (isHighlight ? 1.05 : 1) : 0.8,
                  }}
                  transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 50, damping: 15 }}
                  className="absolute top-1/2 left-1/2 z-10 flex flex-col items-center justify-center pointer-events-none"
                  style={{ marginLeft: "-75px", marginTop: "-24px", width: "150px" }}
                >
                  <motion.div
                    animate={{
                      borderColor: isHighlight 
                        ? "rgba(255, 123, 84, 0.6)" 
                        : isInterpreted 
                          ? "rgba(255,255,255,0.2)" 
                          : "rgba(255,255,255,0.05)",
                      backgroundColor: isHighlight 
                        ? "rgba(255, 123, 84, 0.15)"
                        : isInterpreted 
                          ? "rgba(20,20,20,0.95)" 
                          : "rgba(10,10,10,0.4)",
                      borderStyle: activeStage === 0 ? "dashed" : "solid",
                    }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
                    className={`p-3 w-full backdrop-blur-md border rounded-sm flex flex-col items-center transition-colors ${activeStage === 0 ? 'shadow-none' : 'shadow-xl'}`}
                  >
                    <div className="flex items-center justify-center gap-2 mb-1.5 min-h-[16px]">
                      {isInterpreted && (
                        <node.icon className={`w-3 h-3 ${isHighlight ? "text-primary" : "text-white/50"}`} />
                      )}
                      {isInterpreted && (
                        <span className={`text-[9px] uppercase tracking-wider font-bold font-mono ${isHighlight ? "text-primary" : "text-white/50"}`}>
                          {node.type}
                        </span>
                      )}
                    </div>
                    
                    <span className={`font-medium text-sm whitespace-nowrap ${isHighlight ? "text-white font-bold" : "text-white/80"}`}>
                      {node.label}
                    </span>
                  </motion.div>

                  {/* Activity pulses for new dynamic nodes in stage 3 */}
                  {isLiving && isDynamic && activeStage === 3 && !shouldReduceMotion && (
                    <motion.div 
                      className="absolute inset-0 border border-primary rounded-sm"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                  
                  {/* Highlight pulse in stage 4 */}
                  {isHighlight && !shouldReduceMotion && (
                    <motion.div 
                      className="absolute inset-0 border border-primary rounded-sm"
                      animate={{ opacity: [0.2, 0.5, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                </motion.div>
              );
            })}

            {/* Stage 5 Query Overlay Elements */}
            <motion.div
              initial={false}
              animate={{ 
                opacity: queryActive ? 1 : 0,
                y: queryActive ? 0 : 20,
                scale: queryActive ? 1 : 0.95,
                pointerEvents: queryActive ? "auto" : "none"
              }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: shouldReduceMotion ? 0 : 0.2 }}
              className="absolute top-[10%] md:top-[15%] right-0 md:-right-[10%] w-[280px] md:w-[320px] bg-black/95 border border-white/20 rounded-sm shadow-2xl z-30 overflow-hidden backdrop-blur-xl"
            >
              <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Query Context</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <div className="text-xs text-white/50 mb-1">User Question</div>
                  <div className="text-sm font-medium text-white">"Who must approve Invoice 492?"</div>
                </div>
                <div className="w-full h-px bg-white/10"></div>
                <div>
                  <div className="text-xs text-white/50 mb-1">Context Engine Answer</div>
                  <div className="text-sm text-primary font-medium flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>The <strong>Finance Team</strong> performs the Payment Process triggered by Invoice 492, governed by the <strong>Approval Policy</strong>.</span>
                  </div>
                </div>
              </div>
            </motion.div>
            
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
