export function VideoSection() {
  return (
    <section id="video" className="relative overflow-hidden scroll-mt-20">
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
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      <div className="relative py-32 md:py-48 px-6 md:px-12 max-w-screen-xl mx-auto">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-primary"></div>
            <span className="text-xs font-mono tracking-widest uppercase text-white/90">
              The Vision
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-[1.1] mb-6">
            One shared understanding of your organisation
          </h2>
          <p className="text-lg md:text-xl text-white/90 leading-relaxed pl-6 border-l-2 border-primary/50">
            Built once. The reference point for every decision, workflow and automation.
          </p>
        </div>
      </div>
    </section>
  );
}
