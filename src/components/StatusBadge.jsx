export default function StatusBadge({ status }) {
  const getStatusClass = (status) => {
    const s = status?.toUpperCase() || "UNKNOWN";
    if (s === "ACTIVE" || s === "APPROVED") return "status-approved";
    if (s === "INACTIVE" || s === "PENDING") return "status-pending";
    if (s === "REJECTED" || s === "DEACTIVATED") return "status-rejected";
    return "status-default";
  };

  return (
    <span className={`status-badge ${getStatusClass(status)}`}>
      {status || "UNKNOWN"}
    </span>
  );
}
