document.getElementById("downloadButton").addEventListener("click", () => {
  chrome.scripting.executeScript({
    target: { tabId: chrome.tabs.getCurrent().id },
    function: downloadAllImages,
  });
});

function downloadAllImages() {
  const imgElements = document.querySelectorAll("img");
  const imageUrls = Array.from(imgElements)
    .map((img) => img.src)
    .filter((src) => src !== "");

  if (imageUrls.length === 0) {
    alert("No images found on this page.");
    return;
  }

  // Function to get filename from URL
  function getFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.substring(pathname.lastIndexOf("/") + 1);
      return filename || "image"; // Provide a default if no filename
    } catch (error) {
      console.error("Invalid URL:", url);
      return "image";
    }
  }

  // Function to handle potential filename collisions (add counter)
  function generateUniqueFilename(filename, existingFilenames) {
    let uniqueFilename = filename;
    let counter = 1;
    while (existingFilenames.has(uniqueFilename)) {
      const nameParts = filename.split(".");
      const baseName = nameParts.slice(0, -1).join(".");
      const ext = nameParts.slice(-1)[0];
      uniqueFilename = `${baseName}_${counter}.${ext}`;
      counter++;
    }
    return uniqueFilename;
  }

  const existingFilenames = new Set();

  imageUrls.forEach((imageUrl) => {
    const filename = getFilenameFromUrl(imageUrl);
    const uniqueFilename = generateUniqueFilename(filename, existingFilenames);
    existingFilenames.add(uniqueFilename);

    chrome.runtime.sendMessage({
      action: "downloadImage",
      url: imageUrl,
      filename: uniqueFilename,
    });
  });
}

// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadImage") {
    chrome.downloads.download(
      {
        url: request.url,
        filename: request.filename,
        conflictAction: "uniquify", // Important for preventing overwrites
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("Download error:", chrome.runtime.lastError);
          alert(
            `Error downloading ${request.filename}: ${chrome.runtime.lastError.message}`
          );
        }
      }
    );
  }
});
