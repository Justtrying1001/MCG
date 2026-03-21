const steps = [
  {
    num: "01",
    icon: "✦",
    title: "OPEN PACKS",
    description: "Reveal meme token cards, chase rarities, and start your binder with instantly recognizable internet legends.",
    accent: "pink",
  },
  {
    num: "02",
    icon: "◉",
    title: "BUILD YOUR COLLECTION",
    description: "Stack owned cards, track progress, and discover which pulls can power your next roster or reward goal.",
    accent: "cyan",
  },
  {
    num: "03",
    icon: "⚔",
    title: "ENTER CONTESTS",
    description: "Lock in a lineup and let token performance decide the outcome when competition goes live.",
    accent: "yellow",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="home-how-it-works">
      <div className="home-how-marquee" aria-hidden="true">Open • Collect • Battle • Repeat</div>
      <div className="home-how-header">
        <p className="home-how-eyebrow">How it works</p>
        <h2 className="home-how-title">Three steps to glory.</h2>
        <p className="home-how-copy">Open, collect, and compete with a guest-friendly on-ramp before you ever need to commit to a real run.</p>
      </div>
      <div className="home-how-steps">
        {steps.map((step) => (
          <article key={step.num} className={`home-how-step home-how-step--${step.accent}`.trim()}>
            <div className="home-how-step-shadow" aria-hidden="true" />
            <div className="home-how-step-top">
              <div className="home-how-step-icon" aria-hidden="true">
                {step.icon}
              </div>
              <div className="home-how-step-num">{step.num}</div>
            </div>
            <h3 className="home-how-step-title">{step.title}</h3>
            <p className="home-how-step-desc">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
