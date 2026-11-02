export default function StatusBadge({ isPublished }) {
  return <span className={`status-badge ${isPublished ? "status-badge--published" : "status-badge--draft"}`}>
    {isPublished ? "Published" : "Draft"}
  </span>;
}
