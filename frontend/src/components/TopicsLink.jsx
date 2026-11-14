import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Button } from "./ui";

// A link to Practise by topic. Hidden until the admin has tagged some questions.
export default function TopicsLink() {
  const [any, setAny] = useState(false);
  useEffect(() => {
    let live = true;
    api.getTopics().then(({ data }) => { if (live) setAny(data.topics.length + data.sources.length + data.years.length > 0); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!any) return null;
  return <div className="button-row"><Button as={Link} variant="secondary" to="/topics">Practise by topic</Button></div>;
}
