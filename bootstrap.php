<?php
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    http_response_code(503);
    exit('Setup required: copy config.sample.php to config.php, set database credentials, import schema.sql, then open setup.php.');
}
$config = require $configFile;
const DUMMY_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

function is_https(): bool
{
    global $config;
    if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    if (!empty($config['trust_proxy_headers']) && !empty($_SERVER['HTTP_X_FORWARDED_PROTO'])) {
        $proto = strtolower(trim(explode(',', (string) $_SERVER['HTTP_X_FORWARDED_PROTO'])[0]));
        return $proto === 'https';
    }
    return false;
}

function send_security_headers(): void
{
    header_remove('X-Powered-By');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    header('Cross-Origin-Opener-Policy: same-origin');
    header('Cross-Origin-Resource-Policy: same-origin');
    header("Content-Security-Policy: default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'");
    if (is_https()) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}
send_security_headers();

function destroy_session(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'],
            'domain' => $params['domain'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'] ?? 'Lax',
        ]);
    }
    session_destroy();
}

set_exception_handler(function (Throwable $e): void {
    error_log('Unhandled ' . get_class($e) . ': ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: text/html; charset=utf-8');
    }
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Server error</title></head><body><h1>Something went wrong</h1><p>Please try again later.</p></body></html>';
    exit;
});

