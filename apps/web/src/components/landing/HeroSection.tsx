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
          <div className="flex items-center justify-center mt-4">
            <Button
              asChild
              className={`
                group relative h-[60px] px-10 rounded-sm bg-primary text-primary-foreground 
                font-mono text-sm font-bold uppercase tracking-widest overflow-hidden
                transition-all duration-500 ease-out
                ${!shouldReduceMotion ? 'hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]' : ''}
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-black
              `}
            >
              <a href={SIGNUP_URL}>
                <span className="relative z-10 flex items-center">
                  Explore Orgni
                  <ArrowRight className={`ml-4 h-5 w-5 transition-transform duration-500 ease-out ${!shouldReduceMotion ? 'group-hover:translate-x-2' : ''}`} />
                </span>
                {!shouldReduceMotion && (
                  <div className="absolute inset-0 z-0 bg-white/0 transition-colors duration-500 ease-out group-hover:bg-white/20 pointer-events-none" />
                )}
              </a>
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
