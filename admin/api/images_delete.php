<?php
declare(strict_types=1);

header('Content-Type: application/json');
require __DIR__ . '/_require_auth.php';

$productRoot = realpath(__DIR__ . '/../../velora_product');
$siteRoot = realpath(__DIR__ . '/../..');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!$productRoot || !$siteRoot) {
    http_response_code(500);
    echo json_encode(['error' => 'Product folder not found']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
$paths = is_array($payload['paths'] ?? null) ? $payload['paths'] : [];

foreach ($paths as $p) {
    if (!is_string($p)) {
        continue;
    }
    $abs = $siteRoot . DIRECTORY_SEPARATOR . ltrim(str_replace('/', DIRECTORY_SEPARATOR, $p), DIRECTORY_SEPARATOR);
    $real = realpath($abs);
    if ($real && strpos($real, $productRoot) === 0 && is_file($real)) {
        unlink($real);
    }
}

echo json_encode(['success' => true]);
