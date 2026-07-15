// background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUBMISSION_ACCEPTED') {
    const { slug } = message.payload;
    
    // Retrieve configuration
    chrome.storage.sync.get(['userId', 'backendUrl'], async (result) => {
      const { userId, backendUrl } = result;
      
      if (!userId || !backendUrl) {
        console.error('[Repeat Sync] Missing User ID or Backend URL in settings.');
        return;
      }

      console.log(`[Repeat Sync] Syncing ${slug} to ${backendUrl}...`);

      try {
        const response = await fetch(`${backendUrl}/api/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            slug
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log(`[Repeat Sync] Successfully synced ${slug}!`);
        } else {
          console.error(`[Repeat Sync] Failed to sync:`, data.error || data);
        }
      } catch (error) {
        console.error(`[Repeat Sync] Network error during sync:`, error);
      }
    });
  }
});
