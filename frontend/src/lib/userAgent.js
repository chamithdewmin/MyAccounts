/** Keep heuristic in sync with `backend/src/lib/userAgent.js` (deriveDeviceType). */

export function deriveDeviceType(ua) {
  const s = String(ua ?? '').toLowerCase();
  if (!s.trim()) return 'unknown';
  if (
    /ipad|playbook|kindle|silk-accelerated|nexus 7|nexus 9|nexus 10/.test(s) ||
    (/android/.test(s) && !/mobile/.test(s))
  ) {
    return 'tablet';
  }
  if (
    /iphone|ipod|android.*mobile|webos|blackberry|bb10|iemobile|wpdesktop|opera mini|mobi/.test(s) ||
    (/android/.test(s) && /mobile/.test(s))
  ) {
    return 'mobile';
  }
  return 'desktop';
}
