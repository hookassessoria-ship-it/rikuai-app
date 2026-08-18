// Código de indicação pendente: capturado na URL (?ref=xxxx) antes do login
// e resgatado logo após o onboarding.

const KEY = "riku_pending_ref";

export function captureReferralFromUrl(search: string) {
  const code = new URLSearchParams(search).get("ref");
  if (code && /^[a-z0-9]{4,16}$/i.test(code)) {
    localStorage.setItem(KEY, code.toLowerCase());
  }
}

export function getPendingReferral(): string | null {
  return localStorage.getItem(KEY);
}

export function clearPendingReferral() {
  localStorage.removeItem(KEY);
}

export function referralLink(code: string): string {
  return `${window.location.origin}/auth?ref=${code}`;
}
