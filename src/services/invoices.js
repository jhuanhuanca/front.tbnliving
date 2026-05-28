import api from "./api";

export function fetchMyInvoices(params = {}) {
  return api.get("/me/invoices", { params }).then((r) => r.data);
}

export function fetchMyInvoice(id) {
  return api.get(`/me/invoices/${id}`).then((r) => r.data?.invoice || r.data);
}
