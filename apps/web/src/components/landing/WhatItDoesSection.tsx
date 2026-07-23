export function WhatItDoesSection() {
  return (
    <section id="platform" className="py-24 md:py-32 px-6 md:px-12 max-w-screen-xl mx-auto scroll-mt-20">
      <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-primary"></div>
            <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
              The Engine
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground mb-8 leading-[1.1]">
            Orgni turns fragmented information into <span className="text-primary">organisational understanding</span>
          </h2>
          
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              Orgni connects organisational evidence into a continuously updated model of entities, relationships, responsibilities, rules, decisions, workflows and events.
            </p>
            <p className="pl-6 border-l-2 border-border">
              Every conclusion remains linked to its source, confidence, history and permissions.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-full flex flex-col space-y-0 relative border border-border bg-white p-8">
            <div className="absolute top-0 right-0 w-8 h-8 border-l border-b border-border bg-secondary/20"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-r border-t border-border bg-secondary/20"></div>
            
            <div className="w-full p-5 border border-border bg-background text-center relative z-10 hover:border-primary/30 transition-colors">
              <span className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Documents and systems</span>
            </div>
            
            <div className="flex justify-center py-4 relative z-0">
              <div className="h-8 w-px bg-border relative">
                <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border"></div>
              </div>
            </div>

            <div className="w-full p-5 border border-border bg-background text-center relative z-10 hover:border-primary/30 transition-colors">
              <span className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Evidence and organisational events</span>
            </div>
            
            <div className="flex justify-center py-4 relative z-0">
              <div className="h-8 w-px bg-border relative">
                <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border"></div>
              </div>
            </div>

            <div className="w-full p-6 border-2 border-primary bg-primary/5 text-center relative z-10 shadow-sm">
              <span className="text-base font-mono uppercase tracking-widest font-semibold text-primary">Live organisational model</span>
            </div>
            
            <div className="flex justify-center py-4 relative z-0">
              <div className="h-8 w-px bg-border relative">
                <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border"></div>
              </div>
            </div>

            <div className="w-full p-5 border border-border bg-foreground text-center relative z-10 shadow-md">
              <span className="text-sm font-mono uppercase tracking-wider text-background">Context for teams, applications and AI agents</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
