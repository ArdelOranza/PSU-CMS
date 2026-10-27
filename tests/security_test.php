<?php
declare(strict_types=1);

define('BASE_URL', getenv('PSU_TEST_BASE_URL') ?: 'http://127.0.0.1:8081');
define('DB_DSN', getenv('PSU_TEST_DSN') ?: '');
define('DB_USER', getenv('PSU_TEST_DB_USER') ?: 'root');
define('DB_PASS', getenv('PSU_TEST_DB_PASS') ?: '');
define('DB_NAME', getenv('PSU_TEST_DB') ?: 'psu_cms_test');
define('ADMIN_EMAIL', 'admin@example.test');
define('ADMIN_PASSWORD', 'CorrectHorseBattery12');

if (DB_DSN === '') {
    fwrite(STDERR, "Set PSU_TEST_DSN, for example: mysql:host=127.0.0.1;port=3306;charset=utf8mb4\n");
    exit(2);
}
if (!preg_match('/^[A-Za-z0-9_]+_test$/', DB_NAME)) {
    fwrite(STDERR, "Refusing to run: PSU_TEST_DB must contain only letters, numbers, and underscores, and end with _test.\n");
    exit(2);
}

$failures = 0;
$passes = 0;

function check(string $name, bool $ok, string $detail = ''): void
{
    global $failures, $passes;
    if ($ok) {
        $passes++;
        echo "PASS  $name\n";
    } else {
        $failures++;
        echo "FAIL  $name" . ($detail !== '' ? "  [$detail]" : '') . "\n";
    }
}

class Client
{
    private string $jar;

    public function __construct()
    {
        $jar = tempnam(sys_get_temp_dir(), 'psu_cookie_');
        if ($jar === false) {
            throw new RuntimeException('Cannot create cookie jar.');
        }
        $this->jar = $jar;
    }

    public function request(string $method, string $path, ?array $data = null): array
    {
        $ch = curl_init(BASE_URL . $path);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_COOKIEJAR => $this->jar,
            CURLOPT_COOKIEFILE => $this->jar,
            CURLOPT_TIMEOUT => 30,
        ];
        if ($data !== null) {
            $opts[CURLOPT_POST] = true;
            $opts[CURLOPT_POSTFIELDS] = http_build_query($data);
        } else {
            $opts[CURLOPT_HTTPGET] = true;
        }
        curl_setopt_array($ch, $opts);
        $raw = curl_exec($ch);
        if ($raw === false) {
            $error = curl_error($ch);
            curl_close($ch);
            return ['status' => 0, 'headers' => [], 'body' => '', 'error' => $error];
        }
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        curl_close($ch);

        $headerBlock = substr($raw, 0, $headerSize);
        $body = substr($raw, $headerSize);
        $headers = [];
        foreach (preg_split('/\r\n|\n|\r/', $headerBlock) as $line) {
            $pos = strpos($line, ':');
            if ($pos === false) {
                continue;
            }
            $key = strtolower(trim(substr($line, 0, $pos)));
            $value = trim(substr($line, $pos + 1));
            $headers[$key] = isset($headers[$key]) ? $headers[$key] . ', ' . $value : $value;
        }

        return ['status' => $status, 'headers' => $headers, 'body' => $body, 'error' => ''];
    }

    public function request_files(string $path, array $fields, array $files): array
    {
        $ch = curl_init(BASE_URL . $path);
        $post = $fields;
        foreach ($files as $key => $file) {
            $post[$key] = new CURLFile($file['path'], $file['type'], $file['name']);
        }
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_COOKIEJAR => $this->jar,
            CURLOPT_COOKIEFILE => $this->jar,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $post,
        ]);
        $raw = curl_exec($ch);
        if ($raw === false) {
            $error = curl_error($ch);
            curl_close($ch);
            return ['status' => 0, 'headers' => [], 'body' => '', 'error' => $error];
        }
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        curl_close($ch);

        $headerBlock = substr($raw, 0, $headerSize);
        $body = substr($raw, $headerSize);
        $headers = [];
        foreach (preg_split('/\r\n|\n|\r/', $headerBlock) as $line) {
            $pos = strpos($line, ':');
            if ($pos === false) {
                continue;
            }
            $key = strtolower(trim(substr($line, 0, $pos)));
            $value = trim(substr($line, $pos + 1));
            $headers[$key] = isset($headers[$key]) ? $headers[$key] . ', ' . $value : $value;
        }

        return ['status' => $status, 'headers' => $headers, 'body' => $body, 'error' => ''];
    }

    public function __destruct()
    {
        @unlink($this->jar);
    }
}