try {
    $pdo = new PDO('mysql:host=' . $config['db_host'] . ';dbname=' . $config['db_name'] . ';charset=utf8mb4', $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (Throwable $e) {
    http_response_code(503);
    exit('Cannot connect to MySQL. Check config.php and schema.sql.');
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

foreach ([$_GET, $_POST] as $source) {
    foreach ($source as $value) {
        if (!is_string($value)) {
            http_response_code(400);
            exit('Invalid request.');
        }
    }
}

function h($v): string
{
    return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function slugify($s): string
{
    $s = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', (string) $s), '-'));
    return $s ?: bin2hex(random_bytes(5));
}

function admin_only(): void
{
    if (empty($_SESSION['admin_id'])) {
        header('Location: admin.php');
        exit;
    }
    $timeout = (int) ($GLOBALS['config']['session_timeout'] ?? 7200);
    if ($timeout > 0 && !empty($_SESSION['last_seen']) && time() - (int) $_SESSION['last_seen'] > $timeout) {
        destroy_session();
        header('Location: admin.php?expired=1');
        exit;
    }
    $_SESSION['last_seen'] = time();
}

function csrf(): string
{
    if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_rotate(): void
{
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function check_csrf(): void
{
    $expected = $_SESSION['csrf'] ?? '';
    $provided = $_POST['csrf'] ?? '';
    if (!is_string($expected) || $expected === '' || !is_string($provided) || $provided === '' || !hash_equals($expected, $provided)) {
        http_response_code(400);
        exit('Invalid request token. Reload the page and try again.');
    }
}

function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        http_response_code(405);
        header('Allow: POST');
        exit('Method not allowed.');
    }
}

function upload_file(string $key, string $folder, array $types): ?array
{
    if (empty($_FILES[$key]['name'])) {
        return null;
    }
    $f = $_FILES[$key];
    if (!is_string($f['name'] ?? null) || !is_string($f['tmp_name'] ?? null) || !is_int($f['error'] ?? null) || !is_int($f['size'] ?? null)) {
        throw new RuntimeException('Invalid upload.');
    }
    if ($f['error'] !== UPLOAD_ERR_OK || $f['size'] > 12 * 1024 * 1024) {
        throw new RuntimeException('Upload failed or exceeds 12 MB.');
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    if (!is_string($mime) || !isset($types[$mime])) {
        throw new RuntimeException('This file type is not allowed.');
    }
    $dir = __DIR__ . '/uploads/' . $folder;
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Could not create the upload directory.');
    }
    $name = bin2hex(random_bytes(16)) . '.' . $types[$mime];
    if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) {
        throw new RuntimeException('Could not save uploaded file.');
    }
    $original = preg_replace('/[\x00-\x1F\x7F]/u', '', basename($f['name'])) ?? 'file';
    return ['path' => 'uploads/' . $folder . '/' . $name, 'name' => mb_substr($original, 0, 255)];
}

function safe_upload_path(?string $path, string $folder): ?string
{
    if ($path === null || $path === '') {
        return null;
    }
    $allowed = [
        'images' => ['jpg', 'png', 'gif', 'webp'],
        'files' => ['pdf', 'doc', 'docx', 'txt', 'zip'],
    ];
    if (!isset($allowed[$folder])) {
        return null;
    }
    $pattern = '#^uploads/' . preg_quote($folder, '#') . '/[a-f0-9]{32}\.(?:' . implode('|', $allowed[$folder]) . ')$#D';
    return preg_match($pattern, $path) === 1 ? $path : null;
}

function safe_file_name(?string $name): ?string
{
    if ($name === null || $name === '') {
        return null;
    }
    $name = preg_replace('/[\x00-\x1F\x7F]/u', '', basename($name)) ?? '';
    return $name === '' ? null : mb_substr($name, 0, 255);
}

function cleanup_upload(?string $path, string $folder): void
{
    $safe = safe_upload_path($path, $folder);
    if ($safe === null) {
        return;
    }
    $full = __DIR__ . '/' . $safe;
    if (is_file($full) && !@unlink($full)) {
        error_log('Could not remove upload: ' . $full);
    }
}

function cleanup_orphaned_upload(PDO $pdo, ?string $path, string $folder): void
{
    $safe = safe_upload_path($path, $folder);
    if ($safe === null) {
        return;
    }
    try {
        $q = $pdo->prepare('SELECT COUNT(*) FROM content WHERE image_path = ? OR file_path = ?');
        $q->execute([$safe, $safe]);
        if ((int) $q->fetchColumn() === 0) {
            cleanup_upload($safe, $folder);
        }
    } catch (Throwable $e) {
        error_log('Upload cleanup failed: ' . $e->getMessage());
    }
}

function client_ip(): string
{
    global $config;
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!empty($config['trust_proxy_headers']) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    }
    return substr(trim((string) $ip), 0, 45);
}

function login_is_throttled(PDO $pdo, string $email, string $ip): bool
{
    try {
        $q = $pdo->prepare('SELECT SUM(email = ?) AS email_count, SUM(ip = ?) AS ip_count FROM login_attempts WHERE attempted_at >= (NOW() - INTERVAL 15 MINUTE)');
        $q->execute([$email, $ip]);
        $row = $q->fetch() ?: [];
        return ((int) ($row['email_count'] ?? 0) >= 5) || ((int) ($row['ip_count'] ?? 0) >= 20);
    } catch (Throwable $e) {
        error_log('Login throttle unavailable: ' . $e->getMessage());
        return false;
    }
}

function record_login_failure(PDO $pdo, string $email, string $ip): void
{
    try {
        $q = $pdo->prepare('INSERT INTO login_attempts (email, ip) VALUES (?, ?)');
        $q->execute([$email, $ip]);
        $pdo->exec('DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL 1 DAY)');
    } catch (Throwable $e) {
        error_log('Could not record login failure: ' . $e->getMessage());
    }
}

function clear_login_failures(PDO $pdo, string $email): void
{
    try {
        $q = $pdo->prepare('DELETE FROM login_attempts WHERE email = ?');
        $q->execute([$email]);
    } catch (Throwable $e) {
        error_log('Could not clear login failures: ' . $e->getMessage());
    }
}

function security_log(string $event, array $context = []): void
{
    error_log($event . ' ' . json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

function site_header(string $title = ''): void
{
    global $config, $pdo;
    $site = $config['site_name'] ?? 'PSU Urdaneta CMS';
    $activeNav = null;
    if (basename($_SERVER['PHP_SELF'] ?? '') === 'index.php') {
        if (isset($_GET['contact'])) {
            $activeNav = 'contact';
        } elseif (isset($_GET['type'])) {
            $activeNav = (string) $_GET['type'];
        } elseif (isset($_GET['item'])) {
            $q = $pdo->prepare("SELECT type FROM content WHERE id=? AND status='published'");
            $q->execute([(int) $_GET['item']]);
            $itemType = $q->fetchColumn();
            $activeNav = $itemType === 'pages' ? 'home' : ($itemType ?: null);
        } elseif (!isset($_GET['q'])) {
            $activeNav = 'home';
        }
    }
    $bodyClass = basename($_SERVER['PHP_SELF'] ?? '') === 'admin.php' && empty($_SESSION['admin_id']) ? ' class="portal-login-page"' : '';
    $links = [
        'home' => ['Home', 'index.php'],
        'news' => ['News', 'index.php?type=news'],
        'announcements' => ['Announcements', 'index.php?type=announcements'],
        'events' => ['Events', 'index.php?type=events'],
        'programs' => ['Programs', 'index.php?type=programs'],
        'directory' => ['Directory', 'index.php?type=directory'],
        'contact' => ['Contact', 'index.php?contact=1'],
    ];
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . h($title ? "$title | $site" : $site) . '</title><link rel="stylesheet" href="assets/style.css?v=portal-clone2"></head><body' . $bodyClass . '><header class="top"><div class="portal-masthead"><a class="brand" href="index.php"><img class="psu-logo" src="assets/psu-logo.jpg" alt="Pangasinan State University logo"><span class="brand-copy"><strong>PANGASINAN STATE UNIVERSITY</strong><small>Urdaneta City Campus</small></span></a><span class="portal-title">CAMPUS PORTAL</span></div><nav>';
    foreach ($links as $key => [$label, $href]) {
        $current = $activeNav === $key ? ' class="current" aria-current="page"' : '';
        echo '<a href="' . h($href) . '"' . $current . '>' . h($label) . '</a>';
    }
    echo '</nav></header><main class="wrap">';
}

function site_footer(): void
{
    echo '</main><footer class="footer">University Content Management System</footer><script src="assets/app.js" defer></script></body></html>';
}
