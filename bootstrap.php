<?php
$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) { http_response_code(503); exit('Setup required: copy config.sample.php to config.php, set database credentials, import schema.sql, then open setup.php.'); }
$config = require $configFile;
try { $pdo = new PDO('mysql:host='.$config['db_host'].';dbname='.$config['db_name'].';charset=utf8mb4', $config['db_user'], $config['db_pass'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]); }
catch (Throwable $e) { http_response_code(503); exit('Cannot connect to MySQL. Check config.php and schema.sql.'); }
if (session_status() !== PHP_SESSION_ACTIVE) { session_set_cookie_params(['httponly'=>true,'samesite'=>'Lax','secure'=>!empty($_SERVER['HTTPS'])]); session_start(); }
function h($v): string { return htmlspecialchars((string)$v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function slugify($s): string { $s = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $s), '-')); return $s ?: bin2hex(random_bytes(5)); }
function admin_only(): void { if (empty($_SESSION['admin_id'])) { header('Location: admin.php'); exit; } }
function csrf(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32)); return $_SESSION['csrf']; }
function check_csrf(): void { if (!hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'] ?? '')) { http_response_code(400); exit('Invalid request token. Reload the page and try again.'); } }
function upload_file(string $key, string $folder, array $types): ?array {
 if (empty($_FILES[$key]['name'])) return null;
 $f=$_FILES[$key]; if ($f['error']!==UPLOAD_ERR_OK || $f['size']>12*1024*1024) throw new RuntimeException('Upload failed or exceeds 12 MB.');
 $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']); if (!isset($types[$mime])) throw new RuntimeException('This file type is not allowed.');
 $dir=__DIR__.'/uploads/'.$folder; if(!is_dir($dir)) mkdir($dir,0755,true); $name=bin2hex(random_bytes(16)).'.'.$types[$mime]; if(!move_uploaded_file($f['tmp_name'],$dir.'/'.$name)) throw new RuntimeException('Could not save uploaded file.');
 return ['path'=>'uploads/'.$folder.'/'.$name,'name'=>basename($f['name'])];
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
        'home' => ['Home', 'index.php'],
        'news' => ['News', 'index.php?type=news'],
        'announcements' => ['Announcements', 'index.php?type=announcements'],
        'events' => ['Events', 'index.php?type=events'],
        'programs' => ['Programs', 'index.php?type=programs'],
        'directory' => ['Directory', 'index.php?type=directory'],
        'contact' => ['Contact', 'index.php?contact=1'],
    ];
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'.h($title ? "$title | $site" : $site).'</title><link rel="stylesheet" href="assets/style.css?v=portal-clone2"></head><body'.$bodyClass.'><header class="top"><div class="portal-masthead"><a class="brand" href="index.php"><img class="psu-logo" src="assets/psu-logo.jpg" alt="Pangasinan State University logo"><span class="brand-copy"><strong>PANGASINAN STATE UNIVERSITY</strong><small>Urdaneta City Campus</small></span></a><span class="portal-title">CAMPUS PORTAL</span></div><nav>';
    foreach ($links as $key => [$label, $href]) {
        $current = $activeNav === $key ? ' class="current" aria-current="page"' : '';
        echo '<a href="'.h($href).'"'.$current.'>'.h($label).'</a>';
    }
    echo '</nav></header><main class="wrap">';
}function site_footer(): void { echo '</main><footer class="footer">University Content Management System</footer></body></html>'; }
