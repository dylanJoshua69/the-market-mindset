const puppeteer = require("puppeteer");
const fs = require("fs");
const axios = require("axios");

// 🔥 Your Strapi Backend URL
const STRAPI_URL = "https://the-market-mindset-backend.onrender.com";

// 🔥 Your Full Access Token
const STRAPI_TOKEN = "dc2eb8fb6cd14ec11c676988e7916b3ce1499e2462086c53f7e1efb7ac50dee953b5b7d8736ebe4f2d082a06e73ac8f2d7fd217a0f6f6d39ba41e6a1fbdf65bf53f1ea8f50b401aecf34c128f8e8438e0efa1958127a52d2eeca72fb7523d7648dc471d99d85023261aa4b295a822ba6d5027a0b577377e163d18604604e8afb";

// TradingView chart URL generator
function getTradingViewURL(pair) {
    return `https://www.tradingview.com/chart/?symbol=${pair}`;
}

async function uploadChartToStrapi(pairId, imagePath) {
    const file = fs.createReadStream(imagePath);

    const res = await axios({
        method: "post",
        url: `${STRAPI_URL}/api/upload`,
        headers: {
            Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        data: {
            files: file,
        },
    });

    const uploadedImg = res.data[0];

    await axios.put(
        `${STRAPI_URL}/api/market-charts/${pairId}`,
        {
            data: {
                chart_image: uploadedImg.id,
                last_updated: new Date(),
            },
        },
        {
            headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
        }
    );

    console.log(`📊 Uploaded chart for ID: ${pairId}`);
}

async function generateCharts() {
    console.log("📌 Starting chart generation...");

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    page.setViewport({ width: 1600, height: 900 });

    // Fetch all pairs from Strapi
    const chartData = await axios.get(`${STRAPI_URL}/api/market-charts`, {
        headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    });

    const pairs = chartData.data.data;

    for (const entry of pairs) {
        const pair = entry.attributes.pair;
        const id = entry.id;

        const url = getTradingViewURL(pair);

        console.log(`📈 Loading chart for: ${pair}`);

        await page.goto(url, { waitUntil: "networkidle2" });

        // Wait for TV chart to load
        await page.waitForTimeout(6000);

        const filePath = `chart-${pair}.png`;
        await page.screenshot({ path: filePath });

        console.log(`📷 Screenshot saved: ${filePath}`);

        // Upload
        await uploadChartToStrapi(id, filePath);

        // Delete local file
        fs.unlinkSync(filePath);
    }

    await browser.close();
    console.log("🎉 Chart automation completed successfully!");
}

generateCharts();
