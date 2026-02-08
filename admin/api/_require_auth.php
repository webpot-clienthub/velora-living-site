<?php
declare(strict_types=1);

require __DIR__ . '/_session.php';

header('Content-Type: application/json');

$user = $_SESSION['velora_admin_user'] ?? null;
if (!is_string($user) || $user === '') {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

