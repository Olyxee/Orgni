import { motion } from "framer-motion";
import evidenceFlowImage from "@assets/image_1785087982796.png";

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
            From scattered tools to one sourced answer.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Orgni reads your team&apos;s existing tools and answers questions
            right in the conversation, with every figure traced to its source.
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
            alt="Orgni ingests context from Microsoft Teams, Gmail, Google Drive, SAP, spreadsheets and databases, and answers questions with sources in a finance-ops channel."
            className="w-full h-auto mix-blend-multiply"
            width={1535}
            height={1024}
            loading="lazy"
          />
        </motion.div>
      </div>
    </section>
  );
}
