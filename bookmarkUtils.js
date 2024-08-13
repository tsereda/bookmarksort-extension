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

async function sendBookmarkBatchToServer(bookmarks) {
  const response = await fetch(`${API_BASE_URL}/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bookmarks: bookmarks }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  return await response.json();
}

// This function can now be used for both single and batch operations
export async function pullAndSendBookmarks(progressCallback) {
  const bookmarks = await getBookmarks();
  
  const batchSize = 100; // Adjust based on your needs
  const batches = [];
  
  for (let i = 0; i < bookmarks.length; i += batchSize) {
    batches.push(bookmarks.slice(i, i + batchSize));
  }

  const results = [];
  for (let i = 0; i < batches.length; i++) {
    try {
      const batchResult = await sendBookmarkBatchToServer(batches[i]);
      results.push(batchResult);
      if (progressCallback) {
        progressCallback((i + 1) / batches.length, (i + 1) * batchSize);
      }
    } catch (error) {
      console.error(`Error sending bookmark batch:`, error);
      results.push({
        success: false,
        errors: batches[i].map(b => ({ url: b.url, error: error.message }))
      });
    }
  }

  return results;
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