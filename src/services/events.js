import api from "./api";

function appendFormFields(form, payload) {
  Object.entries(payload).forEach(([key, val]) => {
    if (val != null && val !== "") {
      form.append(key, String(val));
    }
  });
}

export function fetchEvents() {
  return api.get("/events").then((r) => r.data?.data || []);
}

export function fetchNews() {
  return api.get("/news").then((r) => r.data?.data || []);
}

export function fetchMyEventRegistrations(params = {}) {
  return api.get("/event-registrations", { params }).then((r) => r.data);
}

export function createEventRegistration(payload, paymentProofFile = null) {
  if (!paymentProofFile) {
    return api.post("/event-registrations", payload).then((r) => r.data);
  }

  const form = new FormData();
  appendFormFields(form, payload);
  form.append("payment_proof", paymentProofFile);

  return api.post("/event-registrations", form).then((r) => r.data);
}
