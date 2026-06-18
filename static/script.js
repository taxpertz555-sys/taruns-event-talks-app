// App State
let allReleases = [];
let filteredReleases = [];
let selectedRelease = null;
let currentFilter = 'all';
let searchQuery = '';
let readReleases = new Set(JSON.parse(localStorage.getItem('read_releases') || '[]'));

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const spinnerIcon = document.getElementById('spinner');
const statsText = document.getElementById('stats-text');
const searchInput = document.getElementById('search-input');
const filterTabs = document.getElementById('filter-tabs');
const releasesList = document.getElementById('releases-list');
const loadingSkeleton = document.getElementById('loading-skeleton');
const emptyState = document.getElementById('empty-state');

const detailPlaceholder = document.getElementById('detail-placeholder');
const detailView = document.getElementById('detail-view');
const detailTitle = document.getElementById('detail-title');
const detailDate = document.getElementById('detail-date');
const detailCategory = document.getElementById('detail-category');
const detailLink = document.getElementById('detail-link');
const detailBody = document.getElementById('detail-body');

const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const suggestTweetBtn = document.getElementById('suggest-tweet-btn');
const tweetBtn = document.getElementById('tweet-btn');

const themeToggleBtn = document.getElementById('theme-toggle');
const exportCsvBtn = document.getElementById('export-csv-btn');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Page Load Setup
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchReleases();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh action
    refreshBtn.addEventListener('click', fetchReleases);
    
    // Search action with input debouncer
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.toLowerCase().trim();
            applyFilters();
        }, 250);
    });
    
    // Tab filtering
    filterTabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab')) {
            // Toggle active classes
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            e.target.classList.add('active');
            
            currentFilter = e.target.dataset.type;
            applyFilters();
        }
    });

    // Auto-draft tweet
    suggestTweetBtn.addEventListener('click', () => {
        if (selectedRelease) {
            draftTweet(selectedRelease, true); // true for verbose rewrite
        }
    });
    
    // Character counter updates
    tweetTextarea.addEventListener('input', updateCharCount);
    
    // Post tweet action
    tweetBtn.addEventListener('click', postTweet);

    // Export CSV action
    exportCsvBtn.addEventListener('click', exportToCSV);

    // Theme Toggle action
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Copy Tweet action
    copyTweetBtn.addEventListener('click', () => {
        if (tweetTextarea.value) {
            navigator.clipboard.writeText(tweetTextarea.value).then(() => {
                showToast("Draft tweet copied to clipboard!");
            });
        }
    });

    // Reset Filters action
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        currentFilter = 'all';
        document.querySelectorAll('.tab').forEach(tab => {
            if (tab.dataset.type === 'all') tab.classList.add('active');
            else tab.classList.remove('active');
        });
        applyFilters();
    });
}

// Fetch Release Notes from Backend
async function fetchReleases() {
    // Show spinner and skeleton
    setLoadingState(true);
    
    try {
        const response = await fetch('/api/releases');
        const data = await response.json();
        
        if (data.success) {
            allReleases = data.releases.map(release => {
                // Determine release type
                const category = classifyRelease(release.title, release.content);
                return { ...release, category };
            });
            
            applyFilters();
            updateStatsBadge();
        } else {
            console.error('Failed to parse release notes:', data.error);
            showErrorState();
        }
    } catch (err) {
        console.error('API Error:', err);
        showErrorState();
    } finally {
        setLoadingState(false);
    }
}

// Helper to set loading elements
function setLoadingState(isLoading) {
    if (isLoading) {
        spinnerIcon.classList.add('spinning');
        refreshBtn.disabled = true;
        loadingSkeleton.classList.remove('hidden');
        releasesList.classList.add('hidden');
        emptyState.classList.add('hidden');
    } else {
        spinnerIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
        loadingSkeleton.classList.add('hidden');
        releasesList.classList.remove('hidden');
    }
}

// Classify release type based on keywords
function classifyRelease(title, content) {
    const textToSearch = (title + ' ' + content).toLowerCase();
    
    const deprecationKeywords = ['deprecat', 'remove', 'discontinu', 'expire', 'obsolete', 'support ends'];
    const featureKeywords = ['feature', 'new', 'support', 'introduce', 'added', 'allow', 'availability'];
    
    if (deprecationKeywords.some(kw => textToSearch.includes(kw))) {
        return 'deprecation';
    } else if (featureKeywords.some(kw => textToSearch.includes(kw))) {
        return 'feature';
    } else {
        return 'change';
    }
}

