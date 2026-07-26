import { Link } from "wouter";
import { LOGIN_URL } from "@/lib/links";

export function SiteFooter({ dark = false }: { dark?: boolean }) {
  const footerClass = `border-t border-border bg-background pt-24 pb-12 px-6 md:px-12 ${dark ? "dark" : ""}`;

  return (
    <footer className={footerClass}>
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-32">
          <div className="col-span-2 lg:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-3 mb-6 group"
            >
              <img
                src={`${import.meta.env.BASE_URL}orgni-logo.png`}
                alt="Orgni logo"
                className="h-8 w-8 object-cover"
              />
              <span className="font-serif text-3xl font-bold tracking-tight text-foreground">
                Orgni
              </span>
            </Link>
            <p className="text-muted-foreground font-light max-w-sm">
              Organisational intelligence infrastructure developed by Olyxee.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-foreground mb-6">
              Product
            </h3>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/platform"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Platform
                </Link>
              </li>
              <li>
                <Link
                  href="/use-cases"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Use Cases
                </Link>
              </li>
              <li>
                <Link
                  href="/infrastructure"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Infrastructure
                </Link>
              </li>
              <li>
                <Link
                  href="/developers"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Developers
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-foreground mb-6">
              Resources
            </h3>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/thesis"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Research
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-foreground mb-6">
              Company
            </h3>
            <ul className="space-y-4">
              <li>
                <a
                  href="https://www.olyxee.com/pricing"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="https://olyxee.com"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  About Olyxee
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Contact Sales
                </a>
              </li>
              <li>
                <a
                  href={LOGIN_URL}
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Sign In
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-12 pb-24 overflow-hidden">
          <div className="flex justify-center text-[15vw] leading-none font-serif tracking-tighter text-foreground opacity-5 select-none pointer-events-none w-full text-center">
            Orgni
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-muted-foreground uppercase tracking-widest">
          <p>© {new Date().getFullYear()} Olyxee Ltd. All rights reserved.</p>
          <div className="flex gap-6">
            <a
              href="https://www.olyxee.com/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="https://www.olyxee.com/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
