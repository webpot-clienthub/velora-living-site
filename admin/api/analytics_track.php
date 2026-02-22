<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$analyticsPath = __DIR__ . '/../data/analytics.json';
$settingsPath = __DIR__ . '/../data/settings.json';

function isChatTrackingEnabled(string $settingsPath): bool {
    if (!file_exists($settingsPath)) {
        return true;
    }

    $raw = file_get_contents($settingsPath);
    $decoded = json_decode($raw ?: '', true);
    if (!is_array($decoded)) {
        return true;
    }

    $value = $decoded['trackChatClicks'] ?? true;
    $boolValue = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    return $boolValue !== false;
}

function incrementChatClicks(string $path): int {
    $handle = fopen($path, 'c+');
    if (!$handle) {
        return 0;
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        return 0;
    }

    $raw = stream_get_contents($handle);
    $decoded = json_decode($raw ?: '', true);
    if (!is_array($decoded)) {
        $decoded = [];
    }

    $current = $decoded['chatButtonClicks'] ?? 0;
    if (!is_numeric($current) || (int)$current < 0) {
        $current = 0;
    }

    $next = (int)$current + 1;
    $payload = [
        'chatButtonClicks' => $next,
        'updatedAt' => gmdate('c'),
    ];

    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, (string)json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    return $next;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!isChatTrackingEnabled($settingsPath)) {
    echo json_encode(['success' => true, 'tracked' => false]);
    exit;
}

$count = incrementChatClicks($analyticsPath);
if ($count <= 0) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to persist analytics']);
    exit;
}

echo json_encode(['success' => true, 'tracked' => true, 'chatButtonClicks' => $count]);
