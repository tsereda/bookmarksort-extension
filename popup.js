import {
    pullAndSendBookmarks,
    getTopicTree,
    updateTopics,
    getScatterPlotData,
    getSunburstData,
    getBookmarks,
    getBookmarksByTopic,
    addBookmark,
    updateBookmark,
    deleteBookmark
} from './bookmarkUtils.js';

// State management
let currentBookmarks = [];
let selectedBookmarkId = null;
let isFormActive = false;
let isEditMode = false;

// Navigation state
let navigationState = {
    currentView: 'topics', // 'topics' or 'bookmarks'
    currentPath: [],       // Path of topics from root
    currentTopicId: null,  // Current topic ID
    topicHierarchy: null,  // Cached topic hierarchy
};

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const bookmarkList = document.getElementById('bookmarkList');
const topicHierarchy = document.getElementById('topicHierarchy');
const bookmarkDetail = document.getElementById('bookmarkDetail');
const bookmarkForm = document.getElementById('bookmarkForm');
const statusMessage = document.getElementById('statusMessage');
const searchInput = document.getElementById('searchBookmarks');

// Action Buttons
const addBookmarkButton = document.getElementById('addBookmarkButton');
const pullBookmarksButton = document.getElementById('pullBookmarksButton');
const refreshButton = document.getElementById('refreshButton');
const cancelFormButton = document.getElementById('cancelFormButton');
const saveBookmarkButton = document.getElementById('saveBookmarkButton');

// Form Inputs
const bookmarkTitleInput = document.getElementById('bookmarkTitle');
const bookmarkUrlInput = document.getElementById('bookmarkUrl');
const bookmarkTagsInput = document.getElementById('bookmarkTags');
const bookmarkNotesInput = document.getElementById('bookmarkNotes');

// Initialize the popup
function initializePopup() {
    // Set up event listeners
    setupTabNavigation();
    setupActionButtons();
    setupSearchFunctionality();
    
    // Initialize hierarchy navigation
    initHierarchyNavigation();
    
    // Load initial data
    loadBookmarks();
    refreshVisualization();
}

