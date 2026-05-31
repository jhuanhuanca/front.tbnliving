/** Descuento cliente preferente sobre precio público (10%). */
export const PREFERRED_PUBLIC_DISCOUNT_RATE = 0.1;

/** Bono venta directa al patrocinador: 10% del precio público por unidad. */
export const PREFERRED_SPONSOR_COMMISSION_RATE = 0.1;

/** Si no hay precio público en catálogo (~278/198). */
export const PUBLIC_PRICE_FALLBACK_MULTIPLIER = 1.404;

export function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function publicPriceFromProduct(p) {
  if (p?.precio_publico != null && p.precio_publico !== "") {
    return roundMoney(p.precio_publico);
  }
  if (p?.price_cliente_preferente != null && p.price_cliente_preferente !== "") {
    return roundMoney(p.price_cliente_preferente);
  }
  const socio = Number(p?.price ?? p?.precio_socio ?? 0);
  return roundMoney(socio * PUBLIC_PRICE_FALLBACK_MULTIPLIER);
}

export function preferentePriceFromProduct(p) {
  const publico = publicPriceFromProduct(p);
  return roundMoney(publico * (1 - PREFERRED_PUBLIC_DISCOUNT_RATE));
}

export function sponsorCommissionFromProduct(p) {
  return roundMoney(publicPriceFromProduct(p) * PREFERRED_SPONSOR_COMMISSION_RATE);
}
