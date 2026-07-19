import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, AlertCircle, FileText, Settings, Shield } from "lucide-react";

export function ProductInterfaceSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-24 md:py-32 bg-background border-t border-white/10 overflow-hidden">
      <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
        <div className="max-w-3xl mb-16 md:mb-24">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            The living map in practice.
          </h2>
          <p className="text-lg text-foreground/70">
            A precise, restrained interface that reveals operational truth without decorative dashboard noise.
          </p>
        </div>

        {/* Fake interface composition */}
        <motion.div 
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.8 }}
          className="w-full bg-background border border-white/10 rounded-sm shadow-xl shadow-black overflow-hidden flex flex-col md:flex-row"
        >
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-white/[0.02] border-r border-white/10 p-4 flex flex-col gap-6">
            <div>
              <div className="text-[10px] font-mono font-bold text-foreground/40 mb-3 uppercase">Organisational Confidence</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-foreground">High</span>
                <span className="text-sm text-green-500 font-mono mb-1 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Validated</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold text-foreground/40 mb-2 uppercase">Active Context</div>
              <div className="flex items-center gap-2 text-sm text-foreground/80 p-2 bg-white/5 rounded-sm"><Settings className="w-4 h-4"/> Workflows <span className="ml-auto font-mono text-xs">142</span></div>
              <div className="flex items-center gap-2 text-sm text-foreground/80 p-2 hover:bg-white/5 rounded-sm"><FileText className="w-4 h-4"/> Documents <span className="ml-auto font-mono text-xs">8,405</span></div>
              <div className="flex items-center gap-2 text-sm text-foreground/80 p-2 hover:bg-white/5 rounded-sm"><Shield className="w-4 h-4"/> Rules mapped <span className="ml-auto font-mono text-xs">315</span></div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-amber-500"><AlertCircle className="w-4 h-4"/> 3 Exceptions detected</div>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 p-6 md:p-8 flex flex-col bg-[#0a0a0a]">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
              <h3 className="font-mono text-sm font-bold">Supplier Onboarding Process</h3>
              <div className="text-xs font-mono text-foreground/50">Updated 2 mins ago</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
              {/* Left Column: Flow representation */}
              <div className="space-y-4">
                <div className="text-[10px] font-mono font-bold text-foreground/40 uppercase">Detected Flow</div>
                
                <div className="flex flex-col gap-2">
                  <div className="p-3 border border-white/10 bg-background rounded-sm flex justify-between items-center">
                    <span className="text-sm font-medium">Contract Submission</span>
                    <span className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded">Vendor Portal</span>
                  </div>
                  <div className="w-px h-4 bg-white/20 ml-6"></div>
                  <div className="p-3 border border-primary/20 bg-primary/5 rounded-sm flex justify-between items-center relative">
                    <span className="text-sm font-medium text-primary">Compliance Review</span>
                    <span className="text-[10px] font-mono bg-background border border-primary/10 px-1.5 py-0.5 rounded text-primary">Requires Action</span>
                    <div className="absolute -left-2 top-1/2 w-1 h-4 bg-primary -translate-y-1/2 rounded-r-sm"></div>
                  </div>
                  <div className="w-px h-4 bg-white/20 ml-6"></div>
                  <div className="p-3 border border-white/10 bg-white/[0.02] rounded-sm flex justify-between items-center text-foreground/50">
                    <span className="text-sm font-medium">Finance Approval</span>
                    <span className="text-[10px] font-mono border border-white/5 px-1.5 py-0.5 rounded">Pending</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Source Evidence */}
              <div className="space-y-4">
                <div className="text-[10px] font-mono font-bold text-foreground/40 uppercase">Source Evidence</div>
                
                <div className="space-y-3">
                  <div className="p-4 border border-white/10 bg-background rounded-sm">
                    <div className="flex items-center gap-2 mb-2 text-sm">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-mono text-xs">Policy_Vendor_Risk_v4.pdf</span>
                    </div>
                    <p className="text-xs text-foreground/70 border-l-2 border-primary/30 pl-3 py-1">
                      "All new suppliers exceeding £50,000 annual spend must undergo a Tier 1 compliance review before finance approval."
                    </p>
                  </div>
                  
                  <div className="p-4 border border-white/10 bg-background rounded-sm">
                    <div className="flex items-center gap-2 mb-2 text-sm">
                      <Settings className="w-4 h-4 text-blue-400" />
                      <span className="font-mono text-xs">Jira Ticket #8492</span>
                    </div>
                    <div className="text-xs text-foreground/70 flex items-center justify-between">
                      <span>Status: Blocked</span>
                      <span className="text-foreground/40">Assigned: Risk Team</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}