// Tab Navigation
function setupTabNavigation() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabName}Tab`).classList.add('active');
        });
    });
}

// Action Buttons Setup
function setupActionButtons() {
    // Add Bookmark Button
    addBookmarkButton.addEventListener('click', () => {
        showBookmarkForm();
    });
    
    // Pull Bookmarks Button
    pullBookmarksButton.addEventListener('click', pullBookmarks);
    
    // Generate Topics Button
    const generateTopicsButton = document.getElementById('createTopicsButton');
    generateTopicsButton.addEventListener('click', generateTopics);
    
    // Refresh Button
    refreshButton.addEventListener('click', () => {
        loadBookmarks();
        refreshVisualization();
        initHierarchyNavigation();
    });
    
    // Cancel Form Button
    cancelFormButton.addEventListener('click', () => {
        hideBookmarkForm();
    });
    
    // Save Bookmark Button
    saveBookmarkButton.addEventListener('click', saveBookmark);
}

// Generate topics for bookmarks
async function generateTopics() {
    try {
        showStatus('Generating topics for bookmarks...', 'normal');
        
        const result = await updateTopics();
        
        if (result && result.message) {
            showStatus(result.message, 'success');
        } else {
            showStatus('Topics generated successfully!', 'success');
        }
        
        // Refresh data to show the new topics
        await loadBookmarks();
        await refreshVisualization();
        await initHierarchyNavigation();
    } catch (error) {
        console.error("Error generating topics:", error);
        showStatus(`Failed to generate topics: ${error.message}`, 'error');
    }
}

// Search Functionality
function setupSearchFunctionality() {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterItems(searchTerm);
    });
}

// Filter items based on search term
function filterItems(searchTerm) {
    if (navigationState.currentView === 'topics') {
        // Filter topics
        const topicItems = topicHierarchy.querySelectorAll('.topic-item');
        
        topicItems.forEach(item => {
            const name = item.querySelector('.topic-name').textContent.toLowerCase();
            
            if (name.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    } else {
        // Filter bookmarks
        const bookmarkItems = bookmarkList.querySelectorAll('.bookmark-item');
        
        bookmarkItems.forEach(item => {
            const title = item.querySelector('.bookmark-title').textContent.toLowerCase();
            const url = item.querySelector('.bookmark-url').textContent.toLowerCase();
            const topic = item.querySelector('.bookmark-topic')?.textContent.toLowerCase() || '';
            
            if (title.includes(searchTerm) || url.includes(searchTerm) || topic.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
}

// Initialize hierarchy navigation
async function initHierarchyNavigation() {
    try {
        showStatus('Loading topic hierarchy...', 'normal');
        
        // Show loading state
        topicHierarchy.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div>Loading topics...</div>
            </div>
        `;
        
        // Get the topic hierarchy
        const topicTree = await getTopicTree();
        navigationState.topicHierarchy = topicTree;
        
        // Set up breadcrumb root event listener
        document.querySelector('.breadcrumb-item').addEventListener('click', () => navigateToRoot());
        
        // Render the root topics
        renderTopics(topicTree.children || []);
        
        clearStatus();
    } catch (error) {
        console.error("Error initializing hierarchy navigation:", error);
        showStatus(`Failed to load topic hierarchy: ${error.message}`, "error");
        
        topicHierarchy.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-message">Error loading topics</div>
                <div>${error.message}</div>
                <button class="empty-state-action" id="retryTopicsButton">Retry</button>
            </div>
        `;
        document.getElementById('retryTopicsButton').addEventListener('click', initHierarchyNavigation);
    }
}

// Render topics at the current level
function renderTopics(topics) {
    // Show topics, hide bookmarks
    topicHierarchy.classList.add('active');
    bookmarkList.classList.remove('active');
    navigationState.currentView = 'topics';
    
    // Clear existing topics
    topicHierarchy.innerHTML = '';
    
    if (!topics || topics.length === 0) {
        topicHierarchy.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <div class="empty-state-message">No topics found</div>
                <div>Create topics to organize your bookmarks</div>
                <button class="empty-state-action" id="emptyStateCreateTopics">Create Topics</button>
            </div>
        `;
        document.getElementById('emptyStateCreateTopics').addEventListener('click', generateTopics);
        return;
    }
    
    // Add each topic
    topics.forEach(topic => {
        const topicItem = document.createElement('div');
        topicItem.className = 'topic-item';
        topicItem.setAttribute('data-topic-id', topic.id);
        
        const hasChildren = topic.children && topic.children.length > 0;
        const bookmarkCount = calculateTopicBookmarkCount(topic);
        
        topicItem.innerHTML = `
            <div class="topic-icon">
                <i class="folder-icon">📁</i>
            </div>
            <div class="topic-name">${escapeHTML(topic.name)}</div>
            <div class="topic-count">${bookmarkCount}</div>
            ${hasChildren ? '<div class="topic-chevron">›</div>' : ''}
        `;
        
        topicItem.addEventListener('click', () => {
            if (hasChildren) {
                navigateToTopic(topic);
            } else {
                showBookmarksForTopic(topic);
            }
        });
        
        topicHierarchy.appendChild(topicItem);
    });
    
    // Update breadcrumbs
    updateBreadcrumbs();
}

// Show bookmarks for a specific topic
async function showBookmarksForTopic(topic) {
    try {
        // Update navigation state
        navigationState.currentView = 'bookmarks';
        navigationState.currentTopicId = topic.id;
        
        // Add this topic to the path if not already there
        if (!navigationState.currentPath.find(p => p.id === topic.id)) {
            navigationState.currentPath.push(topic);
        }
        
        // Update breadcrumbs
        updateBreadcrumbs();
        
        // Show loading state
        bookmarkList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div>Loading bookmarks...</div>
            </div>
        `;
        
        // Get bookmarks for this topic
        const bookmarks = await getBookmarksByTopic(topic.id);
        
        // Hide topics, show bookmarks
        topicHierarchy.classList.remove('active');
        bookmarkList.classList.add('active');
        
        // Clear existing bookmarks
        bookmarkList.innerHTML = '';
        
        // Add back button
        const backButton = document.createElement('div');
        backButton.className = 'back-button';
        backButton.innerHTML = `
            <div class="back-button-icon">←</div>
            <div class="back-button-text">Back to Topics</div>
        `;
        backButton.addEventListener('click', () => {
            // Go back to topics view
            navigationState.currentView = 'topics';
            renderTopics(findCurrentTopicParent().children || []);
        });
        bookmarkList.appendChild(backButton);
        
        // Add bookmarks
        if (bookmarks.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="empty-state-icon">🔖</div>
                <div class="empty-state-message">No bookmarks in this topic</div>
                <div>Add bookmarks to this topic</div>
            `;
            bookmarkList.appendChild(emptyState);
        } else {
            currentBookmarks = bookmarks;
            
            bookmarks.forEach(bookmark => {
                const bookmarkItem = document.createElement('li');
                bookmarkItem.className = 'bookmark-item';
                bookmarkItem.setAttribute('data-id', bookmark.id);
                
                const topicName = bookmark.topicName || topic.name;
                const topicColor = bookmark.color || topic.color || '#4a6da7';
                
                bookmarkItem.innerHTML = `
                    <div class="bookmark-title">${escapeHTML(bookmark.title)}</div>
                    <div class="bookmark-url">${escapeHTML(bookmark.url)}</div>
                    <div class="bookmark-topic" style="background-color: ${topicColor}20; color: ${topicColor}">${escapeHTML(topicName)}</div>
                `;
                
                bookmarkItem.addEventListener('click', () => {
                    selectBookmark(bookmark.id);
                });
                
                bookmarkList.appendChild(bookmarkItem);
            });
        }
    } catch (error) {
        console.error("Error showing bookmarks for topic:", error);
        showStatus(`Failed to load bookmarks for topic: ${error.message}`, "error");
        
        bookmarkList.innerHTML = `
            <div class="back-button">
                <div class="back-button-icon">←</div>
                <div class="back-button-text">Back to Topics</div>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-message">Error loading bookmarks</div>
                <div>${error.message}</div>
                <button class="empty-state-action" id="retryBookmarksButton">Retry</button>
            </div>
        `;
        document.querySelector('.back-button').addEventListener('click', () => {
            navigationState.currentView = 'topics';
            renderTopics(findCurrentTopicParent().children || []);
        });
        document.getElementById('retryBookmarksButton').addEventListener('click', () => showBookmarksForTopic(topic));
    }
}

