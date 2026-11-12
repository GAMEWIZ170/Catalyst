import Progress from "./ui/Progress";

// Course and lesson progress with a label and percentage. Wraps the shared Progress component.
export default function ProgressBar({ value = 0, label = "Progress" }) {
  return <Progress value={value} label={label} showLabel />;
}
