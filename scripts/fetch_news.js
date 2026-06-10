const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const RSS_FEEDS = [
  { name: 'Hacker News', url: 'https://news.ycombinator.com/rss' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/' }
];

async function fetchNews(modelName, dataDir) {
  console.log('Starting Daily Tech-Prophet fetcher via agy CLI...');
  console.log(`Configured Caster Model: ${modelName}`);
  console.log(`Configured Data Directory: ${dataDir}`);

  // Step 1: Fetch and aggregate RSS feeds
  console.log('Fetching live technology RSS feeds...');
  const aggregatedArticles = [];

  for (const feed of RSS_FEEDS) {
    console.log(`Fetching ${feed.name}...`);
    const items = await fetchRSS(feed.url, feed.name);
    console.log(`Retrieved ${items.length} items from ${feed.name}`);
    aggregatedArticles.push(...items.slice(0, 15));
  }

  if (aggregatedArticles.length === 0) {
    throw new Error('Could not retrieve any articles from the RSS feeds. Check your internet connection.');
  }

  console.log(`Aggregated ${aggregatedArticles.length} total articles. Building prompt for ${modelName}...`);

  // Step 2: Build the prompt for the local CLI
  const articlesListText = aggregatedArticles.map((art, idx) => {
    return `[ID: ${idx}]
Title: ${art.title}
Source: ${art.source}
Snippet: ${art.description}
Link: ${art.link}
`;
  }).join('\n');

  const systemPrompt = `You are a personalized tech news curator. Your goal is to find the most relevant, high-signal news, articles, and GitHub repos each day. Prioritize practical usefulness and technical depth over volume.

Your interests in ranked order:
1. Software development:
   - AI development, ML, RAG, LLMs
   - Full-stack development
   - UI/UX
   - Linux, kdb/q
   - JavaScript, TypeScript, React, Next.js, React Native
   - iOS, Android, Flutter
   - Databases, graph databases, vector databases
2. Companies:
   - Nvidia, OpenAI, Google, Microsoft, Apple, Anthropic
   - Important open-source ecosystem updates
3. Consumer tech and hardware:
   - Chips, devices, laptops, phones, wearables, developer hardware
4. Useful reading and repos:
   - Articles, blog posts, benchmarks, release notes, and GitHub repos related to the above

Curation & Filtering Rules:
- Rank results by relevance to interests, technical depth, novelty, and practical impact.
- Prefer primary sources when available: official blogs, GitHub releases, docs, engineering blogs, changelogs, research papers, and conference talks.
- Include a mix of: breaking news, practical engineering articles, product or platform announcements, open-source releases, and interesting GitHub repos worth starring.
- Exclude generic hype, marketing fluff, and low-quality reposts.
- Strongly prefer topics that intersect with AI + full-stack + mobile + infrastructure.
- Give extra weight to: React, Next.js, React Native, FastAPI, Node.js, RAG, vector databases, agent tooling, evals, MCP, LLM infrastructure, databases, distributed systems, performance engineering.
- Down-rank: pure consumer speculation, surface-level "AI trend" articles, and non-technical company PR unless it has real product impact.
- If a topic is repeated across many sources, cluster it into one short summary.
- Limit the final selection to exactly 10 best items.
- Group results into these sections:
  A. Must-read software dev news
  B. Big company updates
  C. Consumer tech and hardware
  D. Best articles and GitHub repos
- Also select exactly one "hidden gem" item that is less mainstream but unusually useful for a senior developer.

For each item, write:
- Title
- Source
- Why it matters to me (concise, specific, and opinionated explanation of why this fits a senior developer's stack)
- 1-2 sentence technical summary
- Link

Output your response STRICTLY as a raw JSON object matching the requested schema. Do not enclose the JSON in markdown code blocks.`;

  const userPrompt = `${systemPrompt}

Here is the list of aggregated raw articles:

${articlesListText}

Please analyze the list and curate the top 10 articles and exactly 1 hidden gem. Format your output strictly as a JSON object matching this schema:
{
  "date": "current human-readable date, e.g., June 11, 2026",
  "articles": [
    {
      "section": "A", // "A" for software dev, "B" for big company, "C" for hardware, "D" for articles/repos
      "title": "Title of the item",
      "source": "Source (e.g. Hacker News, TechCrunch)",
      "whyItMatters": "1-sentence opinionated description of why this matters for the user",
      "summary": "1-2 sentence technical summary of the article contents",
      "link": "The URL link corresponding to this selected article"
    }
  ],
  "hiddenGem": {
    "title": "Title of the hidden gem",
    "source": "Source / GitHub",
    "whyItMatters": "Why this matters",
    "summary": "1-2 sentence description",
    "link": "The URL link corresponding to this hidden gem"
  }
}
`;

  // Step 3: Query the local Ollama LLM
  console.log(`Querying local Ollama model ${modelName}...`);
  const rawText = await queryOllama(modelName, userPrompt);
  console.log('Received response from Ollama. Cleaning response...');

  let responseText = rawText.trim();
  if (responseText.startsWith('```')) {
    responseText = responseText.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
  }

  const newsData = JSON.parse(responseText);
  newsData.model = modelName;

  // Step 4: Scrape OpenGraph images for the selected articles
  console.log('Scraping article images for animated frames...');
  for (let i = 0; i < newsData.articles.length; i++) {
    const art = newsData.articles[i];
    console.log(`Scraping ${art.title}...`);
    art.image = await scrapeMetadata(art.link);
  }
  
  console.log(`Scraping hidden gem ${newsData.hiddenGem.title}...`);
  newsData.hiddenGem.image = await scrapeMetadata(newsData.hiddenGem.link);

  // Save to data directory
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dataPath = path.join(dataDir, 'news.json');
  fs.writeFileSync(dataPath, JSON.stringify(newsData, null, 2), 'utf-8');
  
  console.log(`Successfully curated articles and saved cache to ${dataPath}`);
}

// Queries the local Ollama / OpenAI-compatible endpoint
async function queryOllama(model, promptText) {
  const apiUrl = process.env.LOCAL_LLM_API_URL || 'http://localhost:11434/v1';
  // Normalize model name (e.g. mapping "Gemma 4" variants to "gemma4:latest")
  let targetModel = model || 'gemma4:latest';
  if (targetModel.toLowerCase().includes('gemma4') || targetModel.toLowerCase().includes('gemma 4')) {
    targetModel = 'gemma4:latest';
  }

  console.log(`Sending POST request to: ${apiUrl}/chat/completions with model: ${targetModel}`);
  
  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [
        {
          role: 'user',
          content: promptText
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama API returned status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  } else {
    throw new Error(`Unexpected Ollama API response: ${JSON.stringify(data)}`);
  }
}

// Helper: Parse XML RSS Feed without external dependencies
async function fetchRSS(url, sourceName) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (!response.ok) return [];

    const xml = await response.text();
    const items = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const content = match[1];
      const title = (content.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
      const link = (content.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '';
      const description = (content.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || '';
      
      const cleanTitle = title.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
      const cleanLink = link.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
      const cleanDesc = description
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]*>/g, '') 
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanTitle && cleanLink) {
        items.push({
          title: cleanTitle,
          link: cleanLink,
          description: cleanDesc.slice(0, 300),
          source: sourceName
        });
      }
    }
    return items;
  } catch (e) {
    console.warn(`Failed to fetch RSS from ${url}:`, e.message);
    return [];
  }
}

