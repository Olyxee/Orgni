import { motion } from "framer-motion";
import { ArrowDown, BadgeDollarSign, BriefcaseBusiness, Database, FileArchive, Scale, ShieldCheck, UserCheck } from "lucide-react";

const systems = [
  { label: "Policy administration", icon: ShieldCheck },
  { label: "Claims platform", icon: BriefcaseBusiness },
  { label: "Billing and payments", icon: BadgeDollarSign },
  { label: "Document store", icon: FileArchive },
  { label: "Customer and broker data", icon: Database },
];

const outcomes = [
  { label: "Coverage evaluated", icon: Scale },
  { label: "Exceptions surfaced", icon: ShieldCheck },
  { label: "Human decision retained", icon: UserCheck },
];

export function IndependenceSection() {
  return (
    <section className="bg-black">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <p className="text-xs font-semibold uppercase text-white/45">Insurance infrastructure</p>
          <h2 className="mt-4 font-serif text-3xl leading-tight md:text-5xl">Connect intelligence across the insurance stack.</h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/55">
            Keep your core platforms in place. Orgni resolves insurance context
            across them and returns traceable results to the people and software
            already running the operation.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55 }} className="border border-white/15 bg-[#0a0a0a] p-4 md:p-6" aria-label="Orgni connected to insurance systems and decision workflows">
          <p className="mb-3 text-xs font-medium uppercase text-white/40">Existing insurance systems</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {systems.map(({ label, icon: Icon }, index) => (
              <motion.div key={label} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }} className={`flex min-h-14 items-center gap-3 border border-white/10 bg-white/[0.03] px-3 ${index === systems.length - 1 ? "sm:col-span-2" : ""}`}>
                <Icon className="h-4 w-4 shrink-0 text-white/55" /><span className="text-sm">{label}</span>
              </motion.div>
            ))}
          </div>

          <FlowArrow />
          <div className="bg-white px-5 py-5 text-black">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-2xl font-semibold">Orgni</p><p className="mt-1 text-xs text-black/55">Insurance intelligence infrastructure</p></div>
              <div className="flex gap-2 text-xs"><span className="border border-black/15 px-2.5 py-1.5">Entities</span><span className="border border-black/15 px-2.5 py-1.5">Rules</span><span className="border border-black/15 px-2.5 py-1.5">Evidence</span></div>
            </div>
          </div>
          <FlowArrow />

          <p className="mb-3 text-xs font-medium uppercase text-white/40">Controlled insurance outcomes</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {outcomes.map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-h-24 flex-col justify-between border border-white/10 p-3"><Icon className="h-5 w-5 text-white/55" /><span className="mt-4 text-sm leading-snug">{label}</span></div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FlowArrow() {
  return <div className="flex justify-center py-3 text-white/35"><ArrowDown className="h-5 w-5" /></div>;
}
