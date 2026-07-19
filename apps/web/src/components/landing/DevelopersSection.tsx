import { motion, useReducedMotion } from "framer-motion";

const systems = [
  "Internal applications",
  "Workflow automation",
  "AI agents",
  "Analytics",
  "Compliance tools",
  "Decision-support systems",
];

const codeSnippet = `const context = await orgni.organisation.query({
  organisationId,
  question: "Who must approve this supplier payment, and why?"
});`;

export function DevelopersSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-24 md:py-32 bg-background border-t border-white/10 text-white">
      <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="max-w-xl">
            <motion.h2 
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
              className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-foreground"
            >
              Give every system the same organisational context.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: shouldReduceMotion ? 0 : 0.1 }}
              className="text-lg text-foreground/70 leading-relaxed mb-12"
            >
              Instead of each tool building an incomplete model of the organisation, Orgni provides a persistent context layer through APIs, events and shared organisational contracts.
            </motion.p>
            
            <div className="grid grid-cols-2 gap-4">
              {systems.map((sys, i) => (
                <motion.div 
                  key={sys}
                  initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: shouldReduceMotion ? 0 : i * 0.1 }}
                  className="font-mono text-sm border-l border-white/20 pl-3 py-1 text-foreground/80"
                >
                  {sys}
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.8 }}
            className="w-full relative"
          >
            {/* Minimal Code Example */}
            <div className="bg-[#0D0D0D] border border-white/10 rounded-sm shadow-2xl overflow-hidden">
              <div className="flex items-center px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20"></div>
                </div>
                <div className="ml-4 font-mono text-[10px] text-white/40 uppercase tracking-widest">
                  API Request
                </div>
              </div>
              <div className="p-6 overflow-x-auto">
                <pre className="font-mono text-sm leading-loose text-white/80">
                  <code dangerouslySetInnerHTML={{ 
                    __html: codeSnippet
                      .replace('const', '<span class="text-[#FF7B54]">const</span>')
                      .replace('await', '<span class="text-[#FF7B54]">await</span>')
                      .replace('query', '<span class="text-blue-400">query</span>')
                      .replace(/"([^"]*)"/g, '<span class="text-green-400">"$1"</span>')
                  }} />
                </pre>
              </div>
            </div>
            
            {/* Visual connecting context layer to code */}
            <div className="absolute -left-8 -bottom-8 w-32 h-32 border border-white/10 rounded-full flex items-center justify-center -z-10 bg-white/[0.02]">
              <div className="w-16 h-16 border border-primary/30 rounded-full flex items-center justify-center bg-primary/10">
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}