import { api } from "./client";

export const lockersApi = {
  list: () => api.get("/lockers/cells/"),
  summary: () => api.get("/lockers/cells/summary/"),
  zones: () => api.get("/lockers/cells/zones/"),
  availability: (params) => api.get("/lockers/cells/availability/", { params }),
  reset: (id) => api.post(`/lockers/cells/${id}/reset/`, {}),
  markMaintenance: (id) => api.post(`/lockers/cells/${id}/mark_maintenance/`, {}),
};

export const reservationsApi = {
  list: () => api.get("/lockers/reservations/"),
  active: () => api.get("/lockers/reservations/active/"),
  create: (payload) => api.post("/lockers/reservations/", payload),
  cancel: (id) => api.post(`/lockers/reservations/${id}/cancel/`, {}),
};

export const parcelsApi = {
  list: () => api.get("/parcels/"),
  inbound: (payload) => api.post("/parcels/inbound/", payload),
  open: (pickupCode) => api.post("/parcels/open/", { pickup_code: pickupCode }),
};

export const notificationsApi = {
  list: () => api.get("/notifications/"),
};

export const returnsApi = {
  list: () => api.get("/returns/"),
  create: (payload) => api.post("/returns/", payload),
  complete: (id) => api.post(`/returns/${id}/complete/`, {}),
};
