// Shared currency utilities — the single source of truth for USD/CAD display.
// The user's selection is persisted in localStorage by the Arsenal toggle.

export const CAD_RATE = 1.36;

export function getCurrency() {
  if (typeof window === 'undefined') return 'USD';
  return localStorage.getItem('nemesis-currency') || 'USD';
}

export function setCurrency(currency) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nemesis-currency', currency);
  }
}

export function formatPrice(priceUsd, currency = getCurrency()) {
  const cur = currency || 'USD';
  const value = cur === 'CAD' ? priceUsd * CAD_RATE : priceUsd;
  const formatted = Number(value).toFixed(2);
  return `$${formatted} ${cur}`;
}