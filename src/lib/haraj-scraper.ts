import * as cheerio from "cheerio";
import { sql, type WatchLeadKind, type WatchLeadPriceType } from "./db";

// Curated list of luxury/valuable watch brands this shop deals in — search is
// brand-keyword based (not the generic "ساعات" category) per the shop's request,
// with no minimum price filter.
export const WATCH_BRANDS = [
  "رولكس",
  "أوميغا",
  "باتيك فيليب",
  "كارتييه",
  "أوديمار بيغيه",
  "هوبلوت",
  "تاغ هوير",
  "بريتلينغ",
  "لونجين",
  "رادو",
  "سيكو",
  "زينيث",
  "بانيراي",
  "تيودور",
  "شوبارد",
  "بولغري",
  "فاشيرون كونستانتين",
  "جايجر لوكولتر",
] as const;

const REQUEST_TIMEOUT_MS = 8_000;
const SEARCH_CONCURRENCY = 6;
const MAX_IMAGES_PER_LEAD = 8;
const MAX_DESCRIPTION_LEN = 2000;

type ScrapedListing = {
  externalId: string;
  url: string;
  title: string;
  brand: string;
  price: number | null;
  priceType: WatchLeadPriceType | null;
  description: string | null;
  city: string | null;
  postedAt: Date | null;
  images: string[];
};

/** Runs `items` through `task` with at most `limit` in flight at once — keeps the
 * whole scan comfortably inside a serverless function's execution time limit
 * instead of paying every request's latency sequentially. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await task(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Builds the Haraj search URL for a keyword. This is the single spot to adjust
 * once the site's real search URL shape is confirmed against production traffic —
 * it could not be verified from this environment (no general internet egress). */
function buildSearchUrl(query: string): string {
  return `https://haraj.com.sa/search?q=${encodeURIComponent(query)}`;
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "ar,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parsePrice(text: string): { price: number | null; priceType: WatchLeadPriceType | null } {
  const isOffer = /سوم|للتفاوض|قابل للنقاش/.test(text);
  const digits = text.replace(/[^\d]/g, "");
  const price = digits ? Number(digits) : null;
  if (price === null) return { price: null, priceType: isOffer ? "offer" : null };
  return { price, priceType: isOffer ? "offer" : "fixed" };
}

function extractExternalId(url: string): string | null {
  const m = url.match(/haraj\.com\.sa\/(\d{5,})/);
  return m ? m[1] : null;
}

function toAbsoluteHarajUrl(href: string): string | null {
  try {
    const abs = href.startsWith("http") ? href : new URL(href, "https://haraj.com.sa").toString();
    return abs.startsWith("https://haraj.com.sa") ? abs : null;
  } catch {
    return null;
  }
}

/** Structured-data (schema.org JSON-LD) extraction — preferred since it's SEO-oriented
 * and far more stable across front-end redesigns than CSS selectors. */
function extractFromJsonLd($: cheerio.CheerioAPI, brand: string): ScrapedListing[] {
  const results: ScrapedListing[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    let data: unknown;
    try {
      data = JSON.parse($(el).contents().text());
    } catch {
      return;
    }
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      const record = item as Record<string, unknown>;
      const itemListElements =
        record["@type"] === "ItemList" && Array.isArray(record.itemListElement)
          ? (record.itemListElement as unknown[])
          : record["@type"] === "Product"
            ? [record]
            : [];
      for (const raw of itemListElements) {
        if (typeof raw !== "object" || raw === null) continue;
        const el2 = raw as Record<string, unknown>;
        const product = (el2.item && typeof el2.item === "object" ? el2.item : el2) as Record<string, unknown>;
        const url = typeof product.url === "string" ? toAbsoluteHarajUrl(product.url) : null;
        const title = typeof product.name === "string" ? product.name : null;
        if (!url || !title) continue;
        const externalId = extractExternalId(url);
        if (!externalId) continue;
        const offers = product.offers as Record<string, unknown> | undefined;
        const priceRaw = offers && typeof offers.price !== "undefined" ? String(offers.price) : "";
        const { price, priceType } = parsePrice(priceRaw || title);
        const images: string[] = [];
        if (typeof product.image === "string") images.push(product.image);
        else if (Array.isArray(product.image)) {
          for (const img of product.image) if (typeof img === "string") images.push(img);
        }
        results.push({
          externalId,
          url,
          title,
          brand,
          price,
          priceType,
          description: typeof product.description === "string" ? product.description.slice(0, MAX_DESCRIPTION_LEN) : null,
          city: typeof product.areaServed === "string" ? product.areaServed : null,
          postedAt: null,
          images: images.slice(0, MAX_IMAGES_PER_LEAD),
        });
      }
    }
  });
  return results;
}

/** CSS-selector fallback for when the page carries no usable JSON-LD. Haraj ad links
 * follow a `/<numeric-id>/<slug>` URL shape; selectors here are best-effort guesses and
 * will very likely need a tuning pass once run against the live site. */
