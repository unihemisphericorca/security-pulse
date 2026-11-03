# 🛡️ Security Pulse — Live Hacking News Dashboard

A beautiful, real-time cybersecurity news dashboard that aggregates the latest hacking news, CVEs, breaches, exploits, and security advisories from top sources. Built as a static site for GitHub Pages — no backend required.

![Security Pulse Preview](https://img.shields.io/badge/Live-Dashboard-00d4ff?style=for-the-badge&logo=github)

## ✨ Features

- **Multi-source aggregation** — The Hacker News, BleepingComputer, Krebs on Security, Dark Reading, Threatpost, CISA, NIST NVD, GitHub Advisories
- **Real-time updates** — Auto-refreshes every 5 minutes, manual refresh anytime
- **Smart classification** — Auto-tags articles (CVE, breach, exploit, malware, patch, phishing, zero-day)
- **Severity detection** — Critical 🔴, High 🟠, Medium 🟡, Low 🟢 based on content analysis
- **CVE extraction** — Automatically finds and highlights CVE IDs
- **Filter & search** — Filter by source, severity
- **Trending CVEs sidebar** — See the latest vulnerabilities at a glance
- **Source health monitoring** — Know which feeds are active
- **Cyberpunk aesthetic** — Dark theme with cyan/green accents, scanline effects
- **Fully responsive** — Works on desktop, tablet, mobile
- **Accessible** — Keyboard navigation, semantic HTML, reduced motion support
- **Zero cost** — Hosted free on GitHub Pages

## 🚀 Quick Deploy

### Option 1: Use this template (Recommended)

1. Click **"Use this template"** → **"Create a new repository"**
2. Name it `security-pulse` (or anything)
3. Go to **Settings → Pages**
4. Source: **GitHub Actions**
5. Push to main — the workflow auto-deploys!

### Option 2: Manual setup

```bash
git clone https://github.com/YOUR_USERNAME/security-pulse.git
cd security-pulse
# Edit sources in app.js if needed
git add . && git commit -m "Initial commit" && git push
```

Then enable GitHub Pages in repo settings.

## 📡 Data Sources

| Source | Type | Category |
|--------|------|----------|
| The Hacker News | RSS | News |
| BleepingComputer | RSS | News |
| Krebs on Security | RSS | News |
| Dark Reading | RSS | News |
| Threatpost | RSS | News |
| CISA Alerts | RSS | Advisory |
| NIST NVD | RSS | CVE |
| GitHub Advisories | API | Advisory |

*All via public RSS feeds or APIs. Uses [rss2json.com](https://rss2json.com) for CORS-friendly RSS-to-JSON conversion.*

## ⚙️ Customization

### Add/remove sources
Edit `CONFIG.SOURCES` in `app.js`:

```javascript
SOURCES: [
  {
    id: 'custom-source',
    name: 'Custom Source',
    icon: '🎯',
    url: 'https://api.rss2json.com/v1/api.json?rss_url=YOUR_RSS_URL',
    category: 'news',
    color: '#your-color'
  }
]
```

### Adjust refresh interval
```javascript
CACHE_DURATION: 5 * 60 * 1000, // 5 minutes (default)
```

### Change articles per page
```javascript
ARTICLES_PER_PAGE: 20,
```

### Modify tag/severity keywords
```javascript
TAG_KEYWORDS: { ... },
SEVERITY_KEYWORDS: { ... },
```

## 🎨 Theming

CSS variables in `styles.css`:

```css
:root {
  --bg-primary: #0a0f14;
  --accent-cyan: #00d4ff;
  --accent-green: #00ff88;
  --accent-orange: #ffb800;
  --accent-red: #ff3366;
  --accent-purple: #b877ff;
  /* ... */
}
```

## 📁 Project Structure

```
security-pulse/
├── index.html          # Main HTML
├── styles.css          # Cyberpunk styling
├── app.js              # Core logic (fetching, filtering, rendering)
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Pages deployment
└── README.md
```

## 🔧 Local Development

```bash
# Simple HTTP server
python -m http.server 8000
# or
npx serve .
# Then open http://localhost:8000
```

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Add sources, improve UI, fix bugs
4. Submit a PR

Ideas welcome:
- More RSS sources
- Webhook notifications (Discord, Slack)
- Search functionality
- Dark/light theme toggle
- Export to JSON/CSV

## 📄 License

MIT License — Use freely for learning, research, or your own dashboards.

## ⚠️ Disclaimer

**Educational and research purposes only.** This dashboard aggregates public security news. Always verify information from primary sources before acting. Stay legal, stay ethical.

---

Built for the [Orca Brain](https://github.com/unihemisphericorca/orca-brain) project • Cybersecurity learning dashboard