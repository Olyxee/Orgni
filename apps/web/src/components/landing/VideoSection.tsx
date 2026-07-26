export function VideoSection() {
  return (
    <section className="py-24 md:py-40 px-6 md:px-12 bg-foreground text-background border-t border-border">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start mb-16">
          <div className="lg:col-span-5">
            <h2 className="text-4xl md:text-5xl font-serif leading-[1.05]">
              The vision for organisational intelligence.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-7">
            <p className="text-xl md:text-2xl font-light text-background/80 leading-snug">
              See how connecting fragmented data into a cohesive operational graph transforms how businesses execute.
            </p>
          </div>
        </div>

        <div className="relative w-full aspect-video bg-background/5 border border-background/20 flex items-center justify-center overflow-hidden">
          <video 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
            controls
            poster="/orgni-product-ui.png"
          >
            <source src="/promo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </section>
  );
}
