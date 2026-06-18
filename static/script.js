// App State
let allReleases = [];
let filteredReleases = [];
let selectedRelease = null;
let currentFilter = 'all';
let searchQuery = '';

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

// Page Load Setup
document.addEventListener('DOMContentLoaded', () => {
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
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="date-badge">${formatDate(release.published)}</span>
                    <span class="cat-badge ${release.category}">${catLabel}</span>
                </div>
            </div>
            <h3>${release.title}</h3>
            <div class="card-excerpt">${plainText}</div>
        `;
        
        card.addEventListener('click', () => selectRelease(release, card));
        releasesList.appendChild(card);
    });
}

// Handle release card selection
function selectRelease(release, cardElement) {
    selectedRelease = release;
    
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
    
    // Check constraint size limit
    if (text.length > 280) {
        // Try truncating title
        const remainingSpace = 280 - (text.length - cleanTitle.length) - 3;
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
    const len = tweetTextarea.value.length;
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