// Format raw XML date to readable local format
function formatDate(dateStr) {
    if (!dateStr) return 'Recent Update';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch {
        return dateStr;
    }
}

// Apply Search Query & Tabs
function applyFilters() {
    filteredReleases = allReleases.filter(release => {
        // Search filter
        const matchSearch = searchQuery === '' || 
            release.title.toLowerCase().includes(searchQuery) || 
            release.content.toLowerCase().includes(searchQuery);
            
        // Tab filter
        const matchTab = currentFilter === 'all' || release.category === currentFilter;
        
        return matchSearch && matchTab;
    });
    
    renderList();
}

// Render filtered items
function renderList() {
    releasesList.innerHTML = '';
    
    if (filteredReleases.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    filteredReleases.forEach(release => {
        const card = document.createElement('div');
        card.className = `release-card ${release.category}-type`;
        if (selectedRelease && selectedRelease.id === release.id) {
            card.classList.add('active');
        }
        
        // Truncate summary text for preview
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = release.content;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        const catLabel = release.category === 'feature' ? 'Feature' : 
                          release.category === 'deprecation' ? 'Deprecation' : 'Change/Fix';
        
        const isUnread = !readReleases.has(release.id);
        const unreadDot = isUnread ? `<span class="unread-dot" title="Unread Update"></span>` : '';

        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    ${unreadDot}
                    <span class="date-badge">${formatDate(release.published)}</span>
                    <span class="cat-badge ${release.category}">${catLabel}</span>
                </div>
                <button class="btn-copy-card" title="Copy clean text to clipboard">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                </button>
            </div>
            <h3>${release.title}</h3>
            <div class="card-excerpt">${plainText}</div>
        `;
        
        // Setup copy button interaction
        const copyBtn = card.querySelector('.btn-copy-card');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop card click handler
            
            const titleText = release.title;
            const fullText = `${titleText}\n\nDate: ${formatDate(release.published)}\nLink: ${release.link}\n\n${plainText}`;
            
            navigator.clipboard.writeText(fullText).then(() => {
                const originalSvg = copyBtn.innerHTML;
                copyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16" style="color: var(--badge-feature-text)">
                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                `;
                copyBtn.classList.add('copied');
                showToast("Copied release details to clipboard!");
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalSvg;
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        });

        card.addEventListener('click', () => selectRelease(release, card));
        releasesList.appendChild(card);
    });
}

// Handle release card selection
function selectRelease(release, cardElement) {
    selectedRelease = release;
    
    // Mark as read
    if (!readReleases.has(release.id)) {
        readReleases.add(release.id);
        localStorage.setItem('read_releases', JSON.stringify(Array.from(readReleases)));
        const dot = cardElement.querySelector('.unread-dot');
        if (dot) dot.remove();
    }

    // Highlight active card
    document.querySelectorAll('.release-card').forEach(c => c.classList.remove('active'));
    cardElement.classList.add('active');
    
    // Display details panel
    detailPlaceholder.classList.add('hidden');
    detailView.classList.remove('hidden');
    
    // Set info
    detailTitle.textContent = release.title;
    detailDate.textContent = formatDate(release.published);
    
    const catLabel = release.category === 'feature' ? 'Feature' : 
                      release.category === 'deprecation' ? 'Deprecation' : 'Change/Fix';
    detailCategory.textContent = catLabel;
    detailCategory.className = `cat-badge ${release.category}`;
    
    detailLink.href = release.link;
    detailBody.innerHTML = release.content;
    
    // Setup composer default tweet text
    draftTweet(release, false);
    
    // Smooth scroll on mobile screens
    if (window.innerWidth <= 992) {
        detailView.scrollIntoView({ behavior: 'smooth' });
    }
}

// Calculate tweet length considering Twitter's 23-character t.co URL shortening
function getTweetLength(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const textWithFixedUrls = text.replace(urlRegex, "x".repeat(23));
    return textWithFixedUrls.length;
}

