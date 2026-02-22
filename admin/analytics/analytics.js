document.addEventListener('DOMContentLoaded', async () => {
  if (window.AUTH && AUTH.requireAuth) {
    await AUTH.requireAuth();
  }

  window.AdminPanelCommon.initializeTheme();
  window.AdminPanelCommon.setupCommonEvents();

  const refreshBtn = document.getElementById('refresh-analytics-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadAnalytics());
  }

  await loadAnalytics();
});

function formatTimestamp(value) {
  if (!value) return 'never';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'never';
  return parsed.toLocaleString();
}

function renderAnalytics(metrics) {
  const clicks = Number(metrics && metrics.chatButtonClicks) || 0;
  const updatedAt = formatTimestamp(metrics && metrics.updatedAt);

  const countEl = document.getElementById('chat-click-count');
  if (countEl) {
    countEl.textContent = String(clicks);
  }

  const updatedAtEl = document.getElementById('analytics-updated-at');
  if (updatedAtEl) {
    updatedAtEl.textContent = `Last updated: ${updatedAt}`;
  }
}

async function loadAnalytics() {
  try {
    const metrics = await window.AdminPanelCommon.fetchJson('analytics.php');
    renderAnalytics(metrics);
  } catch (error) {
    console.error('Failed to load analytics:', error);
    const updatedAtEl = document.getElementById('analytics-updated-at');
    if (updatedAtEl) {
      updatedAtEl.textContent = 'Could not load analytics';
    }
  }
}
