type StatusBadgeProps = {
  value: string;
};

function token(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function StatusBadge({ value }: StatusBadgeProps) {
  return <span className={`status-badge status-${token(value)}`}>{value}</span>;
}
