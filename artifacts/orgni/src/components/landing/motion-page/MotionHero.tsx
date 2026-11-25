import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { CONTACT_URL } from "@/lib/links";

const HERO_VIDEO = `${import.meta.env.BASE_URL}landing-network.mp4`;
const HERO_POSTER = `${import.meta.env.BASE_URL}landing-network-poster.jpg`;

export function MotionHero() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section className="relative isolate flex min-h-[92svh] items-start overflow-hidden bg-black pt-[72px] text-white">
      {reduced ? (
        <img
          src={HERO_POSTER}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
      ) : (
        <video
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={HERO_POSTER}
          aria-hidden="true"
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 -z-10 bg-black/60 md:bg-black/35" />

      <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-14 md:pb-28 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <h1 className="max-w-2xl break-words font-serif text-[2.1rem] leading-[1.08] sm:text-4xl md:text-6xl lg:text-7xl">
            Intelligence infrastructure for insurance and finance.
          </h1>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/docs" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-black transition-colors hover:bg-neutral-200">
              Read the docs
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href={CONTACT_URL} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/35 px-6 text-sm font-medium text-white transition-colors hover:border-white">
              Talk to Olyxee
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
