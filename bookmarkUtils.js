const API_BASE_URL = 'http://localhost:5000/bookmarks';  // Adjust this to your actual API URL
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export async function getBookmarks() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      const bookmarks = flattenBookmarks(bookmarkTreeNodes);
      resolve(bookmarks);
    });
  });
}

function flattenBookmarks(bookmarkNodes) {
  let bookmarks = [];
  for (const node of bookmarkNodes) {
    if (node.url) {
      bookmarks.push({ url: node.url, title: node.title });
    }
    if (node.children) {
      bookmarks = bookmarks.concat(flattenBookmarks(node.children));
    }
  }
  return bookmarks;
}

export async function pullAndSendBookmarks() {
  const bookmarks = await getBookmarks();
  const response = await fetch(`${API_BASE_URL}/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookmarks),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  try {
    const response = await fetch(url, options);
    if (response.status === 503 && retries > 0) {
      console.log(`Server not ready, retrying in ${RETRY_DELAY/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0 && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      console.log(`Network error, retrying in ${RETRY_DELAY/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export async function sendToServer(bookmarks) {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookmarks),
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending bookmarks to server:', error);
    throw error;
  }
}

export async function getVisualizationData() {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/visualization`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching visualization data:', error);
    throw error;
  }
}

export async function applyOrganization(organizedBookmarks) {
  console.log('Applying organization:', organizedBookmarks);
  // Implementation for applying organization would go here
}

export async function checkServerStatus() {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL.replace('/bookmarks', '')}/status`);
    const data = await response.json();
    return data.status;
  } catch (error) {
    console.error('Error checking server status:', error);
    throw error;
  }
}