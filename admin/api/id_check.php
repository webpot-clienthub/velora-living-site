<?php
declare(strict_types=1);

require __DIR__ . '/_require_auth.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$productRoot = realpath(__DIR__ . '/../../velora_product');
$siteRoot = realpath(__DIR__ . '/../..');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!$productRoot || !$siteRoot) {
    http_response_code(500);
    echo json_encode(['error' => 'Product folder not found']);
    exit;
}

$allowedExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
$folders = [];
$dirs = array_filter(glob($productRoot . '/*'), 'is_dir');
sort($dirs, SORT_NATURAL | SORT_FLAG_CASE);

foreach ($dirs as $dir) {
    $folderName = basename($dir);
    $folderRel = ltrim(str_replace($siteRoot, '', $dir), DIRECTORY_SEPARATOR);
    $folderPath = str_replace(DIRECTORY_SEPARATOR, '/', $folderRel);

    $files = array_filter(glob($dir . '/*'), 'is_file');
    sort($files, SORT_NATURAL | SORT_FLAG_CASE);

    $images = [];
    foreach ($files as $file) {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExt, true)) {
            continue;
        }

        $fileName = basename($file);
        $imageId = pathinfo($fileName, PATHINFO_FILENAME);
        $fileRel = ltrim(str_replace($siteRoot, '', $file), DIRECTORY_SEPARATOR);

        $images[] = [
            'fileName' => $fileName,
            'imageId' => $imageId,
            'relativePath' => str_replace(DIRECTORY_SEPARATOR, '/', $fileRel),
        ];
    }

    $folders[] = [
        'folderName' => $folderName,
        'folderPath' => $folderPath,
        'count' => count($images),
        'images' => $images,
    ];
}

echo json_encode([
    'generatedAt' => gmdate('c'),
    'folders' => $folders,
]);
