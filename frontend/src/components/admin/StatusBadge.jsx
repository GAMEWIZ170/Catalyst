import { Badge } from "../ui";

export default function StatusBadge({ isPublished }) {
  return <Badge tone={isPublished ? "success" : "neutral"}>{isPublished ? "Published" : "Draft"}</Badge>;
}
