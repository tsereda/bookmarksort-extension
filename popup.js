import { getBookmarks, sendToServer, getVisualizationData, applyOrganization, checkServerStatus, pullAndSendBookmarks } from './bookmarkUtils.js';


function initializePopup() {
  const applyButton = document.getElementById('applyOrganization');
  const organizeResult = document.getElementById('organizeResult');
  const visualizationContainer = document.getElementById('visualizationContainer');
  const statusMessage = document.getElementById('statusMessage');

  function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
    if (isError) {
      statusMessage.classList.add('bg-red-100', 'text-red-800');
    } else {
      statusMessage.classList.add('bg-green-100', 'text-green-800');
    }
    statusMessage.style.display = 'block';
  }

  function hideStatus() {
    statusMessage.style.display = 'none';
  }

  const pullBookmarksButton = document.getElementById('pullBookmarks');
  pullBookmarksButton.addEventListener('click', async () => {
    try {
      showStatus('Pulling bookmarks...');
      await pullAndSendBookmarks((progress, count) => {
        showStatus(`Processed ${count} bookmarks (${Math.round(progress * 100)}%)`);
      });
      showStatus('Bookmarks pulled and sent successfully!');
      await loadAndDisplayBookmarks(); // Refresh the visualization after pulling
    } catch (error) {
      console.error("Error pulling bookmarks:", error);
      showStatus(`Failed to pull bookmarks: ${error.message}`, true);
    }
  });

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

  async function loadAndDisplayBookmarks() {
    try {
      hideStatus();

      await waitForServerReady();

      const response = await fetch('http://localhost:5000/bookmarks/list');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const bookmarks = await response.json();

      await displayOrganizationPreview(bookmarks);
      organizeResult.style.display = 'block';
      showStatus('Bookmarks loaded successfully!');
    } catch (error) {
      console.error("Error loading bookmarks:", error);
      showStatus(`Failed to load bookmarks: ${error.message}`, true);
    }
  }

  async function applyBookmarkOrganization() {
    try {
      applyButton.disabled = true;
      applyButton.textContent = 'Applying...';
      hideStatus();

      await waitForServerReady();

      // Fetch the organized bookmarks from the server
      const response = await fetch('http://localhost:5000/bookmarks/list');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const organizedBookmarks = await response.json();

      // Apply the organization
      await applyOrganization(organizedBookmarks);

      showStatus("Bookmarks organized successfully!");
      organizeResult.style.display = 'none';
      visualizationContainer.innerHTML = '';
    } catch (error) {
      console.error("Error applying organization:", error);
      showStatus(`Failed to apply organization: ${error.message}`, true);
    } finally {
      applyButton.disabled = false;
      applyButton.textContent = 'Apply Organization';
    }
  }

  async function displayOrganizationPreview(bookmarks) {
    try {
      const visualizationData = await getVisualizationData();
      console.log("Visualization data received:", visualizationData);
      
      visualizationContainer.innerHTML = '';
      if (typeof d3 === 'undefined') {
        console.error('D3 library is not loaded');
        visualizationContainer.textContent = 'Visualization library not available';
        return;
      }
      if (typeof window.createVisualization === 'function') {
        window.createVisualization(visualizationData.visualization_data);
      } else {
        console.error('createVisualization function is not available');
        visualizationContainer.textContent = 'Visualization not available';
      }
      visualizationContainer.style.display = 'block';
    } catch (error) {
      console.error("Error displaying organization preview:", error);
      showStatus(`Failed to display preview: ${error.message}`, true);
    }
  }

  applyButton.addEventListener('click', applyBookmarkOrganization);

  // Load bookmarks automatically when the popup opens
  loadAndDisplayBookmarks();

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