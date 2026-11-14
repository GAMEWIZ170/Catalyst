// The daily goal choices, shared by the welcome steps and Settings.
export const GOALS = [
  { key: "none", label: "No goal for now", kind: "none" },
  { key: "m10", label: "10 minutes a day", kind: "minutes", minutes: 10 },
  { key: "m20", label: "20 minutes a day", kind: "minutes", minutes: 20 },
  { key: "m30", label: "30 minutes a day", kind: "minutes", minutes: 30 },
  { key: "lesson", label: "Finish one lesson a day", kind: "lesson" }
];

// Which choice matches the goal saved on the account.
export function goalKeyOf(dailyGoal) {
  if (!dailyGoal || dailyGoal.kind === "none") return "none";
  if (dailyGoal.kind === "lesson") return "lesson";
  return GOALS.find((item) => item.minutes === dailyGoal.minutes)?.key || "m10";
}
