const steps = [
  {
    num: "01",
    icon: "◈",
    title: "COLLECT",
    description: "Open packs, pull meme token cards.",
  },
  {
    num: "02",
    icon: "⚔",
    title: "COMPETE",
    description: "Enter contests, lock your roster.",
  },
  {
    num: "03",
    icon: "◎",
    title: "WIN",
    description: "Token performance = your score. Top roster wins.",
  },
];

export function HowItWorks() {
  return (
    <section className="home-how-it-works">
      <div className="home-how-header">
        <p className="mcg-eyebrow">How it works</p>
        <h2 className="home-how-title">Three moves. One winner.</h2>
      </div>
      <div className="home-how-steps">
        {steps.map((step) => (
          <div key={step.num} className="home-how-step">
            <div className="home-how-step-icon" aria-hidden="true">
              {step.icon}
            </div>
            <div className="home-how-step-num">{step.num}</div>
            <h3 className="home-how-step-title">{step.title}</h3>
            <p className="home-how-step-desc">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
