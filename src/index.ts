import { IncomingWebhook } from "@slack/webhook";

import { Crawler } from "./lib/crawler";
import { Chart } from "./lib/chart";

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || "";

const webhook = new IncomingWebhook(slackWebhookUrl);

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

  if (today.getHours() > 13) {
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
