export function WhatItDoesSection() {
  return (
    <section id="platform" className="py-20 md:py-32 px-6 md:px-12 max-w-screen-xl mx-auto">
      <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-8">
            Orgni turns fragmented information into organisational understanding
          </h2>
          
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              Orgni connects organisational evidence into a continuously updated model of entities, relationships, responsibilities, rules, decisions, workflows and events.
            </p>
            <p>
              Every conclusion remains linked to its source, confidence, history and permissions.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-full flex flex-col space-y-2 relative">
            <div className="w-full p-5 border border-border bg-secondary/10 rounded text-center">
              <span className="text-sm font-medium text-foreground">Documents and systems</span>
            </div>
            
            <div className="flex justify-center py-2">
              <div className="h-6 w-px bg-border relative">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-solid border-t-border border-t-[5px] border-x-transparent border-x-[4px] border-b-0"></div>
              </div>
            </div>

            <div className="w-full p-5 border border-border bg-secondary/30 rounded text-center">
              <span className="text-sm font-medium text-foreground">Evidence and organisational events</span>
            </div>
            
            <div className="flex justify-center py-2">
              <div className="h-6 w-px bg-border relative">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-solid border-t-border border-t-[5px] border-x-transparent border-x-[4px] border-b-0"></div>
              </div>
            </div>

            <div className="w-full p-5 border border-primary/20 bg-primary/5 rounded text-center">
              <span className="text-sm font-medium text-primary">Live organisational model</span>
            </div>
            
            <div className="flex justify-center py-2">
              <div className="h-6 w-px bg-border relative">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-solid border-t-border border-t-[5px] border-x-transparent border-x-[4px] border-b-0"></div>
              </div>
            </div>

            <div className="w-full p-5 border border-border bg-secondary/10 rounded text-center">
              <span className="text-sm font-medium text-foreground">Context for teams, applications and AI agents</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
