/** Cap stored User-Agent length (debugging only; avoids huge TEXT rows). */
export const USER_AGENT_STORE_MAX = 150;

export function truncateUserAgentForStore(ua) {
  const s = String(ua ?? '').trim();
  if (!s) return '';
  return s.length <= USER_AGENT_STORE_MAX ? s : s.slice(0, USER_AGENT_STORE_MAX);
}
