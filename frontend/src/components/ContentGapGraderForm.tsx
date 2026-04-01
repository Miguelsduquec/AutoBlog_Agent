import { FormEvent } from "react";

type ContentGapGraderFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
  ctaLabel?: string;
  compact?: boolean;
};

export function ContentGapGraderForm({
  value,
  onChange,
  onSubmit,
  submitting = false,
  ctaLabel = "Grade my website",
  compact = false
}: ContentGapGraderFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className={`grader-form ${compact ? "compact" : ""}`} onSubmit={handleSubmit}>
      <label className="grader-input-wrap">
        <span className="eyebrow">Website URL</span>
        <input
          type="url"
          placeholder="https://yourwebsite.com"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
      </label>
      <button className="button" type="submit" disabled={submitting || !value.trim()}>
        {submitting ? "Analyzing…" : ctaLabel}
      </button>
    </form>
  );
}
