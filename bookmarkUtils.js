const API_BASE_URL = 'http://localhost:5000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export async function getBookmarks() {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/bookmarks/`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        throw error;
    }
}

export async function addBookmark(bookmarkData) {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/bookmarks/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookmarkData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error adding bookmark:', error);
        throw error;
    }
}

export async function updateBookmark(bookmarkId, bookmarkData) {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/bookmarks/${bookmarkId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookmarkData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error updating bookmark ${bookmarkId}:`, error);
        throw error;
    }
}

export async function deleteBookmark(bookmarkId) {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/bookmarks/${bookmarkId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error deleting bookmark ${bookmarkId}:`, error);
        throw error;
    }
}

export async function getBookmarksByTopic(topicId) {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/topics/${topicId}/bookmarks`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching bookmarks for topic ${topicId}:`, error);
        throw error;
    }
}

export async function searchBookmarks(query) {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/search/?q=${encodeURIComponent(query)}`);
        return await response.json();
    } catch (error) {
        console.error('Error searching bookmarks:', error);
        throw error;
    }
}

export async function getTopic(topicId) {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/topics/${topicId}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching topic ${topicId}:`, error);
        throw error;
    }
}

export async function getBookmarksFromBrowser() {
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

export async function sendBookmarkToServer(bookmark) {
    const response = await fetchWithRetry(`${API_BASE_URL}/bookmarks/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title: bookmark.title,
            url: bookmark.url,
            tags: []
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return await response.json();
}

export async function sendToServer(bookmarks) {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/bookmarks/`, {
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
    } catch (error) {
        console.error('Error sending bookmarks to server:', error);
        throw error;
    }
}

export async function pullAndSendBookmarks(progressCallback) {
    const bookmarks = await getBookmarksFromBrowser();
    
    const results = [];
    for (let i = 0; i < bookmarks.length; i++) {
        try {
            const result = await sendBookmarkToServer(bookmarks[i]);
            results.push(result);
            if (progressCallback) {
                progressCallback((i + 1) / bookmarks.length, i + 1);
            }
        } catch (error) {
            console.error(`Error sending bookmark:`, error);
            results.push({
                success: false,
                error: error.message,
                bookmark: bookmarks[i]
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

export async function getTopicTree() {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/topics/tree_json`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching topic tree:', error);
        throw error;
    }
}

export async function updateTopics() {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/topics/`, {
            method: 'POST',
        });
        return await response.json();
    } catch (error) {
        console.error('Error updating topics:', error);
        throw error;
    }
}

export async function getScatterPlotData() {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/visualizations/scatter_plot`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching scatter plot data:', error);
        throw error;
    }
}

export async function getSunburstData() {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/visualizations/sunburst`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching sunburst data:', error);
        throw error;
    }
}

export async function generateEmbeddings(embeddingModel = 'all-MiniLM-L6-v2') {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/bookmarks/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embedding_model: embeddingModel
            }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error generating embeddings:', error);
        throw error;
    }
}

export async function regenerateTopicNames() {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/topics/regenerate-names`, {
            method: 'POST',
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error regenerating topic names:', error);
        throw error;
    }
}