// Navigate to a topic
function navigateToTopic(topic) {
    // Update navigation state
    navigationState.currentPath.push(topic);
    navigationState.currentTopicId = topic.id;
    
    // Render the topic's children
    renderTopics(topic.children || []);
}

// Navigate to the root level
function navigateToRoot() {
    // Reset navigation state
    navigationState.currentPath = [];
    navigationState.currentTopicId = null;
    
    // Render the root topics
    renderTopics(navigationState.topicHierarchy.children || []);
}

// Update breadcrumb navigation
function updateBreadcrumbs() {
    const breadcrumbsEl = document.getElementById('activeBreadcrumbs');
    breadcrumbsEl.innerHTML = '';
    
    navigationState.currentPath.forEach((topic, index) => {
        const breadcrumb = document.createElement('button');
        breadcrumb.className = 'breadcrumb-item';
        if (index === navigationState.currentPath.length - 1) {
            breadcrumb.classList.add('active');
        }
        breadcrumb.textContent = topic.name;
        
        breadcrumb.addEventListener('click', () => {
            // Navigate to this topic level
            navigationState.currentPath = navigationState.currentPath.slice(0, index + 1);
            navigationState.currentTopicId = topic.id;
            
            if (navigationState.currentView === 'bookmarks') {
                showBookmarksForTopic(topic);
            } else {
                if (index === 0) {
                    renderTopics(navigationState.topicHierarchy.children || []);
                } else {
                    const parent = navigationState.currentPath[index - 1];
                    renderTopics(parent.children || []);
                }
            }
        });
        
        breadcrumbsEl.appendChild(breadcrumb);
    });
}

// Find the parent of the current topic
function findCurrentTopicParent() {
    if (navigationState.currentPath.length <= 1) {
        return navigationState.topicHierarchy;
    }
    
    return navigationState.currentPath[navigationState.currentPath.length - 2];
}

// Calculate total bookmark count for a topic (including children)
function calculateTopicBookmarkCount(topic) {
    let count = topic.bookmarkCount || 0;
    
    if (topic.children && topic.children.length > 0) {
        topic.children.forEach(child => {
            count += calculateTopicBookmarkCount(child);
        });
    }
    
    return count;
}

// Load bookmarks from the API
async function loadBookmarks() {
    try {
        showStatus('Loading bookmarks...', 'normal');
        
        // Fetch bookmarks
        const bookmarks = await getBookmarks();
        currentBookmarks = bookmarks;
        
        clearStatus();
        return bookmarks;
    } catch (error) {
        console.error("Error loading bookmarks:", error);
        showStatus(`Failed to load bookmarks: ${error.message}`, 'error');
        return [];
    }
}

