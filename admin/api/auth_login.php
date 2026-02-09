<?php
declare(strict_types=1);

require __DIR__ . '/_session.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

const ADMIN_USERNAME = 'Velora_Admin';
const ADMIN_PASSWORD = 'Bholu!!2026';

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

$username = is_array($payload) ? (string)($payload['username'] ?? '') : (string)($_POST['username'] ?? '');
$password = is_array($payload) ? (string)($payload['password'] ?? '') : (string)($_POST['password'] ?? '');

if (!hash_equals(ADMIN_USERNAME, $username) || !hash_equals(ADMIN_PASSWORD, $password)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'invalid_credentials']);
    exit;
}

session_regenerate_id(true);
$_SESSION['velora_admin_user'] = ADMIN_USERNAME;

echo json_encode(['success' => true, 'username' => ADMIN_USERNAME]);

