/** Costo fijo de envío para pedidos de socios (Bs.). */
export const MEMBER_SHIPPING_COST_BOB = 40;

export const DELIVERY_MODE_PICKUP = "recojo";
export const DELIVERY_MODE_SHIPPING = "envio";

export const DELIVERY_LOCAL_DEPARTMENTS = ["santa cruz"];

export const DELIVERY_NOTICE_LOCAL =
  "Entrega local (Santa Cruz): tu pedido se entregará en un plazo de 24 horas hábiles.";

export const DELIVERY_NOTICE_NATIONAL =
  "Entrega nacional (otros departamentos): tu pedido se entregará dentro de 48 a 72 horas hábiles.";

export function isLocalDelivery(departamento, ciudad = "") {
  const dep = String(departamento || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const city = String(ciudad || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (DELIVERY_LOCAL_DEPARTMENTS.some((d) => dep.includes(d))) return true;
  if (city.includes("santa cruz")) return true;
  return false;
}

export function deliveryNoticeFor(departamento, ciudad = "") {
  return isLocalDelivery(departamento, ciudad) ? DELIVERY_NOTICE_LOCAL : DELIVERY_NOTICE_NATIONAL;
}

export function emptyShippingAddress() {
  return { departamento: "", ciudad: "", direccion: "" };
}

export function isShippingAddressComplete(addr) {
  return Boolean(
    String(addr?.departamento || "").trim() &&
      String(addr?.ciudad || "").trim() &&
      String(addr?.direccion || "").trim()
  );
}
