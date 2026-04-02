import { ReactNode } from "react";

type TableShellProps = {
  label: string;
  children: ReactNode;
};

export function TableShell({ label, children }: TableShellProps) {
  return (
    <div aria-label={label} className="table-shell" role="region" tabIndex={0}>
      <table className="data-table">{children}</table>
    </div>
  );
}
