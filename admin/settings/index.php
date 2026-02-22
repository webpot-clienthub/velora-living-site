<?php
declare(strict_types=1);

require __DIR__ . '/../api/_session.php';

$user = $_SESSION['velora_admin_user'] ?? null;
if (!is_string($user) || $user === '') {
  $next = urlencode($_SERVER['REQUEST_URI'] ?? '/admin/settings/index.php');
  header("Location: /admin/login.html?next={$next}");
  exit;
}

$safeUser = htmlspecialchars($user, ENT_QUOTES, 'UTF-8');
$assetVersion = (string)max(
  @filemtime(__DIR__ . '/../panel-page.css') ?: 0,
  @filemtime(__DIR__ . '/../panel-common.js') ?: 0,
  @filemtime(__DIR__ . '/settings.js') ?: 0,
  @filemtime(__DIR__ . '/../auth.js') ?: 0
);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings - Velora Admin</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../panel-page.css?v=<?php echo urlencode($assetVersion); ?>">
</head>
<body>
  <div id="panel-container">
    <header class="panel-header-bar">
      <div class="panel-header-left">
        <a href="../index.php" class="back-link">&larr; Back to Dashboard</a>
        <h1>Settings</h1>
        <p class="panel-subtitle">Signed in as <?php echo $safeUser; ?></p>
      </div>
      <div class="panel-header-right">
        <button class="logout-btn" id="logout-btn" title="Logout">Logout</button>
        <button class="theme-toggle" id="theme-toggle" type="button" title="Toggle dark mode">Moon</button>
      </div>
    </header>

    <section class="tool-panel">
      <div class="tool-header">
        <h2>Website Settings</h2>
      </div>

      <form id="settings-form" class="settings-form">
        <label for="setting-whatsapp-number">WhatsApp Number</label>
        <input id="setting-whatsapp-number" name="whatsappNumber" type="text" required>

        <label for="setting-default-theme">Default Theme</label>
        <select id="setting-default-theme" name="defaultTheme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>

        <label for="setting-track-chat-clicks">Chat Click Tracking</label>
        <select id="setting-track-chat-clicks" name="trackChatClicks">
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>

        <button class="primary-btn" type="submit">Save Settings</button>
        <p class="status" id="settings-status" role="status" aria-live="polite"></p>
      </form>
    </section>
  </div>

  <script src="../auth.js?v=<?php echo urlencode($assetVersion); ?>"></script>
  <script src="../panel-common.js?v=<?php echo urlencode($assetVersion); ?>"></script>
  <script src="settings.js?v=<?php echo urlencode($assetVersion); ?>"></script>
</body>
</html>
