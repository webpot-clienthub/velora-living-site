<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

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

/**
 * Scan the velora_product directory and build product data from actual files.
 * This ensures products.json is always in sync with the filesystem.
 */
function scanProducts(string $productRoot, string $siteRoot): array {
    $data = [];
    $dirs = array_filter(glob($productRoot . '/*'), 'is_dir');
    sort($dirs, SORT_NATURAL | SORT_FLAG_CASE);

    $allowedExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

    foreach ($dirs as $dir) {
        $name = basename($dir);
        $key = slugify($name);
        $images = [];

        $files = array_filter(glob($dir . '/*'), 'is_file');
        sort($files, SORT_NATURAL | SORT_FLAG_CASE);

        foreach ($files as $file) {
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (!in_array($ext, $allowedExt, true)) {
                continue;
            }
            $rel = ltrim(str_replace($siteRoot, '', $file), DIRECTORY_SEPARATOR);
            $images[] = str_replace(DIRECTORY_SEPARATOR, '/', $rel);
        }

        // Include categories with at least one image
        if (count($images) > 0) {
            $data[$key] = [
                'name' => $name,
                'images' => $images
            ];
        }
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
    // Always do a fresh scan of the velora_product directory
    // This ensures new images added to storage are properly reflected
    $data = scanProducts($productRoot, $siteRoot);

    // If directories with images are found, update products.json and return the data
    if (count($data) > 0) {
        writeJson($productsPath, $data);
        echo json_encode($data);
        exit;
    }

    // If no products found in velora_product, try to return existing products.json
    $existing = readJson($productsPath);
    if (count($existing) > 0) {
        echo json_encode($existing);
        exit;
    }

    // Return empty object if nothing found
    echo json_encode((object)[]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require __DIR__ . '/_require_auth.php';
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
