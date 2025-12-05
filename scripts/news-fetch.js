const axios = require("axios");
const Parser = require("rss-parser");
const parser = new Parser();

const STRAPI_URL = "https://the-market-mindset-backend.onrender.com";
const STRAPI_TOKEN = "dc2eb8fb6cd14ec11c676988e7916b3ce1499e2462086c53f7e1efb7ac50dee953b5b7d8736ebe4f2d082a06e73ac8f2d7fd217a0f6f6d39ba41e6a1fbdf65bf53f1ea8f50b401aecf34c128f8e8438e0efa1958127a52d2eeca72fb7523d7648dc471d99d85023261aa4b295a822ba6d5027a0b577377e163d18604604e8afb";


const RSS_FEEDS = [
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=EURUSD=X",
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GBPUSD=X",
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=USDJPY=X",
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC=F",
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD",
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=ETH-USD",
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC",
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^IXIC"
];

async function fetchNews() {
  try {
    console.log("🔍 Fetching Yahoo Finance news...");

    for (const feedUrl of RSS_FEEDS) {
      const feed = await parser.parseURL(feedUrl);
      console.log(`📌 Loaded feed: ${feed.title}`);

      for (const item of feed.items) {
        const title = item.title || "Untitled";

        // Check duplicate
        const encodedTitle = encodeURIComponent(title);
        const existing = await axios.get(
          `${STRAPI_URL}/api/market-newses?filters[title][$eq]=${encodedTitle}`
        );

        if (existing.data.data.length > 0) {
          console.log("⏭ Skipping duplicate:", title);
          continue;
        }

        // Convert pubDate → ISO
        const isoDate = item.pubDate ? new Date(item.pubDate).toISOString() : null;

        // SEND TO STRAPI (publishedAt is correct)
        await axios.post(
          `${STRAPI_URL}/api/market-newses`,
          {
            data: {
              title: title,
              description: item.contentSnippet || item.content || "",
              url: item.link,
              source: "Yahoo Finance",
              publishedAt: isoDate,     // ✔ FIXED FIELD
              tickers: [],
              image_url: null
            }
          },
          {
            headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
          }
        );

        console.log("✅ Added:", title);
      }
    }

    console.log("🎉 All Yahoo Finance news updated successfully!");

  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
}

fetchNews();
