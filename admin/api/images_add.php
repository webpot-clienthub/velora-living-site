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
    if (!mkdir($destDir, 0775, true) && !is_dir($destDir)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create category folder']);
        exit;
    }
}

if (empty($_FILES['images'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No files uploaded']);
    exit;
}

$paths = [];
$fileSpec = $_FILES['images'];

// Support both `images[]` (array) and `images` (single file) inputs.
$names = $fileSpec['name'] ?? null;
$tmpNames = $fileSpec['tmp_name'] ?? null;
$errors = $fileSpec['error'] ?? null;

if (is_array($names)) {
    $count = count($names);
} elseif (is_string($names) && is_string($tmpNames)) {
    $count = 1;
    $names = [$names];
    $tmpNames = [$tmpNames];
    $errors = [is_int($errors) ? $errors : UPLOAD_ERR_OK];
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid upload payload']);
    exit;
}

for ($i = 0; $i < $count; $i++) {
    if (($errors[$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        continue;
    }

    $tmp = $tmpNames[$i] ?? '';
    if (!is_uploaded_file($tmp)) {
        continue;
    }

    $name = safeName($names[$i] ?? 'image');
    $filename = time() . '-' . $i . '-' . $name;
    $dest = $destDir . DIRECTORY_SEPARATOR . $filename;

    if (move_uploaded_file($tmp, $dest)) {
        $rel = ltrim(str_replace($siteRoot, '', $dest), DIRECTORY_SEPARATOR);
        $paths[] = str_replace(DIRECTORY_SEPARATOR, '/', $rel);
    }
}

if (count($paths) === 0) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save uploaded files']);
    exit;
}

echo json_encode(['paths' => $paths]);
