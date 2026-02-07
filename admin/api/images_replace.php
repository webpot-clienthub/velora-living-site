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

function safeName(string $name): string {
    return preg_replace('/[^a-zA-Z0-9._-]/', '_', $name);
}

function safeUnlink(string $path, string $productRoot): void {
    $abs = realpath($path);
    if (!$abs) {
        return;
    }
    if (strpos($abs, $productRoot) !== 0) {
        return;
    }
    if (is_file($abs)) {
        unlink($abs);
    }
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
    if (!mkdir($destDir, 0775, true) && !is_dir($destDir)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create category folder']);
        exit;
    }
}

if (empty($_FILES['image']) || !is_uploaded_file($_FILES['image']['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
    exit;
}

$prevPath = $_POST['prevPath'] ?? '';
if ($prevPath) {
    $prevAbs = $siteRoot . DIRECTORY_SEPARATOR . ltrim(str_replace('/', DIRECTORY_SEPARATOR, $prevPath), DIRECTORY_SEPARATOR);
    safeUnlink($prevAbs, $productRoot);
}

$name = safeName($_FILES['image']['name']);
$filename = time() . '-' . $name;
$dest = $destDir . DIRECTORY_SEPARATOR . $filename;

if (!move_uploaded_file($_FILES['image']['tmp_name'], $dest)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
    exit;
}

$rel = ltrim(str_replace($siteRoot, '', $dest), DIRECTORY_SEPARATOR);
echo json_encode(['path' => str_replace(DIRECTORY_SEPARATOR, '/', $rel)]);
