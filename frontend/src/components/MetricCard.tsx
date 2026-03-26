type MetricCardProps = {
  title: string;
  value: string | number;
  help: string;
};

export function MetricCard({ title, value, help }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-label">{title}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-help">{help}</div>
    </article>
  );
}
