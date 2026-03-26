import * as cheerio from "cheerio";
import { CrawlResultPage, Website } from "../types";

const DEFAULT_PATHS = ["/", "/about", "/services", "/service", "/platform", "/products", "/solutions", "/blog", "/resources"];

function inferPageType(url: string): string {
  if (url.endsWith("/")) {
    return "homepage";
  }

  if (url.includes("/about")) {
    return "about";
  }

  if (url.includes("/service")) {
    return "service";
  }

  if (url.includes("/platform") || url.includes("/product") || url.includes("/solution")) {
    return "product";
  }

  if (url.includes("/blog") || url.includes("/resource")) {
    return "blog-support";
  }

  return "page";
}

function trimText(value: string, maxLength = 420): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function buildFallbackPages(website: Website): CrawlResultPage[] {
  return [
    {
      url: website.domain,
      title: `${website.name} | ${website.niche}`,
      metaDescription: `${website.name} helps customers with ${website.niche.toLowerCase()} and related services.`,
      h1: `${website.name} helps teams win with ${website.niche.toLowerCase()}`,
      headings: [
        website.niche,
        website.contentGoal,
        `${website.targetCountry} market focus`
      ],
      contentExtract: `${website.name} serves ${website.targetCountry} customers with a ${website.tone.toLowerCase()} approach to ${website.niche.toLowerCase()}. The website focuses on ${website.contentGoal.toLowerCase()} and supports recurring publishing on a ${website.publishingFrequency.toLowerCase()} cadence.`,
      pageType: "homepage"
    },
    {
      url: `${website.domain.replace(/\/$/, "")}/services`,
      title: `${website.name} Services`,
      metaDescription: `Explore ${website.name}'s service delivery, niche expertise, and customer outcomes.`,
      h1: `${website.name} services`,
      headings: ["Core services", "Delivery approach", "Customer outcomes"],
      contentExtract: `${website.name} offers services aligned with ${website.niche.toLowerCase()} and is a strong candidate for supporting content around educational and commercial search intent.`,
      pageType: "service"
    }
  ];
}

async function fetchPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Autoblog-Agent-MVP/1.0"
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractPage(url: string, html: string): CrawlResultPage {
  const $ = cheerio.load(html);
  const headings = unique(
    $("h1, h2, h3")
      .slice(0, 12)
      .toArray()
      .map((element) => trimText($(element).text(), 140))
      .filter(Boolean)
  );

  const paragraphs = unique(
    $("p, li")
      .slice(0, 20)
      .toArray()
      .map((element) => trimText($(element).text(), 180))
      .filter((text) => text.length > 40)
  );

  const contentExtract = trimText(paragraphs.join(" "), 1200);
  const title = trimText($("title").first().text() || "Untitled page", 120);
  const metaDescription = trimText($('meta[name="description"]').attr("content") || "", 180);
  const h1 = trimText($("h1").first().text() || headings[0] || title, 140);

  return {
    url,
    title,
    metaDescription,
    h1,
    headings,
    contentExtract,
    pageType: inferPageType(url)
  };
}

export class WebsiteCrawler {
  async crawlWebsite(website: Website): Promise<CrawlResultPage[]> {
    const domain = website.domain.endsWith("/") ? website.domain.slice(0, -1) : website.domain;
    const urls = DEFAULT_PATHS.map((entry) => new URL(entry, `${domain}/`).toString());
    const results: CrawlResultPage[] = [];

    for (const url of urls) {
      const html = await fetchPage(url);
      if (!html) {
        continue;
      }

      results.push(extractPage(url, html));

      if (results.length >= 5) {
        break;
      }
    }

    return results.length > 0 ? results : buildFallbackPages(website);
  }
}
