type LobbyTickerProps = {
  items: string[];
};

export function LobbyTicker({ items }: LobbyTickerProps) {
  const visibleItems = items.filter((item) => item.trim().length > 0);

  if (visibleItems.length === 0) return null;

  const tickerItems = [...visibleItems, ...visibleItems];

  return (
    <div className="lobby-ticker" aria-label="Lobby status ticker">
      <div className="lobby-ticker-track">
        {tickerItems.map((item, index) => (
          <span key={`${item}-${index}`} className="lobby-ticker-item">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
