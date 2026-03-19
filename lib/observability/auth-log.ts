type AuthLogLevel = "info" | "warn" | "error";

type AuthLogContext = Record<string, string | number | boolean | null | undefined>;

function serialize(context: AuthLogContext) {
  return Object.fromEntries(Object.entries(context).filter(([, value]) => value !== undefined));
}

export function logAuthEvent(event: string, level: AuthLogLevel, context: AuthLogContext) {
  const payload = {
    scope: "auth",
    event,
    level,
    timestamp: new Date().toISOString(),
    ...serialize(context),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}
