export function isMememonDemoModeEnabled() {
  return process.env.MEMEMON_DEMO_MODE === "true";
}

export function getMememonDemoUserDefaults() {
  return {
    handle: "mememon_demo",
    displayName: "Mememon Demo Player",
    points: 5000,
  };
}
