import React from "react";

const statusMap = {
  empty: "green",
  reserved: "purple",
  occupied: "amber",
  open: "blue",
  maintenance: "red",
  stored: "amber",
  picked_up: "green",
  return_pending: "red",
  returned: "gray",
  pending: "amber",
  completed: "green",
  sent: "green",
  failed: "red",
  active: "green",
  used: "blue",
  cancelled: "gray",
  expired: "red",
};

export default function StatusBadge({ status, label }) {
  return <span className={`badge ${statusMap[status] || "gray"}`}>{label || status}</span>;
}
