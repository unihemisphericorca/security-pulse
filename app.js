/**
 * Security Pulse - Live Hacking News Dashboard
 * Fetches from multiple security RSS feeds and APIs
 * Runs entirely client-side on GitHub Pages
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    // RSS feeds converted via rss2json or direct CORS-enabled endpoints
    SOURCES: [
        {
            id: 'thehackernews',
            name: 'The Hacker News',
            icon: '📰',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.feedburner.com/TheHackersNews',
            category: 'news',
            color: '#ff6b35'
        },
        {
            id: 'bleepingcomputer',
            name: 'BleepingComputer',
            icon: '💻',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.bleepingcomputer.com/feed/',
            category: 'news',
            color: '#e83e8c'
        },
        {
            id: 'krebsonsecurity',
            name: 'Krebs on Security',
            icon: '🔐',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https://krebsonsecurity.com/feed/',
            category: 'news',
            color: '#dc3545'
        },
        {
            id: 'darkreading',
            name: 'Dark Reading',
            icon: '🌑',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.darkreading.com/rss_simple.asp',
            category: 'news',
            color: '#6f42c1'
        },
        {
            id: 'threatpost',
            name: 'Threatpost',
            icon: '⚠️',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https://threatpost.com/feed/',
            category: 'news',
            color: '#fd7e14'
        },
        {
            id: 'cisa',
            name: 'CISA Alerts',
            icon: '🏛️',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.cisa.gov/uscert/ncas/alerts.xml',
            category: 'advisory',
            color: '#0d6efd'
        },
        {
            id: 'nist_nvd',
            name: 'NIST NVD',
            icon: '📋',
            url: 'https://api.rss2json.com/v1/api.json?rss_url=https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss-analyzed.xml',
            category: 'cve',
            color: '#198754'
        },
        {
            id: 'github_advisories',
            name: 'GitHub Advisories',
            icon: '🐙',
            url: 'https://api.github.com/advisories?per_page=20',
            category: 'advisory',
            color: '#24292e',
            headers: { 'Accept': 'application/vnd.github+json' }
        }
    ],

    // Keywords for tag classification
    TAG_KEYWORDS: {
        cve: ['cve-', 'cve ', 'vulnerability', 'vuln'],
        breach: ['breach', 'data leak', 'exposed', 'compromised', 'stolen'],
        exploit: ['exploit', 'poc', 'proof of concept', 'rce', 'remote code'],
        vuln: ['vulnerability', 'flaw', 'bug', 'weakness'],
        malware: ['malware', 'ransomware', 'trojan', 'backdoor', 'botnet'],
        patch: ['patch', 'update', 'fixed', 'mitigation', 'security update'],
        phishing: ['phishing', 'social engineering', 'credential theft'],
        zero_day: ['zero-day', '0day', '0-day', 'unpatched']
    },

    // Severity keywords
    SEVERITY_KEYWORDS: {
        critical: ['critical', 'cvss 9', 'cvss 10', '9.', '10.', 'actively exploited', 'in the wild'],
        high: ['high severity', 'cvss 7', 'cvss 8', '7.', '8.', 'important'],
        medium: ['medium severity', 'cvss 4', 'cvss 5', 'cvss 6', '4.', '5.', '6.', 'moderate'],
        low: ['low severity', 'cvss 1', 'cvss 2', 'cvss 3', '1.', '2.', '3.', 'minor']
    },

    // UI Settings
    ARTICLES_PER_PAGE: 20,
    MAX_ARTICLES_TOTAL: 100,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    REQUEST_TIMEOUT: 10000
};

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    articles: [],
    filteredArticles: [],
    sources: [...CONFIG.SOURCES],
    currentPage: 1,
    filters: {
        source: 'all',
        severity: 'all'
    },
    stats: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        bySource: {}
    },
    lastFetch: null,
    isLoading: false
};

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {
    articlesGrid: document.getElementById('articles-grid'),
    loadMoreBtn: document.querySelector('.btn-load-more'),
    refreshBtn: document.getElementById('refresh-btn'),
    sourceFilter: document.getElementById('source-filter'),
    severityFilter: document.getElementById('severity-filter'),
    totalArticles: document.getElementById('total-articles'),
    criticalCount: document.getElementById('critical-count'),
    lastUpdate: document.getElementById('last-update'),
    feedCount: document.getElementById('feed-count'),
    feedTimestamp: document.getElementById('feed-timestamp'),
    quickStats: document.getElementById('quick-stats'),
    trendingCves: document.getElementById('trending-cves'),
    sourceList: document.getElementById('source-list'),
    toastContainer: document.getElementById('toast-container')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function parseDate(dateStr) {
    if (!dateStr) return new Date(0);
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date(0) : date;
}

function classifyTags(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    const tags = [];

    for (const [tag, keywords] of Object.entries(CONFIG.TAG_KEYWORDS)) {
        if (keywords.some(kw => text.includes(kw))) {
            tags.push(tag);
        }
    }

    return tags.length > 0 ? tags : ['generic'];
}

function classifySeverity(title, description) {
    const text = (title + ' ' + description).toLowerCase();

    for (const [severity, keywords] of Object.entries(CONFIG.SEVERITY_KEYWORDS)) {
        if (keywords.some(kw => text.includes(kw))) {
            return severity;
        }
    }

    // Check for CVSS scores in text
    const cvssMatch = text.match(/cvss[:\s]*([0-9]\.?[0-9]?)/i);
    if (cvssMatch) {
        const score = parseFloat(cvssMatch[1]);
        if (score >= 9) return 'critical';
        if (score >= 7) return 'high';
        if (score >= 4) return 'medium';
        return 'low';
    }

    return 'unknown';
}

function extractCves(text) {
    const cveRegex = /CVE-\d{4}-\d{4,}/gi;
    const matches = text.match(cveRegex);
    return matches ? [...new Set(matches.map(m => m.toUpperCase()))] : [];
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// ============================================
// DATA FETCHING
// ============================================
async function fetchSource(source) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

        const response = await fetch(source.url, {
            headers: source.headers || {},
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Handle different response formats
        let items = [];
        if (data.items) {
            // rss2json format
            items = data.items;
        } else if (Array.isArray(data)) {
            // GitHub API format
            items = data;
        }

        return items.map(item => normalizeArticle(item, source)).filter(Boolean);
    } catch (error) {
        console.error(`Failed to fetch ${source.name}:`, error);
        source.status = 'error';
        source.error = error.message;
        return [];
    }
}

function normalizeArticle(item, source) {
    try {
        // Handle different source formats
        let title, description, link, pubDate, guid;

        if (item.title && item.link) {
            // rss2json format
            title = item.title;
            description = item.description || item.content || '';
            link = item.link;
            pubDate = item.pubDate;
            guid = item.guid || link;
        } else if (item.summary && item.html_url) {
            // GitHub Advisory format
            title = item.summary;
            description = item.description || '';
            link = item.html_url;
            pubDate = item.published_at || item.updated_at;
            guid = item.ghsa_id || link;
        } else {
            return null;
        }

        if (!title || !link) return null;

        // Clean description
        const cleanDesc = description
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 500);

        const fullText = title + ' ' + cleanDesc;
        const tags = classifyTags(title, cleanDesc);
        const severity = classifySeverity(title, cleanDesc);
        const cves = extractCves(fullText);
        const date = parseDate(pubDate);

        return {
            id: guid,
            title: title.trim(),
            description: cleanDesc,
            url: link,
            source: source.id,
            sourceName: source.name,
            sourceIcon: source.icon,
            sourceColor: source.color,
            publishedAt: date,
            tags,
            severity,
            cves,
            raw: item
        };
    } catch (error) {
        console.error('Normalize error:', error);
        return null;
    }
}

async function fetchAllSources() {
    state.isLoading = true;
    updateLoadingState(true);

    const results = await Promise.allSettled(
        state.sources.map(source => fetchSource(source))
    );

    let allArticles = [];
    results.forEach((result, index) => {
        const source = state.sources[index];
        if (result.status === 'fulfilled') {
            allArticles.push(...result.value);
            source.status = 'active';
            source.lastFetch = new Date();
            source.articleCount = result.value.length;
        } else {
            source.status = 'error';
            source.error = result.reason?.message || 'Unknown error';
        }
    });

    // Deduplicate by URL
    const seen = new Set();
    state.articles = allArticles
        .filter(article => {
            if (seen.has(article.url)) return false;
            seen.add(article.url);
            return true;
        })
        .sort((a, b) => b.publishedAt - a.publishedAt)
        .slice(0, CONFIG.MAX_ARTICLES_TOTAL);

    state.lastFetch = new Date();
    computeStats();
    applyFilters();
    renderAll();
    updateLoadingState(false);
    state.isLoading = false;

    showToast(`Loaded ${state.articles.length} articles from ${state.sources.filter(s => s.status === 'active').length} sources`, 'success');
}

function computeStats() {
    const stats = {
        total: state.articles.length,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        unknown: 0,
        bySource: {}
    };

    state.articles.forEach(article => {
        stats[article.severity] = (stats[article.severity] || 0) + 1;
        stats.bySource[article.source] = (stats.bySource[article.source] || 0) + 1;
    });

    state.stats = stats;
}

// ============================================
// FILTERING & RENDERING
// ============================================
function applyFilters() {
    let filtered = [...state.articles];

    if (state.filters.source !== 'all') {
        filtered = filtered.filter(a => a.source === state.filters.source);
    }

    if (state.filters.severity !== 'all') {
        filtered = filtered.filter(a => a.severity === state.filters.severity);
    }

    state.filteredArticles = filtered;
    state.currentPage = 1;
}

function renderAll() {
    renderArticles();
    renderStats();
    renderSidebar();
    updateHeaderStats();
}

function renderArticles() {
    const start = 0;
    const end = state.currentPage * CONFIG.ARTICLES_PER_PAGE;
    const articlesToShow = state.filteredArticles.slice(start, end);

    if (articlesToShow.length === 0) {
        elements.articlesGrid.innerHTML = `
            <div class="article-card empty-state">
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                    <p>No articles match your filters</p>
                </div>
            </div>
        `;
        elements.loadMoreBtn.style.display = 'none';
        return;
    }

    elements.articlesGrid.innerHTML = articlesToShow.map(article => createArticleCard(article)).join('');

    // Show/hide load more
    elements.loadMoreBtn.style.display = end < state.filteredArticles.length ? 'flex' : 'none';

    // Update feed count
    elements.feedCount.textContent = `${state.filteredArticles.length} articles`;
    elements.feedTimestamp.textContent = state.lastFetch ? `Updated ${formatRelativeTime(state.lastFetch)}` : 'Never';
}

function createArticleCard(article) {
    const timeAgo = formatRelativeTime(article.publishedAt);
    const severityClass = article.severity;
    const tagElements = article.tags.slice(0, 4).map(tag => 
        `<span class="article-tag ${tag}">${tag.toUpperCase()}</span>`
    ).join('');

    const cveElements = article.cves.length > 0 ? 
        article.cves.slice(0, 3).map(cve => 
            `<span class="article-tag cve">${cve}</span>`
        ).join('') : '';

    return `
        <article class="article-card" data-id="${article.id}">
            <div class="article-header">
                <div class="article-source">
                    <span class="article-source-icon">${article.sourceIcon}</span>
                    <span class="article-source-name">${escapeHtml(article.sourceName)}</span>
                </div>
                <time class="article-time" datetime="${article.publishedAt.toISOString()}">${timeAgo}</time>
            </div>
            <h3 class="article-title">${escapeHtml(article.title)}</h3>
            <p class="article-summary">${escapeHtml(article.description)}</p>
            <div class="article-tags">
                ${cveElements}
                ${tagElements}
            </div>
            <div class="article-footer">
                <div class="article-severity">
                    <span class="severity-badge ${severityClass}">${severityClass.toUpperCase()}</span>
                </div>
                <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" class="article-link">
                    Read more
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
            </div>
        </article>
    `;
}

function renderStats() {
    elements.totalArticles.textContent = state.stats.total.toLocaleString();
    elements.criticalCount.textContent = state.stats.critical;
    elements.lastUpdate.textContent = state.lastFetch ? formatRelativeTime(state.lastFetch) : 'Never';
}

function renderSidebar() {
    // Quick stats
    elements.quickStats.innerHTML = `
        <div class="quick-stat">
            <span class="quick-stat-label">Critical</span>
            <span class="quick-stat-value" style="color: var(--accent-red);">${state.stats.critical}</span>
        </div>
        <div class="quick-stat">
            <span class="quick-stat-label">High</span>
            <span class="quick-stat-value" style="color: var(--accent-orange);">${state.stats.high}</span>
        </div>
        <div class="quick-stat">
            <span class="quick-stat-label">Medium</span>
            <span class="quick-stat-value" style="color: var(--accent-green);">${state.stats.medium}</span>
        </div>
        <div class="quick-stat">
            <span class="quick-stat-label">Low</span>
            <span class="quick-stat-value" style="color: var(--text-muted);">${state.stats.low}</span>
        </div>
        <div class="quick-stat">
            <span class="quick-stat-label">Sources</span>
            <span class="quick-stat-value">${Object.keys(state.stats.bySource).length}</span>
        </div>
    `;

    // Trending CVEs - articles with CVEs sorted by recency
    const cveArticles = state.articles
        .filter(a => a.cves.length > 0)
        .slice(0, 5);

    if (cveArticles.length > 0) {
        elements.trendingCves.innerHTML = cveArticles.map(article => `
            <div class="trending-item">
                <span class="trending-cve-id">${article.cves[0]}</span>
                <span class="trending-cve-score ${article.severity}">${article.severity.toUpperCase()}</span>
                <span class="trending-cve-desc">${escapeHtml(article.title.substring(0, 60))}...</span>
            </div>
        `).join('');
    } else {
        elements.trendingCves.innerHTML = '<div class="trending-item" style="color: var(--text-muted); font-size: 0.8rem;">No CVEs in current feed</div>';
    }

    // Source list
    elements.sourceList.innerHTML = state.sources.map(source => `
        <div class="source-item">
            <span class="source-icon">${source.icon}</span>
            <span class="source-name">${escapeHtml(source.name)}</span>
            <span class="source-count">${state.stats.bySource[source.id] || 0}</span>
            <span class="source-status ${source.status === 'active' ? 'active' : ''}"></span>
        </div>
    `).join('');

    // Populate source filter
    const currentValue = elements.sourceFilter.value;
    elements.sourceFilter.innerHTML = `
        <option value="all">All Sources</option>
        ${state.sources.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('')}
    `;
    elements.sourceFilter.value = currentValue;
}

function updateHeaderStats() {
    // Already done in renderStats
}

function updateLoadingState(loading) {
    elements.refreshBtn.disabled = loading;
    if (loading) {
        elements.refreshBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"></path>
            </svg>
        `;
    } else {
        elements.refreshBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
        `;
    }
}

// ============================================
// EVENT HANDLERS
// ============================================
function setupEventListeners() {
    // Refresh button
    elements.refreshBtn.addEventListener('click', () => {
        if (!state.isLoading) fetchAllSources();
    });

    // Source filter
    elements.sourceFilter.addEventListener('change', (e) => {
        state.filters.source = e.target.value;
        applyFilters();
        renderArticles();
    });

    // Severity filter
    elements.severityFilter.addEventListener('change', (e) => {
        state.filters.severity = e.target.value;
        applyFilters();
        renderArticles();
    });

    // Load more
    elements.loadMoreBtn.addEventListener('click', () => {
        state.currentPage++;
        renderArticles();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (!state.isLoading) fetchAllSources();
        }
        if (e.key === 'Escape') {
            // Close any open toasts
            elements.toastContainer.innerHTML = '';
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    console.log('🛡️ Security Pulse initializing...');
    
    setupEventListeners();
    
    // Initial fetch
    await fetchAllSources();
    
    // Auto-refresh every 5 minutes
    setInterval(() => {
        if (!state.isLoading && document.visibilityState === 'visible') {
            fetchAllSources();
        }
    }, CONFIG.CACHE_DURATION);

    // Refresh on visibility change
    document.addEventListener('visibilitychange', () => {
        if (!state.isLoading && document.visibilityState === 'visible') {
            const timeSinceFetch = state.lastFetch ? Date.now() - state.lastFetch.getTime() : Infinity;
            if (timeSinceFetch > CONFIG.CACHE_DURATION) {
                fetchAllSources();
            }
        }
    });

    console.log('🛡️ Security Pulse ready');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.SecurityPulse = { state, fetchAllSources, CONFIG };