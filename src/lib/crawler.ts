import { CookieJar, MemoryCookieStore } from "tough-cookie";
import qs from "qs";
import * as cheerio from "cheerio";

export class Crawler {
  private cookieJar: CookieJar;
  constructor() {
    this.cookieJar = new CookieJar();
  }

  async fetchWithCookies(url: string, options: RequestInit = {}) {
    console.log(url);
    // クッキーをヘッダーにセット
    const cookies = await this.cookieJar.getCookieString(url);
    //console.log(cookies)
    options.headers = {
      ...options.headers,
      Cookie: cookies,
    };

    const response = await fetch(url, options);
    //console.log(response)

    // レスポンスからクッキーを取得して保存
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") {
        return;
      }
      const setCookie = value;
      if (!setCookie) {
        return;
      }
      this.cookieJar.setCookieSync(setCookie, url);
    });

    return cheerio.load(await response.text());
  }

  buildForm(tree: cheerio.CheerioAPI, body: any = {}): RequestInit {
    const token = tree.root().find('input[name="_token"]').first().val();
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "Accept-Encoding": "gzip, deflate",
        Accept: "text/html,application/xhtml+xml,application/xml;",
        // 'Referer': loginPageUrl,
      },
      body: qs.stringify({
        _token: token,
        ...body,
        //remember: 'on',
      }),
      credentials: "include",
      redirect: "manual",
    };
  }

  async login() {
    const loginPageUrl = "https://hachidori-denryoku.jp/login";

    const tree = await this.fetchWithCookies(loginPageUrl);
    const loginResponse = await this.fetchWithCookies(
      loginPageUrl,
      this.buildForm(tree, {
        email: process.env.HACHIDORI_EMAIL || "",
        password: process.env.HACHIDORI_PASSWORD || "",
      })
    );
  }

  async marketPrice(date: string): Promise<any[]> {
    const marketPriceUrl =
      "https://hachidori-denryoku.jp/mypage/market_price_bulletin";
    const marketPriceFormResponse = await this.fetchWithCookies(marketPriceUrl);

    const tomorrowMarketPriceResponse = await this.fetchWithCookies(
      marketPriceUrl,
      this.buildForm(marketPriceFormResponse, {
        area_id: "3",
        contract_type_id: "1",
        target_date: date,
      })
    );

    const scriptContent = tomorrowMarketPriceResponse
      .root()
      .find("#marketContainer")
      .find("script:not([src])")
      .first()
      .text();
    const chartX = this.parseArrayFromScript(scriptContent, "chart_x");
    const chartY = this.parseArrayFromScript(scriptContent, "chart_y");

    return [chartX, chartY];
  }

  parseArrayFromScript(script: string, variableName: string): any | null {
    const regex = new RegExp(`const ${variableName} = (\\[.*?\\])`);
    const match = script.match(regex);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
    return null;
  }
}
