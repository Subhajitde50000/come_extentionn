document.addEventListener('DOMContentLoaded', function() {
  // Initialize all components
  initDarkMode();
  initControls();
  loadSettings();
  setupEventListeners();
});

// Dark mode functionality
function initDarkMode() {
  const darkModeToggle = document.getElementById('dark_mode');
  
  // Check system preference
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Load saved preference or use system preference
  chrome.storage.sync.get(['darkMode'], (result) => {
    const isDarkMode = result.darkMode !== undefined ? result.darkMode : systemPrefersDark;
    
    darkModeToggle.checked = isDarkMode;
    applyDarkMode(isDarkMode);
  });
  
  // Listen for toggle changes
  darkModeToggle.addEventListener('change', (e) => {
    const isDarkMode = e.target.checked;
    applyDarkMode(isDarkMode);
    chrome.storage.sync.set({ darkMode: isDarkMode });
  });
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    chrome.storage.sync.get(['darkMode'], (result) => {
      // Only auto-switch if user hasn't manually set a preference
      if (result.darkMode === undefined) {
        const isDarkMode = e.matches;
        darkModeToggle.checked = isDarkMode;
        applyDarkMode(isDarkMode);
      }
    });
  });
}

function applyDarkMode(isDark) {
  document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

// Initialize form controls
function initControls() {
  const thresholdSlider = document.getElementById('threshold');
  const thresholdValue = document.getElementById('th_val');
  
  // Update threshold display
  thresholdSlider.addEventListener('input', function() {
    thresholdValue.textContent = parseFloat(this.value).toFixed(2);
  });
}

// Load saved settings
function loadSettings() {
  chrome.storage.sync.get([
    'useApi',
    'hfToken',
    'threshold',
    'enabledCategories'
  ], function(result) {
    // Load API toggle
    if (result.useApi !== undefined) {
      document.getElementById('use_api').checked = result.useApi;
    }
    
    // Load HF token
    if (result.hfToken) {
      document.getElementById('hf_token').value = result.hfToken;
    }
    
    // Load threshold
    if (result.threshold !== undefined) {
      const threshold = result.threshold;
      document.getElementById('threshold').value = threshold;
      document.getElementById('th_val').textContent = parseFloat(threshold).toFixed(2);
    }
    
    // Load enabled categories
    const enabledCategories = result.enabledCategories || [
      'misinformation', 'violence', 'sexual', 'politics', 'family-restricted'
    ];
    
    const categoryCheckboxes = document.querySelectorAll('[data-cat]');
    categoryCheckboxes.forEach(checkbox => {
      const category = checkbox.getAttribute('data-cat');
      checkbox.checked = enabledCategories.includes(category);
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  
  // Clear cache button
  document.getElementById('clearCacheBtn').addEventListener('click', clearCache);
  
  // Auto-save on changes
  const autoSaveElements = [
    'use_api',
    'hf_token',
    'threshold'
  ];
  
  autoSaveElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', debounce(saveSettings, 500));
    }
  });
  
  // Auto-save category changes
  const categoryCheckboxes = document.querySelectorAll('[data-cat]');
  categoryCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', debounce(saveSettings, 500));
  });
}

// Save all settings
function saveSettings() {
  const useApi = document.getElementById('use_api').checked;
  const hfToken = document.getElementById('hf_token').value.trim();
  const threshold = parseFloat(document.getElementById('threshold').value);
  
  // Get enabled categories
  const enabledCategories = [];
  const categoryCheckboxes = document.querySelectorAll('[data-cat]:checked');
  categoryCheckboxes.forEach(checkbox => {
    enabledCategories.push(checkbox.getAttribute('data-cat'));
  });
  
  // Save to storage
  chrome.storage.sync.set({
    useApi: useApi,
    hfToken: hfToken,
    threshold: threshold,
    enabledCategories: enabledCategories
  }, function() {
    // Visual feedback
    showSaveNotification();
    
    // Notify content script of changes
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'settingsUpdated',
          settings: {
            useApi: useApi,
            hfToken: hfToken,
            threshold: threshold,
            enabledCategories: enabledCategories
          }
        });
      }
    });
  });
}

// Clear cache
function clearCache() {
  chrome.storage.local.clear(function() {
    showClearNotification();
    
    // Notify content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'cacheCleared'
        });
      }
    });
  });
}

// Show save notification
function showSaveNotification() {
  const saveBtn = document.getElementById('saveBtn');
  const originalText = saveBtn.textContent;
  
  saveBtn.textContent = 'Saved!';
  saveBtn.style.backgroundColor = '#28a745';
  
  setTimeout(() => {
    saveBtn.textContent = originalText;
    saveBtn.style.backgroundColor = '';
  }, 1500);
}

// Show clear notification
function showClearNotification() {
  const clearBtn = document.getElementById('clearCacheBtn');
  const originalText = clearBtn.textContent;
  
  clearBtn.textContent = 'Cleared!';
  clearBtn.style.backgroundColor = '#28a745';
  
  setTimeout(() => {
    clearBtn.textContent = originalText;
    clearBtn.style.backgroundColor = '';
  }, 1500);
}

// Debounce function for auto-save
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Handle errors
window.addEventListener('error', function(e) {
  console.error('Popup error:', e.error);
});