import { Link } from "wouter";


export function SiteFooter({ dark = false }: { dark?: boolean }) {
  const footerClass = "border-t border-border py-16 md:py-24 bg-background";
  const muted = "text-muted-foreground";
  const linkHover = "hover:text-primary transition-colors";
  const innerBorder = "border-border";

  return (
    <footer className={footerClass}>
      <div className="container max-w-screen-xl px-6 md:px-12 mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10 md:gap-16 mb-16">
          <div className="sm:col-span-2 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <img
                src={`${import.meta.env.BASE_URL}orgni-logo.png`}
                alt="Orgni logo"
                className="h-6 w-6 object-cover"
              />
              <span className="font-mono uppercase tracking-widest font-semibold text-lg text-foreground">Orgni</span>
            </div>
            <p className={`text-base ${muted} max-w-md leading-relaxed border-l-2 border-primary/30 pl-4`}>
              Orgni is organisational intelligence infrastructure developed by Olyxee.
            </p>
          </div>
          
          <div>
            <h4 className="text-xs font-mono tracking-widest uppercase text-foreground mb-6">Product</h4>
            <ul className={`space-y-4 text-sm ${muted}`}>
              <li>
                <Link href="/platform" className={linkHover}>
                  Platform
                </Link>
              </li>
              <li>
                <Link href="/use-cases" className={linkHover}>
                  Use Cases
                </Link>
              </li>
              <li>
                <Link href="/infrastructure" className={linkHover}>
                  Infrastructure
                </Link>
              </li>
              <li>
                <Link href="/developers" className={linkHover}>
                  Developers
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-xs font-mono tracking-widest uppercase text-foreground mb-6">Resources</h4>
            <ul className={`space-y-4 text-sm ${muted}`}>
              <li>
                <Link href="/thesis" className={linkHover}>
                  Research
                </Link>
              </li>
              <li>
                <Link href="/api-reference" className={linkHover}>
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="/docs" className={linkHover}>
                  Documentation
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-xs font-mono tracking-widest uppercase text-foreground mb-6">Company</h4>
            <ul className={`space-y-4 text-sm ${muted}`}>
              <li>
                <a href="https://www.olyxee.com" target="_blank" rel="noopener noreferrer" className={linkHover}>
                  Olyxee
                </a>
              </li>
              <li>
                <a href="https://www.olyxee.com/careers" target="_blank" rel="noopener noreferrer" className={linkHover}>
                  Careers
                </a>
              </li>
              <li>
                <a href="https://www.olyxee.com/contact" target="_blank" rel="noopener noreferrer" className={linkHover}>
                  Contact
                </a>
              </li>
              <li>
                <a href="https://www.olyxee.com/privacy" target="_blank" rel="noopener noreferrer" className={linkHover}>
                  Privacy
                </a>
              </li>
              <li>
                <a href="https://www.olyxee.com/terms" target="_blank" rel="noopener noreferrer" className={linkHover}>
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className={`pt-8 border-t ${innerBorder} flex flex-col md:flex-row justify-between items-center gap-4`}>
          <div className={`text-xs font-mono uppercase tracking-widest ${muted}`}>
            © {new Date().getFullYear()} Olyxee. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
