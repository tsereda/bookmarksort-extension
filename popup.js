import {
    pullAndSendBookmarks,
    getTopicTree,
    updateTopics,
    getScatterPlotData,
    getSunburstData,
    getBookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark
} from './bookmarkUtils.js';

// State management
let currentBookmarks = [];
let selectedBookmarkId = null;
let isFormActive = false;
let isEditMode = false;

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const bookmarkList = document.getElementById('bookmarkList');
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
    } catch (error) {
        console.error("Error generating topics:", error);
        showStatus(`Failed to generate topics: ${error.message}`, 'error');
    }
}

// Search Functionality
function setupSearchFunctionality() {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterBookmarks(searchTerm);
    });
}

// Filter bookmarks based on search term
function filterBookmarks(searchTerm) {
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

// Load bookmarks from the API
async function loadBookmarks() {
    try {
        showStatus('Loading bookmarks...', 'normal');
        
        // Show loading state
        bookmarkList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div>Loading bookmarks...</div>
            </div>
        `;
        
        // Fetch bookmarks
        const bookmarks = await getBookmarks();
        currentBookmarks = bookmarks;
        
        if (bookmarks.length === 0) {
            bookmarkList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <div class="empty-state-message">No bookmarks found</div>
                    <div>Add some bookmarks or pull them from your browser</div>
                    <button class="empty-state-action" id="emptyStatePullButton">Pull Bookmarks</button>
                </div>
            `;
            document.getElementById('emptyStatePullButton').addEventListener('click', pullBookmarks);
            clearStatus();
            return;
        }
        
        // Render bookmarks
        renderBookmarkList(bookmarks);
        clearStatus();
    } catch (error) {
        console.error("Error loading bookmarks:", error);
        showStatus(`Failed to load bookmarks: ${error.message}`, 'error');
        
        bookmarkList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-message">Error loading bookmarks</div>
                <div>${error.message}</div>
                <button class="empty-state-action" id="emptyStateRetryButton">Retry</button>
            </div>
        `;
        document.getElementById('emptyStateRetryButton').addEventListener('click', loadBookmarks);
    }
}

// Render the bookmark list
function renderBookmarkList(bookmarks) {
    bookmarkList.innerHTML = '';
    
    bookmarks.forEach(bookmark => {
        const bookmarkItem = document.createElement('li');
        bookmarkItem.className = 'bookmark-item';
        bookmarkItem.setAttribute('data-id', bookmark.id);
        
        const topicName = bookmark.topicName || `Topic ${bookmark.topic}`;
        const topicColor = bookmark.color || '#4a6da7';
        
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
    
    // If a bookmark was previously selected, try to reselect it
    if (selectedBookmarkId) {
        selectBookmark(selectedBookmarkId);
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
            tags: bookmarkTagsInput.value ? bookmarkTagsInput.value.split(',').map(tag => tag.trim()) : []
        };
        
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
        
        // Hide form and refresh bookmarks
        hideBookmarkForm();
        await loadBookmarks();
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
        
        // Reset selection and refresh bookmarks
        selectedBookmarkId = null;
        await loadBookmarks();
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