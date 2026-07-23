export function VideoSection() {
  return (
    <section id="video" className="relative overflow-hidden">
      <video
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        src={`${import.meta.env.BASE_URL}hero-bg.mp4`}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      {/* Subtle darkening for text legibility — video stays clearly visible */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      <div className="relative py-32 md:py-48 px-6 md:px-12 max-w-screen-xl mx-auto">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white leading-tight mb-6">
            One shared understanding of your organisation
          </h2>
          <p className="text-lg md:text-xl text-white/85 leading-relaxed">
            Built once. Trusted everywhere — by people, applications and AI agents.
          </p>
        </div>
      </div>
    </section>
  );
}
