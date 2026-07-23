import { SIGNUP_URL } from "@/lib/links";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommandPalette } from "@/components/command-palette";

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
  const commandPalette = useCommandPalette();

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

  const headerClass = `sticky top-0 z-50 w-full transition-all duration-300 ${
    scrolled
      ? "bg-background/90 backdrop-blur-md border-b border-border py-4 shadow-sm"
      : "bg-transparent border-b border-transparent py-6"
  }`;

  const navLink = "text-sm font-medium text-foreground/70 hover:text-foreground transition-colors relative group py-1";
  const mobileLink = "block py-4 text-base font-medium text-foreground/80 hover:text-foreground border-b border-border";

  return (
    <header className={headerClass}>
      <div className="flex items-center justify-between px-6 md:px-12 max-w-screen-2xl mx-auto">
        
        {/* Left side: Logo & Nav */}
        <div className="flex items-center gap-12">
          {/* Logo area */}
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src={`${import.meta.env.BASE_URL}orgni-logo.png`}
              alt="Orgni logo"
              className="h-8 w-8 object-cover"
            />
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-lg leading-none text-foreground">
                Orgni
              </span>
              <span className="text-[10px] text-foreground/50 font-medium leading-none mt-1 uppercase tracking-wider">
                by Olyxee
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="/#platform" onClick={(e) => handleHashNav(e, "#platform")} className={navLink}>
              Platform
            </Link>
            <Link href="/#use-cases" onClick={(e) => handleHashNav(e, "#use-cases")} className={navLink}>
              Use Cases
            </Link>
            <Link href="/#infrastructure" onClick={(e) => handleHashNav(e, "#infrastructure")} className={navLink}>
              Infrastructure
            </Link>
            <Link href="/thesis" className={navLink}>
              Research
            </Link>
            <a href="https://www.olyxee.com" target="_blank" rel="noopener noreferrer" className={navLink}>
              Company
            </a>
          </nav>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-4">
          
          <button
            onClick={() => commandPalette.open()}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors group border border-transparent hover:border-border rounded-md"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-sans font-medium bg-muted text-muted-foreground rounded-[2px] ml-1">
              <span className="mr-0.5 text-[11px] leading-none">⌘</span>K
            </kbd>
          </button>

          <button
            onClick={() => commandPalette.open()}
            className="md:hidden inline-flex items-center justify-center h-10 w-10 text-foreground/70 hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          <Button
            asChild
            size="sm"
            className="hidden lg:inline-flex h-9 px-5 font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-none transition-colors"
          >
            <a href={SIGNUP_URL}>
              Request a Demo
            </a>
          </Button>

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-sm text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full border-t border-border bg-background shadow-xl">
          <nav className="flex flex-col px-6 py-4">
            <Link href="/#platform" onClick={(e) => { handleHashNav(e, "#platform"); closeMobile(); }} className={mobileLink}>
              Platform
            </Link>
            <Link href="/#use-cases" onClick={(e) => { handleHashNav(e, "#use-cases"); closeMobile(); }} className={mobileLink}>
              Use Cases
            </Link>
            <Link href="/#infrastructure" onClick={(e) => { handleHashNav(e, "#infrastructure"); closeMobile(); }} className={mobileLink}>
              Infrastructure
            </Link>
            <Link href="/thesis" onClick={closeMobile} className={mobileLink}>
              Research
            </Link>
            <a href="https://www.olyxee.com" target="_blank" rel="noopener noreferrer" onClick={closeMobile} className={mobileLink}>
              Company
            </a>
            <div className="pt-6 pb-4">
              <Button asChild className="w-full h-12 font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-none">
                <a href={SIGNUP_URL}>
                  Request a Demo
                </a>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
