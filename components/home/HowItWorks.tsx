const steps = [
  {
    num: "01",
    icon: "◈",
    title: "Collect",
    description: "Open Genesis packs and assemble meme relics with distinct rarity and set identity.",
  },
  {
    num: "02",
    icon: "⚔",
    title: "Compete",
    description: "Take your best cards into live contests and lock rosters before the arena closes.",
  },
  {
    num: "03",
    icon: "◎",
    title: "Win",
    description: "Follow score swings, climb rankings, and turn your collection into competitive advantage.",
  },
];

export function HowItWorks() {
  return (
    <section className="home-how-it-works">
      <div className="home-how-header">
        <p className="home-how-eyebrow">How it works</p>
        <h2 className="home-how-title">Three moves. One collectible loop.</h2>
        <p className="home-how-copy">The redesign keeps the same game flow, but presents it as a richer collectible experience.</p>
      </div>
      <div className="home-how-steps">
        {steps.map((step) => (
          <div key={step.num} className="home-how-step" data-num={step.num}>
            <div className="home-how-step-top">
              <div className="home-how-step-icon" aria-hidden="true">
                {step.icon}
              </div>
              <div className="home-how-step-num">{step.num}</div>
            </div>
            <h3 className="home-how-step-title">{step.title}</h3>
            <p className="home-how-step-desc">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
