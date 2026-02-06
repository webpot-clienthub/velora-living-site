<?php
declare(strict_types=1);

header('Content-Type: application/json');

$productsPath = __DIR__ . '/../data/products.json';
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

function readJson(string $path): array {
    if (!file_exists($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function writeJson(string $path, array $data): void {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    file_put_contents($path, $json);
}

function safeName(string $name): string {
    return preg_replace('/[^a-zA-Z0-9._-]/', '_', $name);
}

$categoryKey = $_GET['category'] ?? '';
$products = readJson($productsPath);

if (!isset($products[$categoryKey])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid category']);
    exit;
}

$categoryName = $products[$categoryKey]['name'] ?? $categoryKey;
$destDir = $productRoot . DIRECTORY_SEPARATOR . $categoryName;

if (!is_dir($destDir)) {
    mkdir($destDir, 0775, true);
}

if (empty($_FILES['images'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No files uploaded']);
    exit;
}

$paths = [];
$count = count($_FILES['images']['name']);

for ($i = 0; $i < $count; $i++) {
    $tmp = $_FILES['images']['tmp_name'][$i];
    if (!is_uploaded_file($tmp)) {
        continue;
    }

    $name = safeName($_FILES['images']['name'][$i]);
    $filename = time() . '-' . $i . '-' . $name;
    $dest = $destDir . DIRECTORY_SEPARATOR . $filename;

    if (move_uploaded_file($tmp, $dest)) {
        $rel = ltrim(str_replace($siteRoot, '', $dest), DIRECTORY_SEPARATOR);
        $paths[] = str_replace(DIRECTORY_SEPARATOR, '/', $rel);
    }
}

echo json_encode(['paths' => $paths]);
