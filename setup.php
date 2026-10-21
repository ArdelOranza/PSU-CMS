<?php
require __DIR__.'/bootstrap.php';
$count = (int)$pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn();
$message = '';

/* ── Fix 3: Require setup_key, validate email, enforce password bounds ── */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $count === 0) {
    check_csrf();

    $name  = post_str('name', 120);
    $email = post_str('email', 190);
    $pass  = $_POST['password'] ?? '';
    if (!is_string($pass)) $pass = '';
    $key   = post_str('setup_key', 128);

    /* Fix 3: Setup key check */
    $configKey = $config['setup_key'] ?? '';
    if ($configKey === '' || !hash_equals($configKey, $key)) {
        $message = 'Invalid setup key. Set the setup_key value in config.php.';
    } elseif ($name === '') {
        $message = 'Name is required.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $message = 'Please enter a valid email address.';
    } elseif (strlen($pass) < 12) {
        $message = 'Use a password with at least 12 characters.';
    } elseif (strlen($pass) > 72) {
        $message = 'Password must not exceed 72 characters (bcrypt limit).';
    } else {
        try {
            $q = $pdo->prepare('INSERT INTO admins(name,email,password_hash) VALUES(?,?,?)');
            $q->execute([$name, $email, password_hash($pass, PASSWORD_DEFAULT)]);
            header('Location: admin.php?created=1'); exit;
        } catch (PDOException $e) {
            error_log('PSU-CMS setup error: ' . $e->getMessage());
            $message = 'Could not create the administrator account. Please check your input.';
        }
    }
}

site_header('Initial setup');
echo '<section class="hero"><span class="eyebrow">ONE TIME SETUP</span><h1>Create administrator</h1><p>This account manages campus content and feedback.</p></section>';

if ($count > 0) {
    echo '<div class="notice">An administrator already exists. <a href="admin.php">Go to sign in</a>.</div>';
} else {
    if ($message) echo '<div class="notice error">'.h($message).'</div>';
    echo '<form class="panel form narrow" method="post"><input type="hidden" name="csrf" value="'.h(csrf()).'"><label>Setup key (from config.php)<input name="setup_key" type="password" required></label><label>Full name<input name="name" required maxlength="120"></label><label>Email<input name="email" type="email" required maxlength="190"></label><label>Password (12–72 characters)<input name="password" type="password" minlength="12" maxlength="72" required></label><button>Create administrator</button></form>';
}
site_footer();
