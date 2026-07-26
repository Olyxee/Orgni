import { motion } from "framer-motion";
import evidenceFlowImage from "@assets/image_1785086860655.png";

export function InfrastructureSection() {
  return (
    <section
      id="infrastructure"
      className="py-24 md:py-32 bg-background border-t border-border scroll-mt-20 overflow-hidden relative"
    >
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
            Orgni traces every insight back to its origin. By ingesting your raw
            operational evidence, we build a live graph where every claim is
            securely grounded in reality.
          </p>
        </motion.div>

        {/* Evidence Flow Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative z-10"
        >
          <img
            src={evidenceFlowImage}
            alt="Orgni ingests context from conversations, documents, APIs, emails, calendars and internal data, and answers questions where you work — for example in Microsoft Teams."
            className="w-full h-auto mix-blend-multiply"
            width={1746}
            height={901}
            loading="lazy"
          />
        </motion.div>
      </div>
    </section>
  );
}
