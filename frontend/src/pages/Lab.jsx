import { FlaskConical } from "lucide-react";
import { EmptyState } from "../components/ui";
import { t } from "../i18n";

// Placeholder until Phase X4 builds study sets.
export default function Lab() {
  return <div className="content student-page">
    <h1>{t("lab.title")}</h1>
    <EmptyState icon={FlaskConical} title={t("lab.title")} description={t("lab.soon")} />
  </div>;
}
