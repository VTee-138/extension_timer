// Listen for commands defined in manifest.json
chrome.commands.onCommand.addListener((command, tab) => {
    // Forward the command to the active popup if it's open
    // This requires the popup to have a listener for chrome.runtime.onMessage
    chrome.runtime.sendMessage({ command: command }, (response) => {
        if (chrome.runtime.lastError) {
            // This error indicates the popup is not open.
            // You could potentially open it here if desired, but for now, we'll just log it.
            console.log("Popup not open to receive command.");
        }
    });
});

// Handle creating notifications requested by other scripts (like the popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'show-notification') {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: request.title,
            message: request.message,
            priority: 2
        });
        sendResponse({status: "Notification shown"});
    }
    return true; // Keep the message channel open for async response
});

// Fallback to open a new popup window if the user clicks the action icon
// and a popup isn't already open.
chrome.action.onClicked.addListener((tab) => {
    // Check if a popup is already open
    const views = chrome.extension.getViews({ type: "popup" });
    if (views.length === 0) {
        chrome.windows.create({
            url: 'popup.html',
            type: 'popup',
            width: 380,
            height: 550,
            // Position the window if desired
            // left: screen.width - 400,
            // top: 100
        });
    }
});