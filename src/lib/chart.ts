import * as QuickChart from "quickchart-js";

export class Chart {
  static generateAsciiChart(chartX: string[], chartY: number[]): string {
    // 最大の価格を取得して、それを基にスケールを決定
    const maxPrice = Math.max(...chartY);
    const scale = maxPrice / 20; // この数値は棒グラフの最大幅

    let chart = "時刻                        円/kWh\n";

    for (let i = 0; i < chartX.length; i++) {
      const bars = "|".repeat(chartY[i] / scale);
      chart += `${chartX[i]} ${bars.padEnd(20)} ${chartY[i].toFixed(1)}\n`;
    }

    return chart;
  }

  static async generateChart(chartX: any, chartY: any): Promise<string> {
    const myChart = new QuickChart.default();
    myChart.setConfig({
      // 線グラフ
      type: "line",
      // データ
      data: {
        // 各データの時間
        labels: chartX,
        // データセット
        datasets: [
          {
            label: "JPY/kWh",
            fill: false,
            data: chartY,
            borderColor: "rgba(255, 99, 132, 1)", //線の色
            backgroundColor: "rgba(255, 99, 132, 1)", //塗りつぶしの色
            pointRadius: 1, //点の大きさ
          },
        ],
      },
      // グラフ設定
      options: {
        // 凡例は非表示
        legend: {
          display: false,
        },
        scales: {
          // X軸
          xAxes: [
            {
              // 軸ラベル表示
              scaleLabel: {
                display: true,
                labelString: "Time",
                fontSize: 15,
              },
              // ここで軸を時間を設定する
              type: "time",
              time: {
                parser: "HH:mm",
                unit: "hour",
                stepSize: 1,
                displayFormats: {
                  hour: "HH:mm",
                },
              },
              // X軸の範囲を指定
              ticks: {
                min: "00:00",
                max: "24:00",
                fontSize: 12,
                //fontStyle: "bold",
              },
              // gridLines: {
              //   display: false,
              // },
            },
          ],
          // Y軸
          yAxes: [
            {
              // 軸ラベル表示
              scaleLabel: {
                display: true,
                labelString: "JPY/kWh",
                fontSize: 12,
              },
              // Y軸の範囲を指定
              ticks: {
                min: Math.min(0, ...chartY),
                max: Math.max(50, ...chartY),
                fontSize: 12,
                fontStyle: "bold",
              },
            },
          ],
        },
      },
    });
    return await myChart.getShortUrl();
  }
}
