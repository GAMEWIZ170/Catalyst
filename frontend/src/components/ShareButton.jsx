import { useState } from "react";
import { Link2, MessageCircle, Share2 } from "lucide-react";
import { Button, useToast } from "./ui";
import { t } from "../i18n";

// Share a link. The phone's own share menu comes first (it includes WhatsApp, Telegram and others). Where there is
// none (most laptops), a WhatsApp button and Copy link are shown instead. Only the link and a short text are shared.
export default function ShareButton({ url, title, text }) {
  const { toast } = useToast();
  const [fallback, setFallback] = useState(false);
  const message = `${text} ${url}`;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return; // the student closed the share menu
      }
    }
    setFallback(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast({ tone: "success", message: t("share.copied") });
    } catch {
      toast({ tone: "warning", message: t("share.copyFailed") });
    }
  }

  return <div className="share-row">
    <Button variant="secondary" onClick={share}><Share2 size={16} aria-hidden="true" /> {t("share.button")}</Button>
    {fallback && <>
      <a className="button button-secondary" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" /> {t("share.whatsapp")}</a>
      <Button variant="secondary" onClick={copy}><Link2 size={16} aria-hidden="true" /> {t("share.copy")}</Button>
    </>}
  </div>;
}
