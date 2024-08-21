import {
    pullAndSendBookmarks,
    getTopicTree,
    updateTopics,
    getScatterPlotData,
    getSunburstData
} from './bookmarkUtils.js';

function initializePopup() {
    const pullBookmarksBtn = document.getElementById('pullBookmarks');
    const refreshVisualizationBtn = document.getElementById('refreshVisualization');
    const regenerateOrganizationBtn = document.getElementById('regenerateOrganization');
    const statusMessage = document.getElementById('statusMessage');
    const bookmarkCountValue = document.getElementById('bookmarkCountValue');

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
            const scatterPlotData = await getScatterPlotData();
            const sunburstData = await getSunburstData();
            
            updateVisualization(scatterPlotData, sunburstData);
            
            showStatus('Visualization refreshed successfully!');
        } catch (error) {
            console.error("Error refreshing visualization:", error);
            showStatus(`Failed to refresh visualization: ${error.message}`, true);
        }
    }

    function updateVisualization(scatterPlotData, sunburstData) {
        console.log("Updating visualization with data:", { scatterPlotData, sunburstData });
        
        if (typeof window.createVisualization === 'function') {
            window.createVisualization(scatterPlotData, sunburstData);
        } else {
            console.error('createVisualization function is not available');
            document.getElementById('scatterPlotContainer').textContent = 'Scatter plot visualization not available';
            document.getElementById('sunburstContainer').textContent = 'Sunburst visualization not available';
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