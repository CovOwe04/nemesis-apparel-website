export const SHIPPING_RATES = {
  USA: 0,
  Canada: 5,
  World: 8,
};

export function getShipRegion(country) {
  const c = (country || '').toUpperCase().trim();
  if (c === 'US' || c === 'USA' || c === 'UNITED STATES') return 'USA';
  if (c === 'CA' || c === 'CANADA') return 'Canada';
  return 'World';
}

export function calcShippingUsd(country, jerseyCount) {
  return SHIPPING_RATES[getShipRegion(country)] * jerseyCount;
}