function csrf_from(string $body): ?string
{
    if (preg_match('/name="csrf" value="([a-f0-9]{32,})"/', $body, $matches)) {
        return $matches[1];
    }
    return null;
}

function db(): PDO
{
    return new PDO(DB_DSN, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
}

function reset_db(): void
{
    $pdo = db();
    $pdo->exec('DROP DATABASE IF EXISTS `' . DB_NAME . '`');
    $pdo->exec('CREATE DATABASE `' . DB_NAME . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $pdo->exec('USE `' . DB_NAME . '`');
    $schema = file_get_contents(dirname(__DIR__) . '/schema.sql');
    $schema = preg_replace('/CREATE DATABASE[^;]+;/i', '', $schema, 1);
    $schema = preg_replace('/USE[^;]+;/i', '', $schema, 1);
    foreach (explode(';', $schema) as $statement) {
        $statement = trim($statement);
        if ($statement !== '') {
            $pdo->exec($statement);
        }
    }
}

function seed_admin(): void
{
    $pdo = db();
    $pdo->exec('USE `' . DB_NAME . '`');
    $stmt = $pdo->prepare('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)');
    $stmt->execute(['Test Admin', ADMIN_EMAIL, password_hash(ADMIN_PASSWORD, PASSWORD_DEFAULT)]);
}

function login(Client $client, string $email = ADMIN_EMAIL, string $password = ADMIN_PASSWORD): array
{
    $page = $client->request('GET', '/admin.php');
    return $client->request('POST', '/admin.php', [
        'csrf' => csrf_from($page['body']),
        'login' => '1',
        'email' => $email,
        'password' => $password,
    ]);
}

function admin_csrf(Client $client): ?string
{
    $page = $client->request('GET', '/admin.php');
    return csrf_from($page['body']);
}

echo "PSU CMS security regression tests\n";
echo 'Base URL: ' . BASE_URL . "\n\n";

reset_db();

$client = new Client();
$response = $client->request('POST', '/setup.php', [
    'name' => 'Attacker',
    'email' => 'attacker@example.test',
    'password' => 'LongEnoughPassword123',
]);
check('setup rejects POST without CSRF token', $response['status'] === 400, 'got ' . $response['status']);

reset_db();
$client = new Client();
$response = $client->request('GET', '/setup.php');
$csrf = csrf_from($response['body']);
$response = $client->request('POST', '/setup.php', [
    'csrf' => $csrf,
    'name' => 'Setup Admin',
    'email' => 'setup@example.test',
    'password' => 'SetupPassword123',
]);
check('setup succeeds with a valid CSRF token', $response['status'] === 302, 'got ' . $response['status']);
$response = login($client, 'setup@example.test', 'SetupPassword123');
check('newly created admin can sign in', $response['status'] === 302, 'got ' . $response['status']);

reset_db();
seed_admin();

$client = new Client();
$response = $client->request('GET', '/index.php');
$headers = $response['headers'];
$csp = $headers['content-security-policy'] ?? '';
check('public page sends nosniff', strtolower($headers['x-content-type-options'] ?? '') === 'nosniff', 'missing');
check('public page sends frame protection', in_array(strtolower($headers['x-frame-options'] ?? ''), ['deny', 'sameorigin'], true), 'missing');
check('public page sends a CSP', $csp !== '', 'missing');
check('CSP blocks unsafe inline scripts', $csp !== '' && !str_contains($csp, "'unsafe-inline'"), 'unsafe-inline present or CSP missing');
check('public page sends referrer policy', isset($headers['referrer-policy']), 'missing');

$client = new Client();
$response = $client->request('GET', '/index.php?q[]=x');
check('array query parameter rejected with 400', $response['status'] === 400, 'got ' . $response['status']);
check('array query parameter does not leak a PHP error', !str_contains($response['body'], 'TypeError') && !str_contains($response['body'], 'Fatal error'), 'error text in body');

$client = new Client();
$response = $client->request('GET', '/admin.php');
check('admin login page is not cacheable', str_contains(strtolower($response['headers']['cache-control'] ?? ''), 'no-store'), 'missing');
check('admin login page is frame-protected', in_array(strtolower($response['headers']['x-frame-options'] ?? ''), ['deny', 'sameorigin'], true), 'missing');

$client = new Client();
$response = login($client);
check('valid login redirects', $response['status'] === 302, 'got ' . $response['status']);
$response = $client->request('GET', '/admin.php');
check('valid login reaches dashboard', $response['status'] === 200 && str_contains($response['body'], 'Content dashboard'), 'dashboard not found');

$response = $client->request('GET', '/admin.php?logout=1');
check('logout via GET is rejected', in_array($response['status'], [400, 405], true), 'got ' . $response['status']);
$response = $client->request('GET', '/admin.php');
check('GET logout does not destroy the session', $response['status'] === 200 && str_contains($response['body'], 'Content dashboard'), 'session was destroyed');

$csrf = csrf_from($response['body']);
$response = $client->request('POST', '/admin.php', ['csrf' => $csrf, 'logout' => '1']);
check('logout via POST redirects', $response['status'] === 302, 'got ' . $response['status']);
$response = $client->request('GET', '/admin.php');
check('POST logout destroys the session', $response['status'] === 200 && str_contains($response['body'], 'Login to PSU Portal'), 'still signed in');

$client = new Client();
login($client);
$csrf = admin_csrf($client);
$response = $client->request('POST', '/admin.php', [
    'csrf' => $csrf,
    'save' => '1',
    'id' => '0',
    'type' => 'documents',
    'title' => 'Security Test Document',
    'slug' => 'security-test-document',
    'summary' => 'Summary',
    'body' => 'Body',
    'old_image' => 'javascript:alert(1)',
    'old_file' => 'javascript:alert(2)',
    'old_file_name' => 'evil.html',
    'event_date' => '',
    'status' => 'published',
]);
check('content save with crafted old paths redirects normally', $response['status'] === 302, 'got ' . $response['status']);
$pdo = db();
$pdo->exec('USE `' . DB_NAME . '`');
$id = (int) $pdo->query("SELECT id FROM content WHERE slug='security-test-document' LIMIT 1")->fetchColumn();
$response = $client->request('GET', '/index.php?item=' . $id);
check('crafted javascript: file path is not rendered', $id > 0 && !str_contains($response['body'], 'javascript:alert'), 'javascript URL found');

$response = $client->request('GET', '/index.php?q=%25');
check('search escapes LIKE wildcards', !str_contains($response['body'], 'Security Test Document'), 'wildcard returned all content');

$client = new Client();
login($client);
$csrf = admin_csrf($client);
$png = tempnam(sys_get_temp_dir(), 'psu_png_');
file_put_contents($png, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='));
$response = $client->request_files('/admin.php', [
    'csrf' => $csrf,
    'save' => '1',
    'id' => '0',
    'type' => 'media',
    'title' => 'Upload Test',
    'slug' => 'upload-test',
    'summary' => 'Upload test',
    'body' => 'Upload test',
    'old_image' => '',
    'old_file' => '',
    'old_file_name' => '',
    'event_date' => '',
    'status' => 'published',
], [
    'image' => ['path' => $png, 'type' => 'image/png', 'name' => 'pixel.png'],
]);
check('valid image upload saves content', $response['status'] === 302, 'got ' . $response['status']);
$pdo = db();
$pdo->exec('USE `' . DB_NAME . '`');
$upload = $pdo->query("SELECT id, image_path FROM content WHERE slug='upload-test' LIMIT 1")->fetch();
$uploadPath = (string) ($upload['image_path'] ?? '');
check('uploaded image gets a safe random name', $upload && preg_match('#^uploads/images/[a-f0-9]{32}\.png$#', $uploadPath) === 1, 'bad path: ' . $uploadPath);
if ($upload) {
    $uploadFull = dirname(__DIR__) . '/' . $uploadPath;
    check('uploaded image exists on disk', is_file($uploadFull), 'missing file');
    check('uploaded image is re-encoded by GD', is_file($uploadFull) && sha1_file($uploadFull) !== sha1_file($png), 'stored bytes identical to fixture');
    $response = $client->request('POST', '/admin.php', ['csrf' => $csrf, 'delete' => '1', 'id' => $upload['id'], 'type' => 'media']);
    $deadline = microtime(true) + 2;
    clearstatcache(true, $uploadFull);
    while (is_file($uploadFull) && microtime(true) < $deadline) {
        usleep(50000);
        clearstatcache(true, $uploadFull);
    }
    check('deleting content removes the upload', $response['status'] === 302 && !is_file($uploadFull), 'status=' . $response['status'] . ' exists=' . (is_file($uploadFull) ? 'yes' : 'no'));

    $imagesBefore = count((array) glob(dirname(__DIR__) . '/uploads/images/*'));
    $response = $client->request_files('/admin.php', [
        'csrf' => $csrf,
        'save' => '1',
        'id' => '0',
        'type' => 'documents',
        'title' => 'Duplicate Upload',
        'slug' => 'security-test-document',
        'summary' => 'Duplicate',
        'body' => 'Duplicate',
        'old_image' => '',
        'old_file' => '',
        'old_file_name' => '',
        'event_date' => '',
        'status' => 'published',
    ], [
        'image' => ['path' => $png, 'type' => 'image/png', 'name' => 'duplicate.png'],
    ]);
    clearstatcache();
    $imagesAfter = count((array) glob(dirname(__DIR__) . '/uploads/images/*'));
    check('failed content save removes the new upload', $response['status'] === 200 && str_contains($response['body'], 'Could not save content') && $imagesAfter === $imagesBefore, 'status=' . $response['status'] . ' before=' . $imagesBefore . ' after=' . $imagesAfter);
}
@unlink($png);

$client = new Client();
$response = $client->request('POST', '/index.php', [
    'feedback' => '1',
    'name' => 'No Token',
    'email' => 'no-token@example.test',
    'subject' => 'No token',
    'message' => 'No token',
]);
check('feedback rejects POST without CSRF token', $response['status'] === 400, 'got ' . $response['status']);

$client = new Client();
$response = $client->request('GET', '/index.php?contact=1');
$csrf = csrf_from($response['body']);
$response = $client->request('POST', '/index.php', [
    'csrf' => $csrf,
    'feedback' => '1',
    'name' => 'Bad Email',
    'email' => 'not-an-email',
    'subject' => 'Bad email',
    'message' => 'Bad email',
]);
check('feedback rejects invalid email', in_array($response['status'], [400, 422], true), 'got ' . $response['status']);

$client = new Client();
$response = $client->request('GET', '/index.php?contact=1');
$csrf = csrf_from($response['body']);
$response = $client->request('POST', '/index.php', [
    'csrf' => $csrf,
    'feedback' => '1',
    'name' => 'Too Long',
    'email' => 'long@example.test',
    'subject' => 'Long',
    'message' => str_repeat('A', 70000),
]);
check('feedback rejects oversized message', in_array($response['status'], [400, 413, 422], true), 'got ' . $response['status']);

$client = new Client();
$response = $client->request('GET', '/index.php?contact=1');
$csrf = csrf_from($response['body']);
$data = [
    'csrf' => $csrf,
    'feedback' => '1',
    'name' => 'Rate Test',
    'email' => 'rate@example.test',
    'subject' => 'Rate test',
    'message' => 'Rate test',
];
$first = $client->request('POST', '/index.php', $data);
$second = $client->request('POST', '/index.php', $data);
check('first feedback submission succeeds', $first['status'] === 302, 'got ' . $first['status']);
check('second feedback submission is rate limited', $second['status'] === 429 || str_contains(strtolower($second['body']), 'too many'), 'got ' . $second['status']);

$client = new Client();
$response = $client->request('GET', '/admin.php');
$csrf = csrf_from($response['body']);
$last = null;
for ($i = 1; $i <= 6; $i++) {
    $last = $client->request('POST', '/admin.php', [
        'csrf' => $csrf,
        'login' => '1',
        'email' => 'nobody@example.test',
        'password' => 'WrongPassword' . $i,
    ]);
}
check('repeated failed logins are throttled', $last['status'] === 429 || str_contains(strtolower($last['body']), 'too many'), 'got ' . $last['status']);

$client = new Client();
$response = login($client);
check('valid admin login still works after throttle test', $response['status'] === 302, 'got ' . $response['status']);

/* ── Dashboard pagination ────────────────────────────────────────────── */
$pdo = db();
$pdo->exec('USE `' . DB_NAME . '`');
$stmt = $pdo->prepare("INSERT INTO content (type,title,slug,body,summary,status) VALUES ('news',?,?,'Body','Summary','published')");
for ($i = 1; $i <= 26; $i++) {
    $stmt->execute(['Pagination Test ' . $i, 'pagination-test-' . $i]);
}
$response = $client->request('GET', '/admin.php?type=news&ctp=2');
check('content list paginates', $response['status'] === 200 && str_contains($response['body'], 'pagination'), 'missing pager');
$pdo->exec("DELETE FROM content WHERE slug LIKE 'pagination-test-%'");

$stmt = $pdo->prepare("INSERT INTO feedback (name,email,subject,message) VALUES (?,?,?,?)");
for ($i = 1; $i <= 26; $i++) {
    $stmt->execute(['Paged ' . $i, 'paged' . $i . '@example.test', 'Subject', 'Message']);
}
$response = $client->request('GET', '/admin.php?view=feedback&fbp=2');
check('feedback view paginates', $response['status'] === 200 && str_contains($response['body'], 'pagination'), 'missing pager');
$pdo->exec("DELETE FROM feedback WHERE email LIKE 'paged%@example.test'");

/* ── Password change ─────────────────────────────────────────────────── */
$passClient = new Client();
login($passClient);
$response = $passClient->request('GET', '/admin.php?view=password');
check('password view is reachable', $response['status'] === 200 && str_contains($response['body'], 'Change password'), 'status ' . $response['status']);
$pwCsrf = admin_csrf($passClient);
$response = $passClient->request('POST', '/admin.php', [
    'csrf' => $pwCsrf,
    'change_password' => '1',
    'current_password' => 'WrongPassword',
    'new_password' => 'NewSecurePassphrase77',
]);
check('password change rejects wrong current password', $response['status'] === 200 && str_contains($response['body'], 'Current password is incorrect'), 'got ' . $response['status']);
$response = $passClient->request('POST', '/admin.php', [
    'csrf' => $pwCsrf,
    'change_password' => '1',
    'current_password' => ADMIN_PASSWORD,
    'new_password' => 'NewSecurePassphrase77',
]);
check('password change succeeds', $response['status'] === 302, 'got ' . $response['status']);
$hashRow = $pdo->query("SELECT password_hash FROM admins WHERE email='" . ADMIN_EMAIL . "'")->fetch();
check('password change updates the hash', is_array($hashRow) && password_verify('NewSecurePassphrase77', (string) $hashRow['password_hash']), 'hash unchanged');
$newClient = new Client();
$response = login($newClient, ADMIN_EMAIL, 'NewSecurePassphrase77');
check('login with new password works', $response['status'] === 302, 'got ' . $response['status']);
$oldClient = new Client();
$response = login($oldClient, ADMIN_EMAIL, ADMIN_PASSWORD);
check('old password is rejected', $response['status'] !== 302, 'still accepted');
$pwCsrf = admin_csrf($newClient);
$response = $newClient->request('POST', '/admin.php', [
    'csrf' => $pwCsrf,
    'change_password' => '1',
    'current_password' => 'NewSecurePassphrase77',
    'new_password' => ADMIN_PASSWORD,
]);
check('password restored for remaining tests', $response['status'] === 302, 'got ' . $response['status']);

echo "\n$passes passed, $failures failed\n";
exit($failures === 0 ? 0 : 1);
