export function ProductShowcaseSection() {
  return (
    <section className="bg-[#FE5101] relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
      <div className="py-24 md:py-32 px-6 md:px-12 max-w-screen-xl mx-auto relative z-10">
        <div className="max-w-3xl mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-white"></div>
            <span className="text-xs font-mono tracking-widest uppercase text-white/90">
              Orgni in action
            </span>
          </div>
          
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-[1.1] mb-8">
            One question, a role transfer
          </h2>
          <p className="text-lg md:text-xl text-white/90 leading-relaxed pl-6 border-l-2 border-white/30">
            Answered with entitlements, systems and
            approvals resolved across the organisation, with every step traceable.
          </p>
        </div>

        <div className="p-2 md:p-4 bg-black/10 border border-white/20">
          <img
            src={`${import.meta.env.BASE_URL}orgni-product-ui.png`}
            alt="Orgni resolving a role transfer: current and new entitlements, affected systems, approvals and the organisational graph"
            className="w-full h-auto block border border-white/10"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
