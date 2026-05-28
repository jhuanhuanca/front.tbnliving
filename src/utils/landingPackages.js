import { STATIC_PACKAGES_CARDS } from "@/constants/landingStaticPackages";

const META_BY_SLUG = Object.fromEntries(STATIC_PACKAGES_CARDS.map((c) => [c.slug, c]));

/** Orden de presentación en pricing (menor → mayor PV). */
const SLUG_ORDER = ["basico", "avanzado", "profesional", "fundador"];

/**
 * Enriquece paquetes del API con copy/features de la landing y orden de catálogo.
 * @param {Array<{ id: number|string, slug: string, name: string, price: string|number, pv_points: string|number }>} apiPackages
 */
export function enrichLandingPackages(apiPackages = []) {
  return [...apiPackages]
    .sort((a, b) => {
      const ia = SLUG_ORDER.indexOf(String(a.slug || ""));
      const ib = SLUG_ORDER.indexOf(String(b.slug || ""));
      const sa = ia >= 0 ? ia : 99;
      const sb = ib >= 0 ? ib : 99;
      if (sa !== sb) return sa - sb;
      return Number(a.pv_points || 0) - Number(b.pv_points || 0);
    })
    .map((p) => {
      const meta = META_BY_SLUG[p.slug] || {};
      return {
        ...p,
        displayName: p.name || meta.name || p.slug,
        description: meta.description || "Paquete de activación TBN con acceso al plan de compensación.",
        features: meta.features || [
          "Panel de afiliado",
          "BIR y binario según reglas",
          "Soporte y formación",
        ],
        recommended: p.slug === "profesional",
      };
    });
}

export function formatPackagePriceBob(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return String(price ?? "—");
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(n);
}
