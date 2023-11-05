import { IncomingWebhook } from "@slack/webhook";
import * as fs from "fs/promises";
import * as path from "path";

import { Crawler } from "./lib/crawler";
import { Chart } from "./lib/chart";

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || "";

const webhook = new IncomingWebhook(slackWebhookUrl);

async function appendDayDataToCSV(
  date: string,
  chartX: string[],
  chartY: number[]
) {
  // 現在の年を取得
  const currentYear = new Date().getFullYear();
  const csvFileName = `${currentYear}.csv`; // CSVファイル名
  const csvFilePath = path.join(__dirname, csvFileName); // CSVファイルのパス

  try {
    // CSVファイルの存在確認
    try {
      await fs.access(csvFilePath);
    } catch (error) {
      // ファイルが存在しない場合はヘッダーとともに新規作成
      const header = "date," + chartX.join(",") + "\n";
      await fs.writeFile(csvFilePath, header);
    }

    // 1日のデータをCSV形式の文字列に変換
    const dayData = date + "," + chartY.join(",") + "\n";

    // ファイルに1日のデータを追記
    await fs.appendFile(csvFilePath, dayData);

    console.log(`Data for the day was appended to ${csvFileName}`);
  } catch (error) {
    console.error("Error appending data to CSV", error);
  }
}

function findCheapestHour(chartX: string[], chartY: number[]) {
  let minPrice = chartY[0];
  let minTime = chartX[0];

  for (let i = 1; i < chartY.length; i++) {
    if (chartY[i] < minPrice) {
      minPrice = chartY[i];
      minTime = chartX[i];
    }
  }

  return { minTime, minPrice };
}

(async () => {
  const today = new Date();

  if (today.getHours() >= 13) {
    // 13時以降は翌日のデータを取得する
    today.setDate(today.getDate() + 1); // 1日進める
  }

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0"); // 月は0から始まるため+1をし、2桁になるよう0を補う
  const dd = String(today.getDate()).padStart(2, "0"); // 2桁になるよう0を補う

  const date = `${yyyy}-${mm}-${dd}`;

  const cr = new Crawler();
  await cr.login();
  const [chartX, chartY] = await cr.marketPrice(date);
  await appendDayDataToCSV(date, chartX, chartY);

  // 関数を使用して最安の時間帯を見つける
  const cheapestHour = findCheapestHour(chartX, chartY);

  let chartUrl: string | null = null;
  let asciiChart: string | null = null;
  try {
    chartUrl = await Chart.generateChart(chartX, chartY);
    console.log(chartUrl);
    await webhook.send({
      text: `最安の時間帯は ${cheapestHour.minTime} で、料金は ${cheapestHour.minPrice} 円/kWh です`,
      attachments: [
        {
          image_url: chartUrl,
          title: `${date} の電力市場価格`,
        },
      ],
    });
  } catch (e) {
    console.error(e);
    console.log("fallback to ascii chart");
    asciiChart = Chart.generateAsciiChart(chartX, chartY);
    console.log(asciiChart);
    await webhook.send({
      text: `${date} の電力市場価格\n` + "```" + asciiChart + "```",
    });
  }
})();
