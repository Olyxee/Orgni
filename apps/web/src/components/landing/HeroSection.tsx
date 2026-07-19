import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SIGNUP_URL } from "@/lib/links";

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const earthOpacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0.6]);
  const videoScale = useTransform(scrollYProgress, [0, 0.6], [1.3, 1]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const keepPlaying = () => {
      if (document.visibilityState === "visible" && v.paused) {
        v.play().catch(() => {});
      }
    };
    keepPlaying();
    v.addEventListener("pause", keepPlaying);
    v.addEventListener("canplay", keepPlaying);
    v.addEventListener("loadeddata", keepPlaying);
    document.addEventListener("visibilitychange", keepPlaying);
    return () => {
      v.removeEventListener("pause", keepPlaying);
      v.removeEventListener("canplay", keepPlaying);
      v.removeEventListener("loadeddata", keepPlaying);
      document.removeEventListener("visibilitychange", keepPlaying);
    };
  }, []);

  const scrollToTransform = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section ref={heroRef} className="relative z-20 min-h-[90vh] bg-black text-white flex flex-col pt-16 lg:pt-24 pb-0">
      <div className="container max-w-screen-xl px-4 md:px-8 mx-auto relative z-10 flex flex-col items-center text-center">
        
        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.8 }}
          className="max-w-4xl w-full mb-8 relative z-20"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
            Your organisation already has intelligence. <br className="hidden md:block" />
            <span className="text-primary">Orgni makes it usable.</span>
          </h1>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => window.location.href = SIGNUP_URL}
              className="group w-full sm:w-auto h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-bold rounded-sm shadow-md transition-all hover:shadow-lg"
            >
              Explore Orgni
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToTransform}
              className="w-full sm:w-auto h-14 px-8 border-white/20 hover:bg-white/10 hover:border-white/40 text-white bg-white/[0.02] backdrop-blur-sm text-base font-bold rounded-sm transition-all"
            >
              See how it works
            </Button>
          </div>
        </motion.div>

        {/* Earth video */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: shouldReduceMotion ? 0 : 1.2, delay: shouldReduceMotion ? 0 : 0.4 }}
          style={{ scale: shouldReduceMotion ? 1 : videoScale, transformOrigin: "center center" }}
          className="w-full mt-8 md:mt-12 -mb-24 sm:-mb-32 md:-mb-48 lg:-mb-64 relative z-0 aspect-square sm:aspect-video md:aspect-[16/9] will-change-transform mix-blend-screen pointer-events-none"
        >
          <motion.div
            style={{ opacity: shouldReduceMotion ? 1 : earthOpacity }}
            className="absolute inset-0"
          >
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-contain pointer-events-none"
              src={`${import.meta.env.BASE_URL}hero.mp4`}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
            />
          </motion.div>
          
        </motion.div>

      </div>
    </section>
  );
}
