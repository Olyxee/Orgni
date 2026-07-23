import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";
import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { thesisData } from "@/data/thesis";
import { List, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Figure1, Figure2, Table1, Table2, FormulaAttention, FormulaMoE, FormulaConfidence } from "@/components/thesis-assets";

function parseText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderContent(content: string[]) {
  const elements: React.ReactNode[] = [];
  let currentList: string[] | null = null;
  let inCode = false;
  let codeLines: string[] = [];

  const flushList = (key: string | number) => {
    if (currentList) {
      elements.push(
        <ul key={`list-${key}`} className="my-8 space-y-3 pl-2 md:pl-4">
          {currentList.map((item, j) => (
            <li key={j} className="flex items-start">
              <span className="text-primary mr-4 mt-2.5 h-1.5 w-1.5 rounded-full shrink-0 bg-primary/80"></span>
              <span className="text-foreground/90">{parseText(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentList = null;
    }
  };

  for (let i = 0; i < content.length; i++) {
    const line = content[i];

    if (line === '```') {
      if (inCode) {
        elements.push(
          <pre key={`code-${i}`} className="my-8 p-6 bg-white/[0.04] border border-white/10 rounded-sm font-mono text-sm md:text-base leading-relaxed text-white/80 overflow-x-auto whitespace-pre">
            {codeLines.join('\n')}
          </pre>
        );
        codeLines = [];
        inCode = false;
      } else {
        flushList(i);
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith('* ')) {
      if (!currentList) currentList = [];
      currentList.push(line.slice(2));
    } else {
      if (currentList) {
        elements.push(
          <ul key={`list-${i}`} className="my-8 space-y-3 pl-2 md:pl-4">
            {currentList.map((item, j) => (
              <li key={j} className="flex items-start">
                <span className="text-primary mr-4 mt-2.5 h-1.5 w-1.5 rounded-full shrink-0 bg-primary/80"></span>
                <span className="text-foreground/90">{parseText(item)}</span>
              </li>
            ))}
          </ul>
        );
        currentList = null;
      }

      if (!line) {
        continue;
      }

      if (line === '{{FIGURE_1}}') {
        elements.push(<Figure1 key={`fig1-${i}`} />);
      } else if (line === '{{FIGURE_2}}') {
        elements.push(<Figure2 key={`fig2-${i}`} />);
      } else if (line === '{{TABLE_1}}') {
        elements.push(<Table1 key={`tab1-${i}`} />);
      } else if (line === '{{TABLE_2}}') {
        elements.push(<Table2 key={`tab2-${i}`} />);
      } else if (line === '{{FORMULA_ATTENTION}}') {
        elements.push(<FormulaAttention key={`form-att-${i}`} />);
      } else if (line === '{{FORMULA_MOE}}') {
        elements.push(<FormulaMoE key={`form-moe-${i}`} />);
      } else if (line === '{{FORMULA_CONFIDENCE}}') {
        elements.push(<FormulaConfidence key={`form-conf-${i}`} />);
      } else if (line.startsWith('### ')) {
        const text = line.slice(4);
        const subId = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        elements.push(
          <h3 id={subId} key={`h3-${i}`} className="text-xl md:text-2xl font-bold mt-16 mb-6 text-white font-sans scroll-mt-32">
            {text}
          </h3>
        );
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={`bq-${i}`} className="border-l-2 border-primary pl-6 md:pl-8 py-2 my-10 text-xl md:text-2xl font-serif italic text-white/90 bg-gradient-to-r from-primary/5 to-transparent">
            {parseText(line.slice(2))}
          </blockquote>
        );
      } else {
        elements.push(
          <p key={`p-${i}`} className="mb-6">
            {parseText(line)}
          </p>
        );
      }
    }
  }

  if (currentList) {
    elements.push(
      <ul key={`list-end`} className="my-8 space-y-3 pl-2 md:pl-4">
        {currentList.map((item, j) => (
          <li key={j} className="flex items-start">
            <span className="text-primary mr-4 mt-2.5 h-1.5 w-1.5 rounded-full shrink-0 bg-primary/80"></span>
            <span className="text-foreground/90">{parseText(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return elements;
}

export default function Thesis() {
  useSeo({
    title: `${thesisData.title} - Olyxee`,
    description: thesisData.subtitle,
    path: "/thesis",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ScholarlyArticle",
      headline: thesisData.title,
      description: thesisData.subtitle,
      author: [
        { "@type": "Person", name: "Lethabo Scofield", jobTitle: "Research Scientist" },
        { "@type": "Person", name: "Alisha Fatima", jobTitle: "Founding AI Infrastructure Engineer" },
        { "@type": "Person", name: "Mosa Maseko", jobTitle: "Founding Data Engineer" },
      ],
      publisher: { "@type": "Organization", name: "Olyxee", url: "https://www.olyxee.com" },
      about: ["business context", "AI execution", "organizational intelligence"],
      url: "https://orgni.com/thesis",
      isPartOf: { "@type": "WebSite", name: "Orgni", url: "https://orgni.com" },
    },
  });

  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [activeSection, setActiveSection] = useState("");
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find all intersecting entries and sort them by top position to find the topmost visible section
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Sort by rect.top to get the one highest on screen
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-10% 0px -80% 0px" }
    );

    const observeEl = (id: string) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    };

    observeEl('abstract');
    thesisData.sections.forEach((s) => {
      observeEl(s.id);
      s.content.filter(line => line.startsWith('### ')).forEach(line => {
        const text = line.slice(4);
        const subId = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        observeEl(subId);
      });
    });
    observeEl('references');

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: shouldReduceMotion ? "auto" : "smooth" });
      setTocOpen(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-black text-white font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-50"
        style={{ scaleX: shouldReduceMotion ? scrollYProgress : scaleX }}
      />
      
      <SiteHeader dark />

      {/* Hero Header */}
      <header className="pt-24 pb-16 md:pt-32 md:pb-24 px-4 md:px-8 max-w-screen-xl mx-auto border-b border-white/10">
        <div className="max-w-4xl">
          <p className="text-primary font-mono text-xs uppercase tracking-widest mb-6">
            {thesisData.author}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-8 text-white leading-[1.1]">
            {thesisData.title}
          </h1>
          <p className="text-xl md:text-3xl text-white/60 leading-relaxed font-light">
            {thesisData.subtitle}
          </p>
          <div className="mt-12 pt-8 md:pt-12 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-white">Lethabo Scofield</span>
              <span className="text-xs font-mono text-white/40 tracking-widest uppercase leading-relaxed">Research Scientist</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-white">Alisha Fatima</span>
              <span className="text-xs font-mono text-white/40 tracking-widest uppercase leading-relaxed">Founding AI<br/>Infrastructure Engineer</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-white">Mosa Maseko</span>
              <span className="text-xs font-mono text-white/40 tracking-widest uppercase leading-relaxed">Founding Data Engineer</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-screen-xl px-4 md:px-8 mx-auto py-12 md:py-24 relative flex flex-col lg:flex-row gap-12 lg:gap-24">
        
        {/* Mobile TOC Toggle */}
        <button 
          onClick={() => setTocOpen(true)}
          className="lg:hidden sticky top-[88px] z-40 bg-black/90 backdrop-blur border border-white/10 px-4 py-3 rounded-sm flex items-center justify-between w-full font-mono text-sm"
        >
          <span>Table of Contents</span>
          <List className="w-4 h-4" />
        </button>

        {/* Desktop / Mobile TOC */}
        <aside className={`
          fixed inset-0 z-50 bg-black/95 backdrop-blur-xl p-6 overflow-y-auto transition-transform duration-300
          lg:static lg:block lg:w-1/4 lg:h-[calc(100vh-8rem)] lg:sticky lg:top-32 lg:bg-transparent lg:p-0 lg:z-0 lg:overflow-y-auto lg:scrollbar-none lg:translate-x-0
          ${tocOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex justify-between items-center lg:hidden mb-8">
            <span className="font-mono font-bold tracking-widest uppercase text-sm">Contents</span>
            <button onClick={() => setTocOpen(false)} className="p-2 border border-white/10 rounded-sm">
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex flex-col gap-4 font-mono text-xs pb-12 lg:pb-0">
            <button 
              onClick={() => scrollTo('abstract')}
              className={`text-left hover:text-white transition-colors py-1 ${activeSection === 'abstract' || activeSection === '' ? 'text-primary font-bold' : 'text-white/40'}`}
            >
              Abstract
            </button>
            {thesisData.sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`text-left hover:text-white transition-colors py-1 leading-relaxed ${activeSection === s.id ? 'text-primary font-bold' : 'text-white/40'}`}
              >
                {s.title}
              </button>
            ))}
            {thesisData.references.length > 0 && (
              <button 
                onClick={() => scrollTo('references')}
                className={`text-left hover:text-white transition-colors py-1 ${activeSection === 'references' ? 'text-primary font-bold' : 'text-white/40'}`}
              >
                References
              </button>
            )}
          </nav>
        </aside>

        {/* Content */}
        <main className="w-full lg:w-3/4 max-w-[70ch] pb-32">
          
          <section id="abstract" className="mb-24 scroll-mt-32">
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-primary mb-8 border-b border-white/10 pb-4">
              Abstract
            </h2>
            <div className="text-xl md:text-2xl leading-relaxed font-serif text-white/90">
              {renderContent(thesisData.abstract)}
            </div>
          </section>

          {thesisData.sections.map((s) => (
            <section key={s.id} id={s.id} className="mb-24 scroll-mt-32">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8 text-white pb-4 border-b border-white/10">
                {s.title}
              </h2>
              <div className="text-lg md:text-xl leading-relaxed text-white/80">
                {renderContent(s.content)}
              </div>
            </section>
          ))}

          {thesisData.references.length > 0 && (
            <section id="references" className="mb-24 scroll-mt-32 pt-12 border-t border-white/10">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-8 text-white">
                References
              </h2>
              <div className="text-sm md:text-base leading-relaxed text-white/60 space-y-6">
                {thesisData.references.map((r, i) => (
                  <p key={i} id={`ref-${i+1}`}>
                    {parseText(r)}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* CTA Footer */}
          <div className="mt-32 pt-16 border-t border-white/10 flex flex-col items-start bg-white/[0.02] p-8 md:p-12 rounded-sm border-l-2 border-l-primary">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              Give your AI the context it needs.
            </h2>
            <p className="text-lg text-white/60 mb-8 max-w-xl">
              Orgni continuously learns how your organisation operates, preserving your operational memory and making it available via API.
            </p>
            <Button asChild size="lg" className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-bold rounded-sm shadow-md transition-all group">
              <a href="https://www.olyxee.com/signup?tool=api">
                Request access
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </div>

        </main>
      </div>

      <SiteFooter dark />
    </div>
  );
}
