import { useEffect } from "react";

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let descriptionTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const createdTag = !descriptionTag;
    const previousDescription = descriptionTag?.getAttribute("content") ?? null;

    if (!descriptionTag) {
      descriptionTag = document.createElement("meta");
      descriptionTag.setAttribute("name", "description");
      document.head.appendChild(descriptionTag);
    }

    descriptionTag.setAttribute("content", description);

    return () => {
      document.title = previousTitle;

      if (!descriptionTag) {
        return;
      }

      if (createdTag) {
        descriptionTag.remove();
        return;
      }

      if (previousDescription !== null) {
        descriptionTag.setAttribute("content", previousDescription);
      }
    };
  }, [description, title]);
}