// Helper: Scrape OpenGraph image
async function scrapeMetadata(url) {
  if (!url || !url.startsWith('http')) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    
    const html = await response.text();
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i) ||
                         html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:image"/i) ||
                         html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"/i) ||
                         html.match(/<meta[^>]*content="([^"]*)"[^>]*name="twitter:image"/i);
                         
    if (ogImageMatch && ogImageMatch[1]) {
      let imageUrl = ogImageMatch[1].trim();
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        const urlObj = new URL(url);
        imageUrl = urlObj.origin + imageUrl;
      }
      return imageUrl;
    }
  } catch (e) {
    // silently skip
  }
  return null;
}

module.exports = { fetchNews };

if (require.main === module) {
  const os = require('os');
  const dotenvPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(dotenvPath)) {
    try {
      require('dotenv').config({ path: dotenvPath });
    } catch (e) {
      // Fallback simple line-by-line env parser
      const content = fs.readFileSync(dotenvPath, 'utf8');
      content.split('\n').forEach(line => {
        const parts = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (parts) {
          const key = parts[1];
          let value = parts[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      });
    }
  }

  const modelName = process.env.LOCAL_LLM_MODEL || 'gemma4:latest';
  const dataDir = path.join(os.homedir(), 'Library', 'Application Support', 'tech-prophet', 'data');

  fetchNews(modelName, dataDir)
    .then(() => {
      console.log('Daily Tech-Prophet curation complete.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Curation failed:', err);
      process.exit(1);
    });
}

