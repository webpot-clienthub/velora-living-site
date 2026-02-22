<?php
declare(strict_types=1);

require __DIR__ . '/api/_session.php';

$user = $_SESSION['velora_admin_user'] ?? null;
if (!is_string($user) || $user === '') {
  $next = urlencode($_SERVER['REQUEST_URI'] ?? '/admin/index.php');
  header("Location: /admin/login.html?next={$next}");
  exit;
}
$safeUser = htmlspecialchars($user, ENT_QUOTES, 'UTF-8');
$assetVersion = (string)max(
  @filemtime(__DIR__ . '/admin.css') ?: 0,
  @filemtime(__DIR__ . '/admin.js') ?: 0,
  @filemtime(__DIR__ . '/auth.js') ?: 0
);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - Velora Living</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="admin.css?v=<?php echo urlencode($assetVersion); ?>">
</head>
<body>
  <header class="admin-header">
    <div class="header-left">
      <h1>Velora Admin</h1>
      <p class="admin-subtitle">Signed in as <?php echo $safeUser; ?></p>
    </div>
    <div class="header-right">
      <button class="logout-btn" id="logout-btn" title="Logout">Logout</button>
      <button class="theme-toggle" id="theme-toggle" type="button" title="Toggle dark mode">Moon</button>
    </div>
  </header>

  <div id="admin-container">
    <h2>Dashboard</h2>

    <section class="dashboard-grid">
      <div class="dashboard-card">
        <div class="card-icon" aria-hidden="true">&#128247;</div>
        <h3>Product Images</h3>
        <p>Manage and upload product images</p>
        <a class="card-btn card-link" href="image-manager/index.php">Manage Images</a>
      </div>

      <div class="dashboard-card">
        <div class="card-icon" aria-hidden="true">&#128202;</div>
        <h3>Analytics</h3>
        <p>View chat button click counts and updates</p>
        <a class="card-btn card-link" href="analytics/index.php">Open Analytics</a>
      </div>

      <div class="dashboard-card">
        <div class="card-icon" aria-hidden="true">&#9881;</div>
        <h3>Settings</h3>
        <p>Website defaults and contact configuration</p>
        <a class="card-btn card-link" href="settings/index.php">Open Settings</a>
      </div>

      <div class="dashboard-card">
        <div class="card-icon" aria-hidden="true">&#128194;</div>
        <h3>ID Check</h3>
        <p>Browse image IDs with folder and image preview</p>
        <a class="card-btn card-link" href="id-check/index.php">Open ID Check</a>
      </div>
    </section>
  </div>

  <script src="auth.js?v=<?php echo urlencode($assetVersion); ?>"></script>
  <script src="admin.js?v=<?php echo urlencode($assetVersion); ?>"></script>
</body>
</html>