// Select a bookmark to display its details
function selectBookmark(bookmarkId) {
    // Update UI selection state
    const bookmarkItems = bookmarkList.querySelectorAll('.bookmark-item');
    bookmarkItems.forEach(item => {
        if (item.getAttribute('data-id') == bookmarkId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Update state
    selectedBookmarkId = bookmarkId;
    
    // Find the selected bookmark
    const bookmark = currentBookmarks.find(b => b.id == bookmarkId);
    
    if (!bookmark) {
        console.error("Bookmark not found:", bookmarkId);
        return;
    }
    
    // Render the bookmark details
    renderBookmarkDetails(bookmark);
}

// Render bookmark details
function renderBookmarkDetails(bookmark) {
    if (!bookmark) {
        bookmarkDetail.innerHTML = `
            <div class="no-bookmark-selected">
                Select a bookmark to view details
            </div>
        `;
        return;
    }
    
    const topicName = bookmark.topicName || `Topic ${bookmark.topic}`;
    const topicColor = bookmark.color || '#4a6da7';
    
    bookmarkDetail.innerHTML = `
        <div class="detail-header">
            <h2 class="detail-title">${escapeHTML(bookmark.title)}</h2>
            <a href="${escapeHTML(bookmark.url)}" class="detail-url" target="_blank">${escapeHTML(bookmark.url)}</a>
            <div class="detail-topic" style="background-color: ${topicColor}20; color: ${topicColor}">${escapeHTML(topicName)}</div>
            <div class="detail-actions">
                <button id="editBookmarkButton">Edit</button>
                <button id="openBookmarkButton">Open</button>
                <button id="deleteBookmarkButton" class="danger">Delete</button>
            </div>
        </div>
        <div class="detail-content">
            ${bookmark.tags && bookmark.tags.length > 0 ? `
                <div class="tag-section">
                    <h3>Tags</h3>
                    <div class="tag-list">
                        ${bookmark.tags.map(tag => `<div class="tag">${escapeHTML(tag)}</div>`).join('')}
                    </div>
                </div>
            ` : ''}
            ${bookmark.notes ? `
                <div class="notes-section">
                    <h3>Notes</h3>
                    <div class="notes-content">${escapeHTML(bookmark.notes)}</div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Set up detail view action buttons
    document.getElementById('editBookmarkButton').addEventListener('click', () => {
        showBookmarkForm(bookmark);
    });
    
    document.getElementById('openBookmarkButton').addEventListener('click', () => {
        window.open(bookmark.url, '_blank');
    });
    
    document.getElementById('deleteBookmarkButton').addEventListener('click', () => {
        confirmDeleteBookmark(bookmark);
    });
}

// Show bookmark form (for adding or editing)
function showBookmarkForm(bookmark = null) {
    // Hide detail view and show form
    bookmarkDetail.style.display = 'none';
    bookmarkForm.classList.add('active');
    isFormActive = true;
    
    // Set form mode (add or edit)
    isEditMode = !!bookmark;
    document.getElementById('formTitle').textContent = isEditMode ? 'Edit Bookmark' : 'Add New Bookmark';
    
    // Fill form with bookmark data if editing
    if (isEditMode) {
        bookmarkTitleInput.value = bookmark.title || '';
        bookmarkUrlInput.value = bookmark.url || '';
        bookmarkTagsInput.value = bookmark.tags ? bookmark.tags.join(', ') : '';
        bookmarkNotesInput.value = bookmark.notes || '';
        
        // Store the bookmark ID for update
        bookmarkForm.setAttribute('data-bookmark-id', bookmark.id);
    } else {
        // Clear form for new bookmark
        bookmarkTitleInput.value = '';
        bookmarkUrlInput.value = '';
        bookmarkTagsInput.value = '';
        bookmarkNotesInput.value = '';
        bookmarkForm.removeAttribute('data-bookmark-id');
    }
    
    // Focus the title input
    bookmarkTitleInput.focus();
}

// Hide bookmark form
function hideBookmarkForm() {
    bookmarkForm.classList.remove('active');
    bookmarkDetail.style.display = 'flex';
    isFormActive = false;
    
    // Clear form data
    bookmarkTitleInput.value = '';
    bookmarkUrlInput.value = '';
    bookmarkTagsInput.value = '';
    bookmarkNotesInput.value = '';
}

// Save bookmark (add new or update existing)
async function saveBookmark() {
    // Validate form
    if (!bookmarkTitleInput.value.trim() || !bookmarkUrlInput.value.trim()) {
        showStatus('Title and URL are required', 'error');
        return;
    }
    
    try {
        // Create bookmark data object
        const bookmarkData = {
            title: bookmarkTitleInput.value.trim(),
            url: bookmarkUrlInput.value.trim(),
            tags: bookmarkTagsInput.value ? bookmarkTagsInput.value.split(',').map(tag => tag.trim()) : [],
            notes: bookmarkNotesInput.value.trim()
        };
        
        // Add current topic if viewing a topic
        if (navigationState.currentTopicId) {
            bookmarkData.topic = navigationState.currentTopicId;
        }
        
        if (isEditMode) {
            // Update existing bookmark
            const bookmarkId = bookmarkForm.getAttribute('data-bookmark-id');
            showStatus('Updating bookmark...', 'normal');
            
            await updateBookmark(bookmarkId, bookmarkData);
            showStatus('Bookmark updated successfully', 'success');
        } else {
            // Add new bookmark
            showStatus('Adding bookmark...', 'normal');
            
            await addBookmark(bookmarkData);
            showStatus('Bookmark added successfully', 'success');
        }
        
        // Hide form and refresh
        hideBookmarkForm();
        
        // If we're in a topic, refresh that topic's bookmarks
        if (navigationState.currentView === 'bookmarks' && navigationState.currentTopicId) {
            const currentTopic = navigationState.currentPath[navigationState.currentPath.length - 1];
            await showBookmarksForTopic(currentTopic);
        } else {
            // Otherwise, refresh all bookmarks
            await loadBookmarks();
        }
    } catch (error) {
        console.error("Error saving bookmark:", error);
        showStatus(`Failed to save bookmark: ${error.message}`, 'error');
    }
}

// Confirm and delete bookmark
function confirmDeleteBookmark(bookmark) {
    if (confirm(`Are you sure you want to delete "${bookmark.title}"?`)) {
        deleteBookmarkById(bookmark.id);
    }
}

// Delete bookmark by ID
async function deleteBookmarkById(bookmarkId) {
    try {
        showStatus('Deleting bookmark...', 'normal');
        
        await deleteBookmark(bookmarkId);
        
        showStatus('Bookmark deleted successfully', 'success');
        
        // Reset selection
        selectedBookmarkId = null;
        
        // If we're in a topic, refresh that topic's bookmarks
        if (navigationState.currentView === 'bookmarks' && navigationState.currentTopicId) {
            const currentTopic = navigationState.currentPath[navigationState.currentPath.length - 1];
            await showBookmarksForTopic(currentTopic);
        } else {
            // Otherwise, refresh all bookmarks
            await loadBookmarks();
        }
        
        // Show "no bookmark selected" in detail view
        renderBookmarkDetails(null);
    } catch (error) {
        console.error("Error deleting bookmark:", error);
        showStatus(`Failed to delete bookmark: ${error.message}`, 'error');
    }
}

// Pull bookmarks from browser
async function pullBookmarks() {
    try {
        showStatus('Pulling bookmarks from browser...', 'normal');
        
        const results = await pullAndSendBookmarks((progress, count) => {
            showStatus(`Processed ${count} bookmarks (${Math.round(progress * 100)}%)`, 'normal');
        });
        
        const successCount = results.filter(result => result.success).length;
        const failCount = results.length - successCount;
        
        if (failCount > 0) {
            showStatus(`Pulled ${successCount} bookmarks successfully. ${failCount} bookmarks failed.`, 'warning');
        } else {
            showStatus('All bookmarks pulled successfully!', 'success');
        }
        
        // Refresh data
        await loadBookmarks();
        await refreshVisualization();
        await initHierarchyNavigation();
    } catch (error) {
        console.error("Error pulling bookmarks:", error);
        showStatus(`Failed to pull bookmarks: ${error.message}`, 'error');
    }
}

// Refresh visualizations
async function refreshVisualization() {
    try {
        showStatus('Refreshing visualizations...', 'normal');
        
        const scatterPlotData = await getScatterPlotData();
        const sunburstData = await getSunburstData();
        
        if (typeof window.createVisualization === 'function') {
            window.createVisualization(scatterPlotData, sunburstData);
            showStatus('Visualizations refreshed successfully!', 'success');
        } else {
            console.error('createVisualization function is not available');
            showStatus('Failed to refresh visualizations: Visualization function not available', 'error');
        }
    } catch (error) {
        console.error("Error refreshing visualizations:", error);
        showStatus(`Failed to refresh visualizations: ${error.message}`, 'error');
    }
}

// Show status message
function showStatus(message, type = 'normal') {
    statusMessage.textContent = message;
    statusMessage.className = '';
    
    if (type === 'error') {
        statusMessage.classList.add('error');
    } else if (type === 'warning') {
        statusMessage.classList.add('warning');
    } else if (type === 'success') {
        statusMessage.classList.add('success');
    }
    
    statusMessage.classList.add('active');
    
    // Clear status after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(clearStatus, 5000);
    }
}

// Clear status message
function clearStatus() {
    statusMessage.textContent = '';
    statusMessage.className = '';
}

// Helper function to escape HTML special characters
function escapeHTML(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Initialize the popup when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePopup);
} else {
    initializePopup();
}