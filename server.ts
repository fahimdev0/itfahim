import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import fetch from "node-fetch";
import parser from "iptv-playlist-parser";

const app = express();
const PORT = 3000;

app.use(express.json());

const M3U_URLS = [
  "https://raw.githubusercontent.com/bdtechexpert/live-tv-playlist/refs/heads/main/live-tv-playlist.m3u",
  "https://raw.githubusercontent.com/abusaeeidx/Mrgify-Tv/refs/heads/main/playlist.m3u",
  "https://raw.githubusercontent.com/abusaeeidx/Ayna-BDIX-IPTV-Playlist/refs/heads/main/ayna-playlist.m3u",
  "https://raw.githubusercontent.com/abusaeeidx/T-Sports-Playlist-Auto-Update/refs/heads/main/combine_playlist.m3u",
  "https://raw.githubusercontent.com/sydul104/main04/refs/heads/main/my",
  "https://raw.githubusercontent.com/v5on/filoox-bdix-selected/refs/heads/main/playlist.m3u",
  "https://raw.githubusercontent.com/Koshwefull/Koshwefull/refs/heads/main/infosat.m3u",
  // including the large one lazily or as needed - we will fetch it
  "https://iptv-org.github.io/iptv/index.m3u"
];

let cachedChannels: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

async function fetchPlaylists() {
  if (Date.now() - lastFetchTime < CACHE_DURATION && cachedChannels.length > 0) {
    return cachedChannels;
  }
  
  const allChannels: any[] = [];
  const channelUrls = new Set();
  
  // We'll restrict parsing the huge iptv-org list to maybe top or general categories later if it's too big,
  // but for now let's try getting them all and deduplicating.
  
  for (const url of M3U_URLS) {
    try {
      const response = await fetch(url);
      let text = await response.text();
      if (!text.trim().startsWith('#EXTM3U')) {
        text = '#EXTM3U\n' + text.trim();
      }
      const parsed = parser.parse(text);
      for (const item of parsed.items) {
        if (!channelUrls.has(item.url)) {
          allChannels.push({
            id: Math.random().toString(36).substring(7),
            name: item.name,
            logo: item.tvg.logo,
            group: item.group.title || 'Uncategorized',
            url: item.url
          });
          channelUrls.add(item.url);
        }
      }
    } catch (e) {
      console.error(`Failed to fetch or parse playlist ${url}`, e);
    }
  }
  
  cachedChannels = allChannels;
  lastFetchTime = Date.now();
  return cachedChannels;
}

app.get("/api/channels", async (req, res) => {
  try {
    const channels = await fetchPlaylists();
    res.json({ channels });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

app.post("/api/ask", async (req, res) => {
  try {
    const { message, channelContext } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured" });
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are the Fahim TV AI Assistant. A user is asking: "${message}". ${
      channelContext ? `They are currently watching a channel named "${channelContext}".` : ''
    } Be concise, helpful, and provide information about TV shows, schedules, or general queries.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        tools: [{ googleSearch: {} }] // Add search grounding
      }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error("AI Assistant error:", error);
    res.status(500).json({ error: "AI request failed" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
