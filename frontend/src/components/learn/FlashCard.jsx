import { motion } from "motion/react";
import RichText from "../shared/RichText";
import ResponsiveImage from "../shared/ResponsiveImage";
import { cn } from "@/lib/utils";

// One flashcard that flips (rotateY). The face that is hidden is aria-hidden, and the whole card is one toggle button.
// Long text shrinks so a card never scrolls. Reduced motion makes the flip instant (MotionConfig in main.jsx).
function Face({ label, side, hidden }) {
  const long = (side.text || "").length > 140;
  return (
    <span aria-hidden={hidden} className="absolute inset-0 grid content-center justify-items-center gap-3 overflow-hidden rounded-lg p-6 text-center [backface-visibility:hidden] sm:p-8">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <span className={cn("max-w-full font-medium leading-snug", long ? "text-lg sm:text-xl" : "text-xl sm:text-[1.75rem]")}>
        <RichText>{side.text}</RichText>
      </span>
      {side.image?.url ? <ResponsiveImage image={side.image} sizes="(max-width: 600px) 100vw, 600px" loading="lazy" /> : null}
    </span>
  );
}

export default function FlashCard({ card, shown, onToggle }) {
  return (
    <div className="[perspective:1200px]">
      <button
        type="button"
        aria-pressed={shown}
        onClick={onToggle}
        className="relative block h-[clamp(15rem,calc(100dvh-31rem),26rem)] w-full cursor-pointer rounded-lg border border-border bg-card p-0 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <motion.span
          className="absolute inset-0 block [transform-style:preserve-3d]"
          initial={false}
          animate={{ rotateY: shown ? 180 : 0 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        >
          <Face label="Question" side={card.front} hidden={shown} />
          <span className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <Face label="Answer" side={card.back} hidden={!shown} />
          </span>
        </motion.span>
      </button>
    </div>
  );
}
