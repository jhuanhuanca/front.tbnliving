import api from "@/services/api";

/**
 * Lista pública desde backend (countries con id + code ISO2).
 */
export async function fetchCountriesCatalog() {
  const res = await api.get("/countries");
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  return rows;
}
