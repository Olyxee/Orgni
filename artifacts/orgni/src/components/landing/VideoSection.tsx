import { motion } from "framer-motion";

export function VideoSection() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-foreground text-background border-t border-border">
      <div className="max-w-[1600px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start mb-16"
        >
          <div className="lg:col-span-5">
            <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight">
              The vision for organisational intelligence.
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="text-xl md:text-2xl font-medium text-background/80 leading-relaxed">
              See how connecting fragmented data into a cohesive operational graph transforms how businesses execute.
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative w-full aspect-video bg-background/5 border border-background/20 rounded-xl flex items-center justify-center overflow-hidden shadow-2xl"
        >
          <video 
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            controls
            poster="/orgni-product-ui.png"
          >
            <source src="/promo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </motion.div>
      </div>
    </section>
  );
}