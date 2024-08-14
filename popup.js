import { pullAndSendBookmarks, sendToServer, getVisualizationData, checkServerStatus } from './bookmarkUtils.js';

function initializePopup() {
    const pullBookmarksBtn = document.getElementById('pullBookmarks');
    const refreshVisualizationBtn = document.getElementById('refreshVisualization');
    const regenerateOrganizationBtn = document.getElementById('regenerateOrganization');
    const statusMessage = document.getElementById('statusMessage');
    const bookmarkCountValue = document.getElementById('bookmarkCountValue');
    const visualizationContainer = document.getElementById('visualizationContainer');

    pullBookmarksBtn.addEventListener('click', pullBookmarks);
    refreshVisualizationBtn.addEventListener('click', refreshVisualization);
    regenerateOrganizationBtn.addEventListener('click', regenerateOrganization);

    // Set up collapsible sections
    const collapsibles = document.querySelectorAll('.collapsible');
    collapsibles.forEach(collapsible => {
        collapsible.addEventListener('click', function() {
            this.classList.toggle('active');
            const content = this.nextElementSibling;
            content.classList.toggle('show');
        });
    });

    async function pullBookmarks() {
        try {
            showStatus('Pulling bookmarks...');
            const result = await pullAndSendBookmarks((progress, count) => {
                showStatus(`Processed ${count} bookmarks (${Math.round(progress * 100)}%)`);
            });
            showStatus('Bookmarks pulled successfully!');
            await refreshVisualization();
        } catch (error) {
            console.error("Error pulling bookmarks:", error);
            showStatus(`Failed to pull bookmarks: ${error.message}`, true);
        }
    }

    async function refreshVisualization() {
        try {
            showStatus('Refreshing visualization...');
            const response = await getVisualizationData();
            console.log("Visualization data response:", response);
            
            if (response.success && response.visualization_data) {
                updateVisualization(response.visualization_data);
                const bookmarkCount = countBookmarks(response.visualization_data);
                updateBookmarkCount(bookmarkCount);
                showStatus('Visualization refreshed successfully!');
            } else {
                throw new Error(response.error || 'Invalid response from server');
            }
        } catch (error) {
            console.error("Error refreshing visualization:", error);
            showStatus(`Failed to refresh visualization: ${error.message}`, true);
        }
    }

    function updateVisualization(visualizationData) {
        console.log("Updating visualization with data:", visualizationData);
        visualizationContainer.innerHTML = '';
        if (typeof window.createVisualization === 'function') {
            window.createVisualization(visualizationData);
        } else {
            console.error('createVisualization function is not available');
            visualizationContainer.textContent = 'Visualization function not available';
        }
    }

    function countBookmarks(visualizationData) {
        console.log("Counting bookmarks from:", visualizationData);
        if (visualizationData.nodes) {
            return visualizationData.nodes.length;
        } else if (visualizationData.data) {
            try {
                const plotlyData = JSON.parse(visualizationData.data);
                // Assuming the first trace contains the bookmark data
                return plotlyData.data[0].x.length;
            } catch (error) {
                console.error("Error parsing visualization data for bookmark count:", error);
            }
        }
        return 0;
    }

    async function regenerateOrganization() {
        try {
            showStatus('Regenerating organization...');
            await waitForServerReady();
            const params = gatherParams();
            const result = await sendToServer('/bookmarks/update_params', params);
            if (result.success) {
                await refreshVisualization();
                showStatus('Organization regenerated successfully!');
            } else {
                showStatus('Failed to regenerate organization: ' + result.error, true);
            }
        } catch (error) {
            console.error("Error regenerating organization:", error);
            showStatus(`Failed to regenerate organization: ${error.message}`, true);
        }
    }

    function gatherParams() {
        const form = document.getElementById('organizationForm');
        const formData = new FormData(form);
        const params = {};
        for (let [key, value] of formData.entries()) {
            if (key === 'useLLMTagging') {
                params[key] = value === 'on';
            } else if (!isNaN(value) && value !== '') {
                params[key] = Number(value);
            } else {
                params[key] = value;
            }
        }
        return params;
    }

    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.style.color = isError ? 'red' : 'green';
        statusMessage.style.display = 'block';
    }

    function updateBookmarkCount(count) {
        bookmarkCountValue.textContent = count;
    }

    async function waitForServerReady() {
        while (true) {
            const status = await checkServerStatus();
            if (status === 'ready') {
                return;
            } else if (status === 'initializing') {
                showStatus('Server is initializing. Please wait...', false);
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
            } else {
                throw new Error('Server is not available');
            }
        }
    }

    // Initial visualization update when popup opens
    refreshVisualization().catch(error => {
        console.error("Error fetching initial data:", error);
        showStatus(`Failed to load initial data: ${error.message}`, true);
    });

    // Check server status on popup open
    checkServerStatus().then(status => {
        if (status === 'initializing') {
            showStatus('Server is initializing. Please wait...', false);
        } else if (status !== 'ready') {
            showStatus('Server is not available. Please try again later.', true);
        }
    }).catch(error => {
        showStatus(`Error connecting to server: ${error.message}`, true);
    });
}

// Initialize the popup when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePopup);
} else {
    initializePopup();
}