function extractFromHtml($: cheerio.CheerioAPI, brand: string): ScrapedListing[] {
  const results: ScrapedListing[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const url = toAbsoluteHarajUrl(href);
    if (!url) return;
    const externalId = extractExternalId(url);
    if (!externalId || seen.has(externalId)) return;

    const container = $(el).closest("li, article, div");
    const title = ($(el).text() || container.find("h2,h3").first().text() || "").trim();
    if (!title) return;

    seen.add(externalId);
    const priceText = container.find("[class*=price], [class*=Price]").first().text() || "";
    const { price, priceType } = parsePrice(priceText);
    const images = container
      .find("img[src]")
      .toArray()
      .map((img) => $(img).attr("src") || "")
      .filter(Boolean)
      .slice(0, MAX_IMAGES_PER_LEAD);
    const city = container.find("[class*=city], [class*=location]").first().text().trim() || null;

    results.push({
      externalId,
      url,
      title,
      brand,
      price,
      priceType,
      description: title.slice(0, MAX_DESCRIPTION_LEN),
      city,
      postedAt: null,
      images,
    });
  });

  return results;
}

async function searchHaraj(query: string, brand: string): Promise<ScrapedListing[]> {
  const html = await fetchHtml(buildSearchUrl(query));
  if (!html) return [];
  const $ = cheerio.load(html);
  const fromJsonLd = extractFromJsonLd($, brand);
  if (fromJsonLd.length > 0) return fromJsonLd;
  return extractFromHtml($, brand);
}

async function upsertLead(kind: WatchLeadKind, listing: ScrapedListing): Promise<boolean> {
  const existing = await sql`
    SELECT id FROM watch_leads WHERE source = 'haraj' AND external_id = ${listing.externalId} AND kind = ${kind} LIMIT 1
  `;
  if (existing.length > 0) return false;

  const inserted = await sql`
    INSERT INTO watch_leads (kind, source, external_id, url, title, brand, price, price_type, description, city, posted_at)
    VALUES (${kind}, 'haraj', ${listing.externalId}, ${listing.url}, ${listing.title}, ${listing.brand},
      ${listing.price}, ${listing.priceType}, ${listing.description}, ${listing.city}, ${listing.postedAt})
    RETURNING id
  `;
  const leadId = (inserted[0] as { id: number }).id;

  for (let i = 0; i < listing.images.length; i++) {
    await sql`
      INSERT INTO watch_lead_images (lead_id, image_url, sort_order) VALUES (${leadId}, ${listing.images[i]}, ${i})
    `;
  }
  return true;
}

export type ScanResult = { newForSale: number; newWanted: number };

export async function runScanWithLog(triggerSource: "cron" | "manual"): Promise<ScanResult & { error: string | null }> {
  const logRow = await sql`
    INSERT INTO scan_log (trigger_source) VALUES (${triggerSource}) RETURNING id
  `;
  const logId = (logRow[0] as { id: number }).id;

  try {
    const { newForSale, newWanted } = await runOpportunityScan();
    await sql`
      UPDATE scan_log SET finished_at = now(), status = 'success', new_for_sale = ${newForSale}, new_wanted = ${newWanted}
      WHERE id = ${logId}
    `;
    return { newForSale, newWanted, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    await sql`
      UPDATE scan_log SET finished_at = now(), status = 'error', error_message = ${message} WHERE id = ${logId}
    `;
    return { newForSale: 0, newWanted: 0, error: message };
  }
}

type SearchTask = { brand: string; kind: WatchLeadKind; query: string };

export async function runOpportunityScan(): Promise<ScanResult> {
  let newForSale = 0;
  let newWanted = 0;

  const tasks: SearchTask[] = WATCH_BRANDS.flatMap((brand) => [
    { brand, kind: "for_sale" as WatchLeadKind, query: brand },
    { brand, kind: "wanted" as WatchLeadKind, query: `مطلوب ${brand}` },
  ]);

  // Fetch + parse all brand/kind searches concurrently — this is the slow, network-bound
  // part, and running it in parallel keeps the whole scan well inside a serverless
  // function's execution time limit instead of paying every request's latency in series.
  const fetched = await mapWithConcurrency(tasks, SEARCH_CONCURRENCY, async (task) => {
    try {
      return { kind: task.kind, listings: await searchHaraj(task.query, task.brand) };
    } catch {
      return { kind: task.kind, listings: [] as ScrapedListing[] };
    }
  });

  for (const { kind, listings } of fetched) {
    for (const listing of listings) {
      if (kind === "wanted" && !/مطلوب|أبحث|ابحث/.test(listing.title)) continue;
      if (kind === "for_sale" && /مطلوب/.test(listing.title)) continue;
      try {
        const created = await upsertLead(kind, listing);
        if (created) {
          if (kind === "for_sale") newForSale++;
          else newWanted++;
        }
      } catch {
        // One listing failing to save shouldn't drop the rest of the scan's results.
      }
    }
  }

  return { newForSale, newWanted };
}
