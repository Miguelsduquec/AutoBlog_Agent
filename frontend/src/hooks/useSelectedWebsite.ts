import { useEffect, useState } from "react";
import { Website } from "../types";

export function useSelectedWebsite(websites: Website[] | null) {
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");

  useEffect(() => {
    if (!websites?.length) {
      setSelectedWebsiteId("");
      return;
    }

    const exists = websites.some((website) => website.id === selectedWebsiteId);
    if (!selectedWebsiteId || !exists) {
      setSelectedWebsiteId(websites[0].id);
    }
  }, [selectedWebsiteId, websites]);

  return [selectedWebsiteId, setSelectedWebsiteId] as const;
}
