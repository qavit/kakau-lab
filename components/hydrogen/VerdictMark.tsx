import { Check, CircleAlert } from "lucide-react";

/** The match / mismatch cue: an icon plus a word, so the verdict never rests on colour alone. */
export default function VerdictMark({ match, label }: { match: boolean; label: string }) {
  return (
    <span className={`hydrogen-verdict-mark ${match ? "ok" : "off"}`}>
      {match ? <Check size={18} strokeWidth={3} aria-hidden /> : <CircleAlert size={18} strokeWidth={2.5} aria-hidden />}
      {label}
    </span>
  );
}
