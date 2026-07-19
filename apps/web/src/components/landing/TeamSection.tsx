import { motion, useReducedMotion } from "framer-motion";

const team = [
  {
    name: "Lethabo Scofield",
    role: "Research Scientist",
    initials: "LS",
  },
  {
    name: "Alisha Fatima",
    role: "Founding AI Infrastructure Engineer",
    initials: "AF",
  },
  {
    name: "Mosa Maseko",
    role: "Founding Data Engineer",
    initials: "MM",
  },
];

export function TeamSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-24 md:py-32 bg-background border-t border-white/10">
      <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
        <div className="max-w-3xl mb-16 md:mb-24">
          <p className="text-primary font-mono text-xs uppercase tracking-widest mb-6">
            The Team
          </p>
          <motion.h2 
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
            className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white"
          >
            A dedicated research and engineering group building the operational intelligence layer.
          </motion.h2>
        </div>

        <ul className="border-t border-white/10" role="list">
          {team.map((member, i) => (
            <motion.li
              key={member.name}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: shouldReduceMotion ? 0 : i * 0.1 }}
              className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8 py-8 md:py-10 border-b border-white/10 group hover:bg-white/[0.02] transition-colors -mx-4 px-4 md:mx-0 md:px-6 rounded-sm"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-300">
                <span className="font-mono text-lg font-bold text-primary">{member.initials}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">{member.name}</h3>
                <p className="text-sm md:text-base font-mono text-white/50 uppercase tracking-widest">{member.role}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
