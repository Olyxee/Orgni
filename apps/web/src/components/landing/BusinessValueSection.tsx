export function BusinessValueSection() {
  const values = [
    {
      title: "Reduce repeated discovery",
      text: "Stop remapping the organisation for every transformation project."
    },
    {
      title: "Improve operational visibility",
      text: "Understand responsibilities, relationships, obligations and exceptions."
    },
    {
      title: "Prepare the organisation for AI",
      text: "Give applications and agents governed context instead of disconnected files and prompts."
    },
    {
      title: "Preserve organisational knowledge",
      text: "Maintain history when people, systems and processes change."
    }
  ];

  return (
    <section className="py-20 md:py-32 px-6 md:px-12 bg-secondary/20">
      <div className="max-w-screen-xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-16 md:mb-24">
          One operational model. Many business outcomes.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {values.map((value, i) => (
            <div key={i} className="p-10 md:p-12 border border-border bg-background rounded-sm flex flex-col justify-center min-h-[240px]">
              <h3 className="text-2xl font-medium text-foreground mb-4">{value.title}</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {value.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
