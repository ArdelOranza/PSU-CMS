<?php
$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) { http_response_code(503); exit('Setup required: copy config.sample.php to config.php, set database credentials, import schema.sql, then open setup.php.'); }
$config = require $configFile;
try { $pdo = new PDO('mysql:host='.$config['db_host'].';dbname='.$config['db_name'].';charset=utf8mb4', $config['db_user'], $config['db_pass'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]); }
catch (Throwable $e) { http_response_code(503); exit('Cannot connect to MySQL. Check config.php and schema.sql.'); }

/* ── Security headers ─────────────────────────────────────────────────── */
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");

/* ── HTTPS detection: handles reverse proxies & IIS correctly ─────────── */
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || ($_SERVER['SERVER_PORT'] ?? null) == 443
    || !empty($config['force_https']);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params(['httponly'=>true, 'samesite'=>'Lax', 'secure'=>$isHttps]);
    session_start();
}

function h($v): string { return htmlspecialchars((string)$v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function slugify($s): string { $s = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $s), '-')); return $s ?: bin2hex(random_bytes(5)); }

/* ── admin_only: check auth + enforce 30-minute session timeout ───────── */
function admin_only(): void {
    if (empty($_SESSION['admin_id'])) { header('Location: admin.php'); exit; }
    $timeout = 1800; // 30 minutes
    if (isset($_SESSION['last_active']) && (time() - $_SESSION['last_active']) > $timeout) {
        $_SESSION = [];
        session_destroy();
        header('Location: admin.php?timeout=1'); exit;
    }
    $_SESSION['last_active'] = time();
}

function csrf(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32)); return $_SESSION['csrf']; }
function check_csrf(): void { if (!hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'] ?? '')) { http_response_code(400); exit('Invalid request token. Reload the page and try again.'); } }

/* ── Safe POST string extraction ──────────────────────────────────────── */
function post_str(string $key, int $max = 255): string {
    $v = $_POST[$key] ?? '';
    if (!is_string($v)) return '';
    return mb_substr(trim($v), 0, $max);
}

/* ── Validate rendered asset paths ───────────────────────────────────── */
function safe_asset_path(?string $path): ?string {
    if ($path === null || $path === '') return null;
    if (preg_match('#^uploads/(images|files)/[a-f0-9]+\.\w{2,5}$#', $path)) return $path;
    return null;
}

/* ── Upload file: re-encode images via GD to strip EXIF & polyglots ──── */
function upload_file(string $key, string $folder, array $types): ?array {
    if (empty($_FILES[$key]['name'])) return null;
    $f = $_FILES[$key];
    if ($f['error'] !== UPLOAD_ERR_OK || $f['size'] > 12 * 1024 * 1024) throw new RuntimeException('Upload failed or exceeds 12 MB.');
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    if (!isset($types[$mime])) throw new RuntimeException('This file type is not allowed.');
    $dir = __DIR__ . '/uploads/' . $folder;
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $ext = $types[$mime];
    $name = bin2hex(random_bytes(16)) . '.' . $ext;
    $dest = $dir . '/' . $name;

    /* Re-encode images via GD to strip EXIF metadata and polyglot payloads */
    if ($folder === 'images' && function_exists('imagecreatefromstring')) {
        $raw = file_get_contents($f['tmp_name']);
        if ($raw === false) throw new RuntimeException('Could not read uploaded file.');
        $img = @imagecreatefromstring($raw);
        if ($img === false) throw new RuntimeException('Image could not be decoded.');
        $saved = match ($ext) {
            'jpg'  => imagejpeg($img, $dest, 85),
            'png'  => imagepng($img, $dest, 6),
            'gif'  => imagegif($img, $dest),
            'webp' => imagewebp($img, $dest, 85),
            default => false,
        };
        imagedestroy($img);
        if (!$saved) throw new RuntimeException('Could not save uploaded image.');
    } else {
        if (!move_uploaded_file($f['tmp_name'], $dest)) throw new RuntimeException('Could not save uploaded file.');
    }

    return ['path' => 'uploads/' . $folder . '/' . $name, 'name' => basename($f['name'])];
}

/* ── Delete an upload from disk ───────────────────────────────────────── */
function delete_upload(?string $path): void {
    if ($path && preg_match('#^uploads/(images|files)/#', $path)) {
        $full = __DIR__ . '/' . $path;
        if (is_file($full)) @unlink($full);
    }
}

function site_header(string $title=''): void {
    global $config, $pdo;
    $site = $config['site_name'] ?? 'PSU Urdaneta CMS';
    $activeNav = null;
    if (basename($_SERVER['PHP_SELF'] ?? '') === 'index.php') {
        if (isset($_GET['contact'])) $activeNav = 'contact';
        elseif (isset($_GET['type'])) $activeNav = (string) $_GET['type'];
        elseif (isset($_GET['item'])) {
            $q = $pdo->prepare("SELECT type FROM content WHERE id=? AND status='published'");
            $q->execute([(int) $_GET['item']]);
            $itemType = $q->fetchColumn();
            $activeNav = $itemType === 'pages' ? 'home' : ($itemType ?: null);
        } elseif (!isset($_GET['q'])) $activeNav = 'home';
    }
    $bodyClass = basename($_SERVER['PHP_SELF'] ?? '') === 'admin.php' && empty($_SESSION['admin_id']) ? ' class="portal-login-page"' : '';
    $links = [
        'home'          => ['Home', 'index.php'],
        'news'          => ['News', 'index.php?type=news'],
        'announcements' => ['Announcements', 'index.php?type=announcements'],
        'events'        => ['Events', 'index.php?type=events'],
        'programs'      => ['Programs', 'index.php?type=programs'],
        'directory'     => ['Directory', 'index.php?type=directory'],
        'contact'       => ['Contact', 'index.php?contact=1'],
    ];
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'.h($title ? "$title | $site" : $site).'</title><link rel="stylesheet" href="assets/style.css?v=portal-clone2"></head><body'.$bodyClass.'><header class="top"><div class="portal-masthead"><a class="brand" href="index.php"><img class="psu-logo" src="assets/psu-logo.jpg" alt="Pangasinan State University logo"><span class="brand-copy"><strong>PANGASINAN STATE UNIVERSITY</strong><small>Urdaneta City Campus</small></span></a><span class="portal-title">CAMPUS PORTAL</span></div><nav>';
    foreach ($links as $key => [$label, $href]) {
        $current = $activeNav === $key ? ' class="current" aria-current="page"' : '';
        echo '<a href="'.h($href).'"'.$current.'>'.h($label).'</a>';
    }
    echo '</nav></header><main class="wrap">';
}
function site_footer(): void { echo '</main><footer class="footer">University Content Management System</footer></body></html>'; }
