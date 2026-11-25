import { motion } from "framer-motion";
import { AlertTriangle, Check, FileCheck2, FileText, ShieldCheck, UserRoundCheck } from "lucide-react";

const evidence = [
  { label: "Policy schedule", detail: "POL-88421 · Active", icon: ShieldCheck },
  { label: "Loss report", detail: "Submitted 14 May", icon: FileText },
  { label: "Assessment photos", detail: "12 verified files", icon: FileCheck2 },
];

export function ExperienceSection() {
  return (
    <section className="bg-black">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:py-28 lg:grid-cols-[2fr_3fr] lg:gap-16">
        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <p className="text-xs font-semibold uppercase text-white/45">Claim intelligence</p>
          <h2 className="mt-4 font-serif text-3xl leading-tight md:text-5xl">Understand the whole claim before taking action.</h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/55">
            Orgni connects the policy, claimant, loss event, supporting evidence,
            coverage rules, and approval boundary in one traceable assessment.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55 }} className="overflow-hidden rounded-lg border border-white/15 bg-[#0a0a0a]" aria-label="Insurance claim assessment for claim CLM-2048">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-5 md:px-6">
            <div>
              <p className="text-xs text-white/45">MOTOR CLAIM</p>
              <h3 className="mt-1 text-xl font-semibold">CLM-2048</h3>
              <p className="mt-1 text-sm text-white/50">Thandi Mokoena · POL-88421</p>
            </div>
            <span className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70">Professional review</span>
          </div>

          <div className="grid md:grid-cols-[1.05fr_0.95fr]">
            <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r md:p-6">
              <p className="mb-4 text-xs font-medium uppercase text-white/40">Evidence connected</p>
              <div className="space-y-3">
                {evidence.map(({ label, detail, icon: Icon }, index) => (
                  <motion.div key={label} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.12 + index * 0.08 }} className="flex items-center gap-3 border border-white/10 bg-white/[0.03] p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-white text-black"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-white/45">{detail}</span></span>
                    <Check className="h-4 w-4 text-white/60" />
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="border border-white/10 p-3"><p className="text-xs text-white/40">Loss date</p><p className="mt-1 font-medium">12 May 2026</p></div>
                <div className="border border-white/10 p-3"><p className="text-xs text-white/40">Claimed</p><p className="mt-1 font-medium">R48,750</p></div>
              </div>
            </div>

            <div className="p-5 md:p-6">
              <p className="mb-4 text-xs font-medium uppercase text-white/40">Coverage assessment</p>
              <div className="space-y-4">
                <Assessment icon={Check} title="Policy active on loss date" detail="Effective 01 Jan–31 Dec 2026" filled />
                <Assessment icon={ShieldCheck} title="Accidental damage covered" detail="Section 4.2 · Excess R3,500" />
                <div className="flex gap-3 border border-white/20 bg-white/[0.05] p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div><p className="text-sm font-medium">Evidence conflict detected</p><p className="mt-1 text-xs leading-relaxed text-white/50">Loss time differs between the report and telematics record.</p></div>
                </div>
              </div>
              <div className="mt-5 border-t border-white/10 pt-5">
                <div className="flex items-center gap-3"><UserRoundCheck className="h-5 w-5" /><div><p className="text-sm font-medium">Decision held for assessor</p><p className="text-xs text-white/45">No payment status inferred</p></div></div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.025] px-5 py-4 text-xs text-white/45 md:px-6">
            <span>8 sources · 94% confidence</span><span>Evidence and provenance preserved</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Assessment({ icon: Icon, title, detail, filled = false }: { icon: typeof Check; title: string; detail: string; filled?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${filled ? "bg-white text-black" : "border border-white/25"}`}><Icon className="h-3.5 w-3.5" /></span>
      <div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-white/45">{detail}</p></div>
    </div>
  );
}
