<?php
declare(strict_types=1);

require __DIR__ . '/_session.php';

header('Content-Type: application/json');

$user = $_SESSION['velora_admin_user'] ?? null;
if (is_string($user) && $user !== '') {
    echo json_encode(['authenticated' => true, 'username' => $user]);
    exit;
}

echo json_encode(['authenticated' => false]);

