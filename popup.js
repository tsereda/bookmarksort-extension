import {
    pullAndSendBookmarks,
    getHierarchicalTopics,
    getTopicTree,
    updateTopics
} from './bookmarkUtils.js';

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

    async function pullBookmarks() {
        try {
            showStatus('Pulling bookmarks...');
            const results = await pullAndSendBookmarks((progress, count) => {
                showStatus(`Processed ${count} bookmarks (${Math.round(progress * 100)}%)`);
            });
            
            const successCount = results.filter(result => result.success).length;
            const failCount = results.length - successCount;
            
            if (failCount > 0) {
                showStatus(`Pulled ${successCount} bookmarks successfully. ${failCount} bookmarks failed.`, failCount > 0);
            } else {
                showStatus('All bookmarks pulled successfully!');
            }
            
            await refreshVisualization();
        } catch (error) {
            console.error("Error pulling bookmarks:", error);
            showStatus(`Failed to pull bookmarks: ${error.message}`, true);
        }
    }

    async function refreshVisualization() {
        try {
            showStatus('Refreshing visualization...');
            const hierarchicalTopics = await getHierarchicalTopics();
            const topicTree = await getTopicTree();
            
            // Choose which visualization to display based on your preference
            updateVisualization(hierarchicalTopics); // or topicTree
            
            showStatus('Visualization refreshed successfully!');
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

    async function regenerateOrganization() {
        try {
            showStatus('Regenerating organization...');
            const result = await updateTopics();
            if (result.message) {
                await refreshVisualization();
                showStatus('Organization regenerated successfully!');
            } else {
                showStatus('Failed to regenerate organization', true);
            }
        } catch (error) {
            console.error("Error regenerating organization:", error);
            showStatus(`Failed to regenerate organization: ${error.message}`, true);
        }
    }

    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.style.color = isError ? 'red' : 'green';
        statusMessage.style.display = 'block';
    }

    // Initial visualization update when popup opens
    refreshVisualization().catch(error => {
        console.error("Error fetching initial data:", error);
        showStatus(`Failed to load initial data: ${error.message}`, true);
    });
}

// Initialize the popup when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePopup);
} else {
    initializePopup();
}