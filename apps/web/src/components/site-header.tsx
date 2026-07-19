import { SIGNUP_URL } from "@/lib/links";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function handleHashNav(e: React.MouseEvent, hash: string) {
  const id = hash.replace(/^\/?#/, "");
  const el = document.getElementById(id);
  if (el) {
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  }
}

export function SiteHeader({ dark }: { dark?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerClass = `sticky top-0 z-50 w-full transition-all duration-500 ${
    scrolled
      ? "bg-background/80 backdrop-blur-xl border-b border-white/5 py-3 shadow-[0_4_24px_rgba(0,0,0,0.4)]"
      : "bg-transparent border-b border-transparent py-6"
  }`;

  const navLink = "text-xs font-mono uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors relative group py-1";
  
  const mobileLink = "block py-4 text-sm font-mono uppercase tracking-widest text-foreground/80 hover:text-foreground border-b border-white/5";

  return (
    <header className={headerClass}>
      <div className="flex items-center justify-between px-6 md:px-12 max-w-screen-2xl mx-auto">
        
        {/* Logo area */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center h-8 w-8 rounded-sm bg-white/5 border border-white/10 group-hover:border-white/20 group-hover:bg-white/10 transition-colors">
              <img
                src={`${import.meta.env.BASE_URL}orgni-logo.png`}
                alt="Orgni logo"
                className="h-4 w-4 object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold tracking-tight text-sm leading-none text-foreground">
                ORGNI
              </span>
              <span className="text-[9px] text-foreground/40 font-mono leading-none mt-1 tracking-widest uppercase">
                by Olyxee
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          <Link href="/thesis" className={navLink}>
            Thesis
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all group-hover:w-full"></span>
          </Link>
          <Link href="/api-reference" className={navLink}>
            API
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all group-hover:w-full"></span>
          </Link>
          <a href="https://www.olyxee.com/contact" target="_blank" rel="noopener noreferrer" className={navLink}>
            Contact
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all group-hover:w-full"></span>
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            asChild
            size="sm"
            className="hidden sm:inline-flex rounded-sm text-[11px] h-9 px-6 font-mono font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-none transition-all hover:scale-[1.02]"
          >
            <a href={SIGNUP_URL}>
              Request Access
            </a>
          </Button>

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 w-full border-t border-white/5 bg-background/95 backdrop-blur-xl shadow-2xl">
          <nav className="flex flex-col px-6 py-4">
            <Link href="/thesis" onClick={closeMobile} className={mobileLink}>
              Thesis
            </Link>
            <Link href="/api-reference" onClick={closeMobile} className={mobileLink}>
              API
            </Link>
            <a href="https://www.olyxee.com/contact" target="_blank" rel="noopener noreferrer" onClick={closeMobile} className={mobileLink}>
              Contact
            </a>
            <div className="pt-6 pb-4">
              <Button asChild className="w-full rounded-sm h-12 font-mono text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
                <a href={SIGNUP_URL}>
                  Request Access
                </a>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
