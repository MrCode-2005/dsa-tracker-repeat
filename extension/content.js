// content.js
// Runs on https://leetcode.com/problems/*

let lastSyncedSlug = null;

function getProblemSlug() {
  const match = window.location.pathname.match(/\/problems\/([^\/]+)/);
  return match ? match[1] : null;
}

function checkSubmissionStatus() {
  // LeetCode's DOM changes frequently, but generally an accepted submission 
  // has an element containing "Accepted" in green text.
  // We'll look for standard success classes or text.
  
  const successElements = Array.from(document.querySelectorAll('span, div')).filter(el => {
    return el.textContent === 'Accepted' && window.getComputedStyle(el).color === 'rgb(44, 181, 93)'; // LeetCode's green color
  });

  // Alternative check: specifically for the newer LeetCode UI
  const isAccepted = successElements.length > 0 || document.querySelector('[data-e2e-locator="submission-result"]') === 'Accepted';

  if (isAccepted) {
    const slug = getProblemSlug();
    if (slug && slug !== lastSyncedSlug) {
      lastSyncedSlug = slug;
      console.log(`[Repeat Sync] Detected Accepted submission for: ${slug}`);
      
      // Send message to background script to perform the API call
      chrome.runtime.sendMessage({
        type: 'SUBMISSION_ACCEPTED',
        payload: { slug }
      });
    }
  }
}

// Watch for DOM changes since LeetCode is a Single Page Application
const observer = new MutationObserver(() => {
  checkSubmissionStatus();
});

observer.observe(document.body, { childList: true, subtree: true });

console.log('[Repeat Sync] Content script loaded on LeetCode.');
