import { ReactNode } from "react";
import { Website } from "../types";

type WebsiteScopeHeaderProps = {
  title: string;
  description: string;
  websites: Website[];
  selectedWebsiteId: string;
  onSelectWebsite: (value: string) => void;
  actions?: ReactNode;
};

export function WebsiteScopeHeader({
  title,
  description,
  websites,
  selectedWebsiteId,
  onSelectWebsite,
  actions
}: WebsiteScopeHeaderProps) {
  return (
    <div className="page-toolbar">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="toolbar-controls">
        <select value={selectedWebsiteId} onChange={(event) => onSelectWebsite(event.target.value)}>
          {websites.map((website) => (
            <option key={website.id} value={website.id}>
              {website.name}
            </option>
          ))}
        </select>
        {actions}
      </div>
    </div>
  );
}
