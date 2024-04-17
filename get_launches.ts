import puppeteer, { Page } from "puppeteer";

const DAY = 16;
const MONTH = 4;

export type Launch = {
  title: string
  tagline: string
  launch_url: string
  description: string
  maker_comment: string | null
  product: Product | null
  day_rank: string
  categories: string[]
}

export type AugmentedLaunch = Launch & {
  date: string
  generated_comment: string | null
  sent_comment: boolean
  sent_twitter_dm: boolean
}

export type Product = {
  product_url: string
  website_url: string
  makers: Maker[]
}

export type Maker = {
  name: string;
  bio: string | null
  founder_url: string
  founder_twitter: string | null
  sent_twitter_dm?: boolean
  twitter_dm_pre_launch?: string,
  twitter_dm_post_launch?: string,
}

const PRODUCT_HUNT_URL = "https://www.producthunt.com";
console.log("Starting browser");
const browser = await puppeteer.launch({ headless: true });

async function get_launch(url: string): Promise<Launch> {
  console.log("getting launch", url);
  const page = await browser.newPage();
  page.setViewport({ width: 1200, height: 800 });
  await page.goto(url, { waitUntil: "load" });

  const first_comment_handler = await page.waitForSelector("#comments .md\\:pb-0", { timeout: 5000 }).catch(() => null);
  const is_maker_comment = !!await first_comment_handler?.$(".styles_maker__9NO2s")

  let maker_comment = is_maker_comment
    ? await first_comment_handler?.$eval(".styles_htmlText__eYPgj", element => element?.textContent) || null
    : null;

  let product_url = await page.$eval("#about a[href^='/products/'].text-dark-grey.styles_noOfLines-1__u8iSd", element => element?.getAttribute("href")).catch(() => null);

  return {
    launch_url: url,
    maker_comment: maker_comment,
    tagline: await page.$eval(".styles_tagline__svEiR", element => element?.textContent!),
    title: await page.$eval(".styles_title__x5KUY", element => element?.textContent!),
    description: await page.$eval(".styles_htmlText__eYPgj", element => element?.textContent!),
    product: product_url ? await get_product(PRODUCT_HUNT_URL + product_url) : null,
    day_rank: await page.$$eval(".mb-10 .text-dark-grey", elements => elements[2].textContent!),
    categories: await page.$$eval(".styles_topicItem__yQEki .styles_subnavLinkText__WGIz0", elements => elements.map(el => el.textContent!)),
  }
}


async function get_product(url: string): Promise<Product> {
  console.log("getting product", url);
  const page = await browser.newPage();
  page.setViewport({ width: 1200, height: 800 });
  await page.goto(url, { waitUntil: "load" });

  const maker_urls = await page.$$eval("a.styles_userImage__PmH_6", elements => elements.map(el => el.getAttribute("href")));

  return {
    product_url: url,
    website_url: await page.$eval(".styles_buttons__kKy_S a.styles_primary__o9u3f", element => element?.getAttribute("href")!),
    makers: await Promise.all(maker_urls.slice(0, 3).map(url => get_maker(PRODUCT_HUNT_URL + url))),
  }
}


async function get_maker(url: string): Promise<Maker> {
  console.log("getting maker", url);
  const page = await browser.newPage();
  page.setViewport({ width: 1200, height: 800 });
  await page.goto(url, { waitUntil: "load" });

  const links = await page.$$eval(".styles_userLink__eDq16", elements => elements.map(el => el.getAttribute("href") || "https://google.com"))

  return {
    founder_url: url,
    name: await page.$eval("h1", element => element?.textContent!),
    bio: await page.$eval(".text-18.font-light.text-light-grey.mb-1", element => element?.textContent || null),
    founder_twitter: links.find(link => ["twitter.com", "x.com"].includes(new URL(link).hostname)) || null,
    // founder_linkedin: links.find(link => new URL(link).hostname === "linkedin.com") || null,
  }
}

async function get_launches(month: number, day: number): Promise<AugmentedLaunch[]> {
  const page = await browser.newPage();
  page.setViewport({ width: 1400, height: 1000 });
  await page.goto(PRODUCT_HUNT_URL + `/leaderboard/daily/2024/${month}/${day}/all`, { waitUntil: "load" });

  /// load all the launches with scrolling
  await autoScroll(page);

  let launch_urls = await page.$$eval(".styles_item__Dk_nz .styles_titleContainer__qZRNa a[href^='/posts/']", elements => elements.map(el => el.getAttribute("href")!));

  console.log("Found", launch_urls.length, "launches");
  launch_urls = launch_urls.slice(0, 30);
  console.log("Getting first 30 launches");

  const launches = await batch_promises(launch_urls.map(url => async () => await get_launch(PRODUCT_HUNT_URL + url)), 3);

  return launches.map(launch => ({
    ...launch,
    date: new Date(2024, month - 1, day).toISOString(),
    generated_comment: null,
    sent_comment: false,
    sent_twitter_dm: false,
  }))
}

async function autoScroll(page: Page): Promise<void> {
  let last_height = await page.$eval("body", body => body.scrollHeight);
  while (true) {
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const new_height = await page.$eval("body", body => body.scrollHeight);

    if (new_height === last_height) break;
    last_height = new_height;
  }
}

/**
 * Exports all the launches for a given day and month
 *
 * Loads the existing launches.json file, deep merges the new launches into the object and saves the result
 */
async function export_launches(month: number, day: number): Promise<void> {
  const existing_launches: Record<string, AugmentedLaunch> = await Bun.file("launches.json", { type: "application/json" }).json();

  const new_launches = await get_launches(month, day);

  for (const launch of new_launches) {
    if(existing_launches[launch.launch_url]) {
      console.log("Launch already exists", launch.launch_url);
      continue;
    }
    if(!launch.product) continue
    if(!launch.maker_comment) continue
    if(!launch.product.makers.find(maker => maker.founder_twitter)) continue

    existing_launches[launch.launch_url] = launch;
  }

  console.log("Saving", Object.keys(existing_launches).length, "total launches");

  await Bun.write("launches.json", JSON.stringify(existing_launches, null, 4));
}

// console.log(await get_launch(PRODUCT_HUNT_URL + "/posts/seomaker"));
// console.log(await get_product(PRODUCT_HUNT_URL + "/products/draftboard"));
// console.log(await get_maker(PRODUCT_HUNT_URL + "/@benln"));
// console.log(await get_launches(4, 16));

await export_launches(MONTH, DAY);

await browser.close();
await Promise.all((await browser.pages()).map(page => page.close()));

async function batch_promises<T>(create_promises: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];

  while (create_promises.length > 0) {
    const batch = create_promises.splice(0, concurrency);
    results.push(...await Promise.all(batch.map(fn => fn())));
  }

  return results;
}

process.on("SIGINT", () => {
  console.log("Closing browser");
  browser.close();
  process.exit(0);
});