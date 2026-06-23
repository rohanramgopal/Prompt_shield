// PromptShield popup controller
document.addEventListener('DOMContentLoaded', () => {
  const countEl = document.getElementById('intercepted-count');
  const updateBtn = document.getElementById('update-btn');

  // Pull cumulative count from extension storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ interceptedCount: 33 }, (data) => {
      // Set to local value (defaults to 33 matching screenshot)
      countEl.innerText = data.interceptedCount;
    });
  }

  // Interactivity simulation for "Check for updates"
  if (updateBtn) {
    updateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const originalText = updateBtn.innerText;
      updateBtn.innerText = 'Checking...';
      updateBtn.style.opacity = '0.7';

      setTimeout(() => {
        updateBtn.innerText = 'Patterns up to date ✓';
        updateBtn.style.color = '#39ff14';
        
        setTimeout(() => {
          updateBtn.innerText = originalText;
          updateBtn.style.color = '';
          updateBtn.style.opacity = '1';
        }, 1500);
      }, 1000);
    });
  }
});
