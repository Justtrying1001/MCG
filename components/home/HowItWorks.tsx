const steps = [
  {
    num: "01",
    icon: "✦",
    title: "Open packs",
    description: "Rip a fresh drop.",
    accent: "pink",
    tilt: "home-how-step--tilt-left",
  },
  {
    num: "02",
    icon: "◉",
    title: "Build your roster",
    description: "Pick your best pulls.",
    accent: "cyan",
    tilt: "home-how-step--tilt-right",
  },
  {
    num: "03",
    icon: "⚔",
    title: "Compete & win",
    description: "Lock in. Chase rewards.",
    accent: "yellow",
    tilt: "home-how-step--tilt-left-soft",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="home-how-it-works">
      <div className="home-how-header">
        <p className="home-how-eyebrow">How it works</p>
        <h2 className="home-how-title">Open. Build. Battle.</h2>
        <p className="home-how-copy">Three quick moves. That&apos;s the loop.</p>
      </div>
      <div className="home-how-steps">
        {steps.map((step) => (
          <article
            key={step.num}
            className={`home-how-step home-how-step--${step.accent} ${step.tilt}`.trim()}
          >
            <div className="home-how-step-shadow" aria-hidden="true" />
            <div className="home-how-step-top">
              <div className="home-how-step-icon" aria-hidden="true">
                {step.icon}
              </div>
              <div className="home-how-step-kicker">
                <div className="home-how-step-num">Step {step.num}</div>
                <h3 className="home-how-step-title">{step.title}</h3>
              </div>
            </div>
            <p className="home-how-step-desc">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
