<?php
declare(strict_types=1);

require __DIR__ . '/_session.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

unset($_SESSION['velora_admin_user']);

echo json_encode(['success' => true]);

