import {
  BookCheck, BookOpen, CalendarCheck, CalendarHeart, CircleCheck, ClipboardCheck, Eye, FilePlus2, Layers, Library, Lock,
  Medal, Repeat, Sunrise, Swords, Target, Timer, Trophy, UserPlus, Users, Wind
} from "lucide-react";

// One icon per achievement, one colour family per group. Earned badges are filled, locked ones are a quiet outline.
const ICONS = {
  first_lesson: BookOpen, lessons_10: BookCheck, lessons_50: Library, first_unit_mastered: Medal, units_mastered_5: Trophy,
  first_test: ClipboardCheck, perfect_test: Target, perfect_tests_5: Target, second_wind: Wind,
  first_review: Repeat, reviews_100: Repeat, reviews_500: Repeat, cards_100: Layers, correct_100: CircleCheck, correct_500: CircleCheck,
  study_days_7: CalendarCheck, study_days_15: CalendarCheck, study_weeks_4: CalendarHeart, first_focus: Timer, comeback: Sunrise,
  first_set: FilePlus2, set_studied_50: Users, first_friend: UserPlus, first_challenge: Swords, first_challenge_won: Swords,
  challenges_10: Swords, sharp_eyed: Eye
};
const COLORS = {
  learn: "bg-success text-on-rate",
  tests: "bg-info text-on-rate",
  review: "bg-rate-hard text-on-rate",
  habit: "bg-rate-good text-on-rate",
  create: "bg-primary text-primary-foreground",
  social: "bg-rate-again text-on-rate"
};

export default function AchievementBadge({ item, className = "" }) {
  const earned = Boolean(item.unlockedAt);
  const Icon = earned ? ICONS[item.key] || Medal : Lock;
  const tone = earned ? COLORS[item.group] || COLORS.learn : "border-2 border-dashed border-border text-muted-foreground";
  return <span aria-hidden="true" className={`grid size-14 shrink-0 place-items-center rounded-full ${tone} ${className}`}><Icon size={26} /></span>;
}
