export function ProductShowcaseSection() {
  return (
    <section className="bg-[#FE5101]">
      <div className="py-20 md:py-28 px-6 md:px-12 max-w-screen-xl mx-auto">
        <div className="max-w-3xl mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white leading-tight mb-6">
            Orgni in action
          </h2>
          <p className="text-lg text-white/85 leading-relaxed">
            One question — a role transfer — answered with entitlements, systems and
            approvals resolved across the organisation, with every step traceable.
          </p>
        </div>

        <img
          src={`${import.meta.env.BASE_URL}orgni-product-ui.png`}
          alt="Orgni resolving a role transfer: current and new entitlements, affected systems, approvals and the organisational graph"
          className="w-full h-auto block rounded-lg"
          loading="lazy"
        />
      </div>
    </section>
  );
}
