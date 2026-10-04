type Section = { id: string; label: string };

export function DocMobileNav({
  sections,
  active,
  onNav,
}: {
  sections: Section[];
  active: string;
  onNav: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <nav
      aria-label="On this page"
      // --site-header-height covers the header's 72px of content plus its 1px
      // bottom border. Offsetting by 72 tucked this bar underneath the header
      // and its top was painted over.
      // No negative margins here: this sits directly under an unpadded
      // wrapper, so they pushed the bar past the viewport and gave the whole
      // page a horizontal scrollbar. The inner row carries the padding.
      className="lg:hidden sticky top-[var(--site-header-height)] z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border"
    >
      <div className="flex gap-2 overflow-x-auto px-4 md:px-8 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => onNav(e, s.id)}
            aria-current={active === s.id ? "true" : undefined}
            className={`whitespace-nowrap font-mono text-[11px] font-bold px-3 py-1.5 rounded-sm border transition-colors ${
              active === s.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
