import { motion } from "framer-motion";
import { Sparkles, User, CheckCircle, FileText, Receipt, CreditCard, BookOpen, FileSpreadsheet, Network, ArrowDown } from "lucide-react";

const Citation = ({ num }: { num: number }) => (
  <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded bg-primary/10 text-primary text-[10px] font-bold mx-0.5 border border-primary/20 align-text-bottom mb-0.5 relative cursor-default">
    {num}
  </span>
);

const sources = [
  { type: "Contract", title: "Master Services Agreement", ref: "MSA-2023", time: "1y ago", num: 1, icon: FileText },
  { type: "Invoice", title: "Acme Corp Q3", ref: "INV-8842", time: "2d ago", num: 2, icon: Receipt },
  { type: "Proof of Payment", title: "Q2 Settlement", ref: "TXN-991", time: "3m ago", num: 3, icon: CreditCard },
  { type: "Policy", title: "Vendor Payment Terms", ref: "POL-FIN-01", time: "2y ago", num: 4, icon: BookOpen },
  { type: "Statement", title: "Q2 Account Statement", ref: "STMT-09", time: "1m ago", num: 5, icon: FileSpreadsheet },
];

export function InfrastructureSection() {
  return (
    <section id="infrastructure" className="py-24 md:py-32 bg-background border-t border-border scroll-mt-20 overflow-hidden relative">
      <style>{`
        @keyframes dash-flow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 12; }
        }
        .animate-dash-flow {
          stroke-dasharray: 6 6;
          animation: dash-flow 1s linear infinite;
        }
      `}</style>
      
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 md:mb-24 text-center mx-auto max-w-3xl"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-[1.1] tracking-tight mb-6">
            The connective tissue between systems and execution.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Orgni traces every insight back to its origin. By ingesting your raw operational evidence, we build a live graph where every claim is securely grounded in reality.
          </p>
        </motion.div>

        {/* The 3-part Evidence Flow Diagram */}
        <div className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_120px_1fr] gap-6 lg:gap-0 items-center">
            
            {/* Left Column: Ask Orgni Panel */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card border border-border rounded-xl shadow-lg p-6 relative z-10 flex flex-col lg:h-[400px]"
            >
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/60">
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="font-semibold text-foreground">Ask Orgni</div>
              </div>
              
              <div className="space-y-6 flex-1 overflow-y-auto pr-2 pb-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5 border border-border/50">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="bg-secondary/50 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-foreground/90 font-medium border border-border/50">
                    What are our active payment obligations to Acme Corp?
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                    <div className="w-3.5 h-3.5 text-primary flex items-center justify-center">
                       <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-sm text-foreground/90 leading-relaxed space-y-3">
                    <p>
                      Based on the <Citation num={1} /> <span className="font-medium text-foreground">Master Services Agreement</span>, we are obligated to pay Acme Corp $45,000 per quarter.
                    </p>
                    <p>
                      The most recent <Citation num={2} /> <span className="font-medium text-foreground">Q3 Invoice</span> was processed yesterday. Historical <Citation num={3} /> <span className="font-medium text-foreground">Proofs of Payment</span> and the latest <Citation num={5} /> <span className="font-medium text-foreground">Account Statement</span> confirm previous invoices were settled in accordance with our <Citation num={4} /> <span className="font-medium text-foreground">Vendor Policy</span>.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2 shrink-0">
                <span className="flex items-center gap-1.5 font-medium"><CheckCircle className="w-3.5 h-3.5 text-primary" /> Answered from 5 sources</span>
                <span className="opacity-70">Every claim cited</span>
              </div>
            </motion.div>

            {/* Center: Hub (Desktop) & Arrow (Mobile) */}
            <div className="flex lg:hidden justify-center items-center py-2 relative z-0">
              <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary border border-primary/20">
                <ArrowDown className="w-5 h-5" />
              </div>
            </div>

            <div className="hidden lg:flex relative flex-col items-center justify-center w-full h-[400px] z-0">
              {/* Connecting SVG lines */}
              <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none" viewBox="0 0 600 400">
                <motion.path 
                  initial={{ opacity: 0, pathLength: 0 }}
                  whileInView={{ opacity: 0.3, pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.5 }}
                  d="M 150 200 L 300 200" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="1.5" 
                  fill="none" 
                  className="animate-dash-flow" 
                />
                
                {[36, 118, 200, 282, 364].map((y, i) => (
                  <motion.path 
                    key={i}
                    initial={{ opacity: 0, pathLength: 0 }}
                    whileInView={{ opacity: 0.3, pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                    d={`M 300 200 C 350 200, 390 ${y}, 450 ${y}`} 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="1.5" 
                    fill="none" 
                    className="animate-dash-flow" 
                  />
                ))}
              </svg>
              
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="w-20 h-20 bg-card border border-border rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(254,81,1,0.1)] relative z-10"
              >
                 <div className="absolute inset-0 bg-primary/10 rounded-2xl animate-pulse"></div>
                 <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-inner relative z-10 overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"></div>
                   <Network className="w-6 h-6" />
                 </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-6 font-mono text-[10px] font-bold text-foreground uppercase tracking-[0.2em] text-center bg-secondary/50 px-3 py-1.5 rounded-full relative z-10 border border-border/50"
              >
                Orgni Hub
              </motion.div>
            </div>

            {/* Right Column: Evidence Sources */}
            <div className="flex flex-col justify-between lg:h-[400px] relative z-10 gap-3 lg:gap-0">
              {sources.map((source, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.4 + (i * 0.1) }}
                  className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 relative group lg:h-[72px]"
                >
                  <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center shrink-0 border border-border/50 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                     <span className="text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors">{source.num}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                     <source.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{source.type}</span>
                      <span className="text-[10px] text-muted-foreground/70">{source.time}</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground truncate">{source.title}</div>
                    <div className="text-[11px] font-mono text-muted-foreground/70 truncate mt-0.5">REF: {source.ref}</div>
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}