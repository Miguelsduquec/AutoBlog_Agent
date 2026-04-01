import * as cheerio from "cheerio";
import { CrawlResultPage, Website } from "../types";

const DEFAULT_PATHS = [
  "/",
  "/blog",
  "/resources",
  "/insights",
  "/guides",
  "/services",
  "/service",
  "/solutions",
  "/products",
  "/platform",
  "/about"
];

function inferPageType(url: string): string {
  const pathname = new URL(url).pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/") {
    return "homepage";
  }

  if (pathname.includes("/about")) {
    return "about";
  }

  if (pathname.includes("/service")) {
    return "service";
  }

  if (pathname.includes("/platform") || pathname.includes("/product") || pathname.includes("/solution")) {
    return "product";
  }

  if (pathname.includes("/blog") || pathname.includes("/resource") || pathname.includes("/guide") || pathname.includes("/insight")) {
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

function scoreCandidatePath(pathname: string): number {
  if (pathname === "/") {
    return 100;
  }
  if (pathname.includes("/blog") || pathname.includes("/resource") || pathname.includes("/guide") || pathname.includes("/insight")) {
    return 90;
  }
  if (pathname.includes("/service") || pathname.includes("/solution") || pathname.includes("/product") || pathname.includes("/platform")) {
    return 80;
  }
  if (pathname.includes("/about")) {
    return 40;
  }
  return 20;
}

function buildFallbackPage(website: Website, pageType: string, url: string): CrawlResultPage {
  const headings =
    pageType === "homepage"
      ? [website.niche, website.contentGoal, `${website.targetCountry} market focus`]
      : ["Core services", "Delivery approach", "Customer outcomes"];

  return {
    url,
    title: pageType === "homepage" ? `${website.name} | ${website.niche}` : `${website.name} Services`,
    metaDescription:
      pageType === "homepage"
        ? `${website.name} helps customers with ${website.niche.toLowerCase()} and related services.`
        : `Explore ${website.name}'s service delivery, niche expertise, and customer outcomes.`,
    h1:
      pageType === "homepage"
        ? `${website.name} helps teams win with ${website.niche.toLowerCase()}`
        : `${website.name} services`,
    headings,
    h2Headings: headings,
    contentExtract:
      pageType === "homepage"
        ? `${website.name} serves ${website.targetCountry} customers with a ${website.tone.toLowerCase()} approach to ${website.niche.toLowerCase()}. The website focuses on ${website.contentGoal.toLowerCase()} and supports recurring publishing on a ${website.publishingFrequency.toLowerCase()} cadence.`
        : `${website.name} offers services aligned with ${website.niche.toLowerCase()} and is a strong candidate for supporting content around educational and commercial search intent.`,
    pageType,
    isFallback: true
  };
}

function buildFallbackPages(website: Website): CrawlResultPage[] {
  return [
    buildFallbackPage(website, "homepage", website.domain),
    buildFallbackPage(website, "service", `${website.domain.replace(/\/$/, "")}/services`),
    buildFallbackPage(website, "blog-support", `${website.domain.replace(/\/$/, "")}/blog`)
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
  const h2Headings = unique(
    $("h2")
      .slice(0, 10)
      .toArray()
      .map((element) => trimText($(element).text(), 140))
      .filter(Boolean)
  );
  const headings = unique(
    $("h1, h2, h3")
      .slice(0, 12)
      .toArray()
      .map((element) => trimText($(element).text(), 140))
      .filter(Boolean)
  );

  const mainContentRoot = $("main").first().length ? $("main").first() : $("article").first().length ? $("article").first() : $("body");
  const paragraphs = unique(
    mainContentRoot
      .find("p, li")
      .slice(0, 30)
      .toArray()
      .map((element) => trimText($(element).text(), 220))
      .filter((text) => text.length > 28)
  );
  const fallbackBodyText = trimText(mainContentRoot.text(), 1400);
  const contentExtract = trimText(paragraphs.join(" ") || fallbackBodyText, 1400);
  const title = trimText($("title").first().text() || "Untitled page", 120);
  const metaDescription = trimText($('meta[name="description"]').attr("content") || "", 180);
  const h1 = trimText($("h1").first().text() || headings[0] || title, 140);

  return {
    url,
    title,
    metaDescription,
    h1,
    headings,
    h2Headings,
    contentExtract,
    pageType: inferPageType(url),
    isFallback: false
  };
}

function discoverPriorityUrls(baseUrl: string, html: string): string[] {
  const $ = cheerio.load(html);
  const candidates = $("a[href]")
    .toArray()
    .map((element) => $(element).attr("href") ?? "")
    .filter(Boolean)
    .map((href) => {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .filter((url) => {
      const parsed = new URL(url);
      const base = new URL(baseUrl);
      return parsed.origin === base.origin && !parsed.hash && !parsed.search;
    })
    .sort((left, right) => {
      const leftPath = new URL(left).pathname.replace(/\/+$/, "") || "/";
      const rightPath = new URL(right).pathname.replace(/\/+$/, "") || "/";
      return scoreCandidatePath(rightPath) - scoreCandidatePath(leftPath);
    });

  return unique(candidates);
}

export class WebsiteCrawler {
  async analyzeUrl(url: string): Promise<CrawlResultPage | null> {
    const html = await fetchPage(url);
    if (!html) {
      return null;
    }

    return extractPage(url, html);
  }

  buildFallbackForWebsite(website: Website): CrawlResultPage {
    return buildFallbackPage(website, "homepage", website.domain);
  }

  async crawlWebsite(website: Website): Promise<CrawlResultPage[]> {
    const domain = website.domain.endsWith("/") ? website.domain.slice(0, -1) : website.domain;
    const homepageUrl = new URL("/", `${domain}/`).toString();
    const homepageHtml = await fetchPage(homepageUrl);
    const discoveredUrls = homepageHtml ? discoverPriorityUrls(homepageUrl, homepageHtml) : [];
    const urls = unique([
      homepageUrl,
      ...discoveredUrls,
      ...DEFAULT_PATHS.map((entry) => new URL(entry, `${domain}/`).toString())
    ]);
    const results: CrawlResultPage[] = [];

    for (const [index, url] of urls.entries()) {
      const result =
        index === 0 && homepageHtml ? extractPage(url, homepageHtml) : await this.analyzeUrl(url);
      if (!result) {
        continue;
      }

      results.push(result);

      if (results.length >= 5) {
        break;
      }
    }

    if (results.length > 0) {
      return results;
    }

    return buildFallbackPages(website);
  }
}
