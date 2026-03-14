export type CoinGeckoMarketRow = {
  id: string;
  current_price: number | null;
  market_cap: number | null;
  total_volume: number | null;
  market_cap_rank: number | null;
  last_updated: string | null;
};

const COINGECKO_MARKETS_URL = "https://api.coingecko.com/api/v3/coins/markets";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(rows: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

async function fetchMarketsChunk(ids: string[], attempt = 0): Promise<CoinGeckoMarketRow[]> {
  const url = new URL(COINGECKO_MARKETS_URL);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", String(Math.max(ids.length, 1)));
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h");

  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (response.ok) {
    const payload = (await response.json().catch(() => [])) as CoinGeckoMarketRow[];
    return Array.isArray(payload) ? payload : [];
  }

  if (attempt >= 2) {
    throw new Error(`CoinGecko markets fetch failed (${response.status})`);
  }

  const retryAfter = Number(response.headers.get("retry-after") ?? "0");
  const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : (300 * (attempt + 1));
  await sleep(waitMs);
  return fetchMarketsChunk(ids, attempt + 1);
}

export async function fetchCoinsMarkets(ids: string[]) {
  const normalized = [...new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean))];
  if (normalized.length === 0) return [] as CoinGeckoMarketRow[];

  const parts = chunk(normalized, 200);
  const rows: CoinGeckoMarketRow[] = [];
  for (const part of parts) {
    const chunkRows = await fetchMarketsChunk(part);
    rows.push(...chunkRows);
    await sleep(220);
  }

  return rows;
}
