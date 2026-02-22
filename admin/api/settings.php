<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$settingsPath = __DIR__ . '/../data/settings.json';
$defaults = [
    'whatsappNumber' => '+91 95101 41167',
    'defaultTheme' => 'light',
    'trackChatClicks' => true,
];

function sanitizeSettings(array $input, array $defaults): array {
    $number = trim((string)($input['whatsappNumber'] ?? $defaults['whatsappNumber']));
    if ($number === '') {
        $number = $defaults['whatsappNumber'];
    }

    $theme = strtolower(trim((string)($input['defaultTheme'] ?? $defaults['defaultTheme'])));
    if (!in_array($theme, ['light', 'dark'], true)) {
        $theme = $defaults['defaultTheme'];
    }

    $rawTrack = $input['trackChatClicks'] ?? $defaults['trackChatClicks'];
    $track = filter_var($rawTrack, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($track === null) {
        $track = (bool)$defaults['trackChatClicks'];
    }

    return [
        'whatsappNumber' => $number,
        'defaultTheme' => $theme,
        'trackChatClicks' => $track,
    ];
}

function readSettings(string $path, array $defaults): array {
    if (!file_exists($path)) {
        return $defaults;
    }

    $raw = file_get_contents($path);
    $decoded = json_decode($raw ?: '', true);
    if (!is_array($decoded)) {
        return $defaults;
    }

    return sanitizeSettings($decoded, $defaults);
}

function writeSettings(string $path, array $settings): void {
    $json = json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    file_put_contents($path, $json);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $settings = readSettings($settingsPath, $defaults);
    echo json_encode($settings);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require __DIR__ . '/_require_auth.php';

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '', true);
    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON payload']);
        exit;
    }

    $settings = sanitizeSettings($payload, $defaults);
    writeSettings($settingsPath, $settings);
    echo json_encode(['success' => true, 'settings' => $settings]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
