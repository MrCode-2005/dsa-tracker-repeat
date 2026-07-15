document.addEventListener('DOMContentLoaded', () => {
  const userIdInput = document.getElementById('userId');
  const backendUrlInput = document.getElementById('backendUrl');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  // Load existing settings
  chrome.storage.sync.get(['userId', 'backendUrl'], (result) => {
    if (result.userId) userIdInput.value = result.userId;
    if (result.backendUrl) {
      backendUrlInput.value = result.backendUrl;
    } else {
      backendUrlInput.value = 'http://localhost:3000'; // Default
    }
  });

  saveBtn.addEventListener('click', () => {
    const userId = userIdInput.value.trim();
    let backendUrl = backendUrlInput.value.trim();
    
    // clean trailing slash
    if (backendUrl.endsWith('/')) {
      backendUrl = backendUrl.slice(0, -1);
    }

    chrome.storage.sync.set({ userId, backendUrl }, () => {
      status.style.display = 'block';
      setTimeout(() => {
        status.style.display = 'none';
      }, 2000);
    });
  });
});
