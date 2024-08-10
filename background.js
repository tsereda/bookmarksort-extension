import { getBookmarks, sendToServer } from './bookmarkUtils.js';

let organizedBookmarks = null;

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "previewOrganization") {
    previewOrganization().then((preview) => {
      sendResponse({success: true, preview: preview});
    }).catch((error) => {
      console.error("Error previewing organization:", error);
      sendResponse({success: false, error: error.message});
    });
    return true;
  } else if (request.action === "applyOrganization") {
    applyOrganization().then(() => {
      sendResponse({success: true});
    }).catch((error) => {
      console.error("Error applying organization:", error);
      sendResponse({success: false, error: error.message});
    });
    return true;
  }
});

async function previewOrganization() {
  try {
    const bookmarks = await getBookmarks();
    console.log("Retrieved bookmarks:", bookmarks);

    if (!bookmarks || bookmarks.length === 0) {
      throw new Error("No bookmarks found");
    }

    const response = await sendToServer(bookmarks);
    console.log("Received response from server:", response);

    if (!response || !response.success || !response.preview || typeof response.preview !== 'object') {
      throw new Error("Invalid response from server");
    }

    organizedBookmarks = response.preview;

    // Format the bookmarks for visualization
    const formattedBookmarks = {};
    for (const [topic, bookmarks] of Object.entries(organizedBookmarks)) {
      if (topic === 'success') continue;
      console.log(`Processing topic: ${topic}, bookmarks:`, bookmarks);
      if (!Array.isArray(bookmarks)) {
        console.error(`Bookmarks for topic ${topic} is not an array:`, bookmarks);
        formattedBookmarks[topic] = [];
        continue;
      }
      formattedBookmarks[topic] = bookmarks.map(b => ({
        url: b.url || 'unknown',
        title: b.title || 'Untitled',
        embedding: b.embedding || []
      }));
    }

    console.log("Formatted bookmarks:", formattedBookmarks);
    return formattedBookmarks;
  } catch (error) {
    console.error("Error in previewOrganization:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

async function applyOrganization() {
  if (!organizedBookmarks) {
    throw new Error("No organization preview available. Please organize bookmarks first.");
  }

  try {
    await updateBookmarkStructure(organizedBookmarks);
    organizedBookmarks = null; // Clear the preview after applying
    return { success: true };
  } catch (error) {
    console.error("Error in applyOrganization:", error);
    throw error;
  }
}

async function updateBookmarkStructure(organizedBookmarks) {
  const otherBookmarksId = await getOtherBookmarksId();

  for (const [topic, bookmarks] of Object.entries(organizedBookmarks)) {
    let topicFolder = await findOrCreateFolder(otherBookmarksId, topic);
    
    for (const bookmark of bookmarks) {
      await browser.bookmarks.create({
        parentId: topicFolder.id,
        title: bookmark.title,
        url: bookmark.url
      });
    }
  }
}

async function getOtherBookmarksId() {
  const otherBookmarks = await browser.bookmarks.search({title: "Other Bookmarks"});
  return otherBookmarks[0].id;
}

async function findOrCreateFolder(parentId, folderName) {
  const existingFolders = await browser.bookmarks.search({title: folderName});
  const existingFolder = existingFolders.find(folder => folder.parentId === parentId);
  
  if (existingFolder) {
    return existingFolder;
  } else {
    return await browser.bookmarks.create({
      parentId: parentId,
      title: folderName,
      type: "folder"
    });
  }
}