// Draft/compose Tweet text
function draftTweet(release, isRewrite) {
    let cleanTitle = release.title.trim();
    // Remove "BigQuery release notes" prefix if present
    if (cleanTitle.toLowerCase().startsWith('bigquery')) {
        cleanTitle = cleanTitle.substring(8).trim().replace(/^[:-]/, '').trim();
    }
    
    let text = "";
    if (isRewrite) {
        // A punchy rewrite summary
        const hashtags = release.category === 'feature' ? '#BigQuery #GoogleCloud #DataAnalytics' : '#BigQuery #GCP';
        text = `🚀 ${cleanTitle}\n\nImportant update on Google BigQuery releases. Read the full documentation details here:\n${release.link}\n\n${hashtags}`;
    } else {
        // Standard concise tweet
        text = `📢 BigQuery Update: ${cleanTitle}\n\nRead more details here: ${release.link} #BigQuery #GoogleCloud`;
    }
    
    // Check constraint size limit using the t.co rules
    if (getTweetLength(text) > 280) {
        // Try truncating title
        const remainingSpace = 280 - (getTweetLength(text) - cleanTitle.length) - 3;
        if (remainingSpace > 30) {
            cleanTitle = cleanTitle.substring(0, remainingSpace) + '...';
            text = isRewrite ? 
                `🚀 ${cleanTitle}\n\nImportant update on Google BigQuery releases. Read the full documentation details here:\n${release.link}\n\n#BigQuery #GCP` :
                `📢 BigQuery Update: ${cleanTitle}\n\nRead more details here: ${release.link} #BigQuery #GoogleCloud`;
        }
    }
    
    tweetTextarea.value = text;
    updateCharCount();
}

// Update char counter status
function updateCharCount() {
    const len = getTweetLength(tweetTextarea.value);
    charCounter.textContent = `${len} / 280`;
    
    if (len > 280) {
        charCounter.style.color = '#EF4444'; // Red limit exceeded
        tweetBtn.disabled = true;
    } else {
        charCounter.style.color = 'var(--text-muted)';
        tweetBtn.disabled = false;
    }
}

// Post Tweet via Twitter Share Intent Link
function postTweet() {
    const text = tweetTextarea.value;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400,resizable=yes');
}

// Update Stats Badge Count
function updateStatsBadge() {
    const total = allReleases.length;
    if (total > 0) {
        statsText.textContent = `${total} release notes monitored`;
    } else {
        statsText.textContent = 'Monitoring releases...';
    }
}

// Error UI State
function showErrorState() {
    statsText.textContent = 'Connection Error';
    releasesList.innerHTML = `
        <div class="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" style="color: var(--badge-deprecate-text)">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h3>Failed to fetch release notes</h3>
            <p>We couldn't connect to the Google Cloud Release notes feed. Check your connection and try again.</p>
        </div>
    `;
}

// Initialize theme state
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    
    if (savedTheme === 'light' || (!savedTheme && systemPrefersLight)) {
        document.body.classList.add('light-theme');
        const darkIcon = document.querySelector('.theme-icon-dark');
        const lightIcon = document.querySelector('.theme-icon-light');
        if (darkIcon && lightIcon) {
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        }
    }
}

// Toggle light/dark theme variables
function toggleTheme() {
    const isLightTheme = document.body.classList.toggle('light-theme');
    const darkIcon = document.querySelector('.theme-icon-dark');
    const lightIcon = document.querySelector('.theme-icon-light');
    
    if (isLightTheme) {
        if (darkIcon) darkIcon.classList.add('hidden');
        if (lightIcon) lightIcon.classList.remove('hidden');
        localStorage.setItem('theme', 'light');
    } else {
        if (darkIcon) darkIcon.classList.remove('hidden');
        if (lightIcon) lightIcon.classList.add('hidden');
        localStorage.setItem('theme', 'dark');
    }
}

// Export filtered releases data to CSV format
function exportToCSV() {
    if (filteredReleases.length === 0) {
        alert("No releases to export.");
        return;
    }
    
    const headers = ["Date", "Category", "Title", "Link", "Content"];
    
    const escapeCSV = (text) => {
        if (!text) return "";
        const cleanText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        return `"${cleanText.replace(/"/g, '""')}"`;
    };
    
    const rows = filteredReleases.map(release => {
        const date = formatDate(release.published);
        const cat = release.category;
        const title = escapeCSV(release.title);
        const link = escapeCSV(release.link);
        const content = escapeCSV(release.content);
        return [date, cat, title, link, content].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_releases_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Display visual toast notification helper
function showToast(message) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('visible'), 10);
    
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
