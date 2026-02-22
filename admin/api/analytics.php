<?php
declare(strict_types=1);

require __DIR__ . '/_require_auth.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$analyticsPath = __DIR__ . '/../data/analytics.json';

function readAnalytics(string $path): array {
    $defaults = [
        'chatButtonClicks' => 0,
        'updatedAt' => null,
    ];

    if (!file_exists($path)) {
        return $defaults;
    }

    $raw = file_get_contents($path);
    $decoded = json_decode($raw ?: '', true);
    if (!is_array($decoded)) {
        return $defaults;
    }

    $clicks = $decoded['chatButtonClicks'] ?? 0;
    if (!is_numeric($clicks) || (int)$clicks < 0) {
        $clicks = 0;
    }

    $updatedAt = $decoded['updatedAt'] ?? null;
    if (!is_string($updatedAt) && $updatedAt !== null) {
        $updatedAt = null;
    }

    return [
        'chatButtonClicks' => (int)$clicks,
        'updatedAt' => $updatedAt,
    ];
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

echo json_encode(readAnalytics($analyticsPath));
