<?php
declare(strict_types=1);

header('Content-Type: application/json');

$productsPath = __DIR__ . '/../data/products.json';
$productRoot = realpath(__DIR__ . '/../../velora_product');

if (!$productRoot) {
    http_response_code(500);
    echo json_encode(['error' => 'Product folder not found']);
    exit;
}

function slugify(string $name): string {
    $slug = strtolower(trim($name));
    $slug = preg_replace('/\s+/', '-', $slug);
    $slug = preg_replace('/[^a-z0-9\-]/', '', $slug);
    return $slug ?: 'category';
}

function scanProducts(string $productRoot, string $siteRoot): array {
    $data = [];
    $dirs = array_filter(glob($productRoot . '/*'), 'is_dir');
    sort($dirs, SORT_NATURAL | SORT_FLAG_CASE);

    foreach ($dirs as $dir) {
        $name = basename($dir);
        $key = slugify($name);
        $images = [];

        $files = array_filter(glob($dir . '/*'), 'is_file');
        sort($files, SORT_NATURAL | SORT_FLAG_CASE);

        foreach ($files as $file) {
            $rel = ltrim(str_replace($siteRoot, '', $file), DIRECTORY_SEPARATOR);
            $images[] = str_replace(DIRECTORY_SEPARATOR, '/', $rel);
        }

        $data[$key] = [
            'name' => $name,
            'images' => $images
        ];
    }

    return $data;
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

$siteRoot = realpath(__DIR__ . '/../..');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = scanProducts($productRoot, $siteRoot);
    writeJson($productsPath, $data);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }
    writeJson($productsPath, $data);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
