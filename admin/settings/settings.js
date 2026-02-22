const SETTINGS_STORAGE_KEY = 'velora-admin-settings';
const DEFAULT_SETTINGS = {
  whatsappNumber: '+91 95101 41167',
  defaultTheme: 'light',
  trackChatClicks: true
};

document.addEventListener('DOMContentLoaded', async () => {
  if (window.AUTH && AUTH.requireAuth) {
    await AUTH.requireAuth();
  }

  window.AdminPanelCommon.initializeTheme();
  window.AdminPanelCommon.setupCommonEvents();
  setupFormEvents();
  await loadSettings();
});

function setupFormEvents() {
  const form = document.getElementById('settings-form');
  if (!form) return;
  form.addEventListener('submit', saveSettings);
}

function sanitizeSettings(input) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...(input && typeof input === 'object' ? input : {})
  };

  return {
    whatsappNumber: String(merged.whatsappNumber || '').trim() || DEFAULT_SETTINGS.whatsappNumber,
    defaultTheme: merged.defaultTheme === 'dark' ? 'dark' : 'light',
    trackChatClicks: Boolean(merged.trackChatClicks)
  };
}

function populateSettingsForm(settings) {
  const numberInput = document.getElementById('setting-whatsapp-number');
  const themeSelect = document.getElementById('setting-default-theme');
  const trackingSelect = document.getElementById('setting-track-chat-clicks');

  if (numberInput) numberInput.value = settings.whatsappNumber;
  if (themeSelect) themeSelect.value = settings.defaultTheme;
  if (trackingSelect) trackingSelect.value = settings.trackChatClicks ? 'true' : 'false';
}

function setStatus(message, isError = false) {
  const el = document.getElementById('settings-status');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('error', isError);
}

function readLocalSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function writeLocalSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    // Ignore local storage errors.
  }
}

async function loadSettings() {
  try {
    const data = await window.AdminPanelCommon.fetchJson('settings.php');
    const settings = sanitizeSettings(data);
    populateSettingsForm(settings);
    writeLocalSettings(settings);
    setStatus('');
  } catch (error) {
    console.error('Failed to load settings:', error);
    const localSettings = sanitizeSettings(readLocalSettings() || DEFAULT_SETTINGS);
    populateSettingsForm(localSettings);
    setStatus('Using local settings (API unavailable).', true);
  }
}

async function saveSettings(event) {
  event.preventDefault();

  const numberInput = document.getElementById('setting-whatsapp-number');
  const themeSelect = document.getElementById('setting-default-theme');
  const trackingSelect = document.getElementById('setting-track-chat-clicks');

  const payload = sanitizeSettings({
    whatsappNumber: numberInput ? numberInput.value : DEFAULT_SETTINGS.whatsappNumber,
    defaultTheme: themeSelect ? themeSelect.value : DEFAULT_SETTINGS.defaultTheme,
    trackChatClicks: trackingSelect ? trackingSelect.value === 'true' : DEFAULT_SETTINGS.trackChatClicks
  });

  writeLocalSettings(payload);
  setStatus('Saving settings...');

  try {
    const response = await window.AdminPanelCommon.fetchJson('settings.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const settings = sanitizeSettings(response && response.settings ? response.settings : payload);
    populateSettingsForm(settings);
    writeLocalSettings(settings);
    setStatus('Settings saved successfully.');
  } catch (error) {
    console.error('Failed to save settings:', error);
    setStatus('Saved locally. API unavailable right now.', true);
  }
}
