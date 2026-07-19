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

export function SiteHeader({ dark = false }: { dark?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isDark = dark && !scrolled;

  const headerClass = isDark
    ? "sticky top-0 z-50 w-full bg-black text-white transition-colors duration-300"
    : "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-300";
  const navLink = isDark
    ? "px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-sm"
    : "px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-sm";
  const mobileToggle = isDark
    ? "lg:hidden inline-flex items-center justify-center h-8 w-8 -mr-1 rounded-sm text-white hover:bg-white/10 transition-colors"
    : "lg:hidden inline-flex items-center justify-center h-8 w-8 -mr-1 rounded-sm text-foreground hover:bg-muted transition-colors";
  const mobilePanel = isDark
    ? "lg:hidden border-t border-white/10 bg-black text-white"
    : "lg:hidden border-t border-border bg-background";
  const mobileLink = isDark ? "py-3 text-white" : "py-3 text-foreground";
  const mobileLinkBorder = isDark
    ? "border-b border-white/10"
    : "border-b border-border/60";

  return (
    <header className={headerClass}>
      <div className="flex h-16 items-center px-4 md:px-6 w-full justify-between max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <img
              src={`${import.meta.env.BASE_URL}orgni-logo.png`}
              alt="Orgni logo"
              className="h-6 w-6 rounded object-cover"
            />
            <div className="flex flex-col">
              <span className="font-mono font-bold tracking-tight text-base leading-none">
                ORGNI
              </span>
              <span className="text-[10px] text-muted-foreground font-mono leading-none mt-0.5">
                by Olyxee
              </span>
            </div>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-2 text-sm font-medium">
          <Link href="/#product" onClick={(e) => handleHashNav(e, "#product")} className={navLink}>
            Product
          </Link>
          <Link href="/#how-it-works" onClick={(e) => handleHashNav(e, "#how-it-works")} className={navLink}>
            How it works
          </Link>
          <Link href="/#enterprise" onClick={(e) => handleHashNav(e, "#enterprise")} className={navLink}>
            For enterprise
          </Link>
          <Link href="/docs" className={navLink}>
            Developers
          </Link>
          <a href={SIGNUP_URL} className={navLink}>
            Sign in
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a href={SIGNUP_URL} className="hidden sm:inline-flex">
            <Button
              size="sm"
              className="rounded-sm text-xs h-9 px-5 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              Request access
            </Button>
          </a>

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
            className={mobileToggle}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <nav id="mobile-menu" className={mobilePanel}>
          <div className="flex flex-col px-4 py-3 text-sm font-medium">
            <Link href="/#product" onClick={(e) => { handleHashNav(e, "#product"); closeMobile(); }} className={`${mobileLink} ${mobileLinkBorder}`}>
              Product
            </Link>
            <Link href="/#how-it-works" onClick={(e) => { handleHashNav(e, "#how-it-works"); closeMobile(); }} className={`${mobileLink} ${mobileLinkBorder}`}>
              How it works
            </Link>
            <Link href="/#enterprise" onClick={(e) => { handleHashNav(e, "#enterprise"); closeMobile(); }} className={`${mobileLink} ${mobileLinkBorder}`}>
              For enterprise
            </Link>
            <Link href="/docs" onClick={closeMobile} className={`${mobileLink} ${mobileLinkBorder}`}>
              Developers
            </Link>
            <a href={SIGNUP_URL} onClick={closeMobile} className={`${mobileLink} ${mobileLinkBorder}`}>
              Sign in
            </a>
            <div className="pt-4 pb-2">
              <a href={SIGNUP_URL}>
                <Button className="w-full rounded-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                  Request access
                </Button>
              </a>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
