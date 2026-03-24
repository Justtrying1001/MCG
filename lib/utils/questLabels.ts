export function formatQuestAction(action: string): string {
  const upper = action.toUpperCase().trim();
  if (upper === "LIKE") return "Like on X";
  if (upper === "RETWEET" || upper === "RT" || upper === "REPOST") return "Repost on X";
  if (upper === "COMMENT") return "Comment on X";
  if (upper === "FOLLOW") return "Follow on X";
  if (upper === "CUSTOM") return "Complete the action";
  return action;
}
