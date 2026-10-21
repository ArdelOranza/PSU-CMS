<?php
require __DIR__.'/bootstrap.php';
$types=['pages'=>'Homepage / Pages','news'=>'News','announcements'=>'Announcements','events'=>'Events','colleges'=>'Colleges','departments'=>'Departments','programs'=>'Academic Programs','directory'=>'Faculty & Staff','documents'=>'Documents','media'=>'Media Library'];

/* ── CSRF-protected POST logout with full session teardown ───────────── */
if ($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['logout'])) {
    check_csrf();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    header('Location: admin.php'); exit;
}

/* ── Login handler ───────────────────────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['login'])) {
    check_csrf();
    $email    = post_str('email', 190);
    $password = $_POST['password'] ?? '';
    if (!is_string($password)) $password = '';

    /* Rate limiting: block after 5 failures in 15 minutes */
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $pdo->prepare("DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)")->execute();
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM login_attempts WHERE ip_address = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
    $stmt->execute([$ip]);
    $attempts = (int)$stmt->fetchColumn();

    if ($attempts >= 5) {
        $error = 'Too many login attempts. Please try again in 15 minutes.';
    } else {
        $q = $pdo->prepare('SELECT * FROM admins WHERE email=?');
        $q->execute([$email]);
        $a = $q->fetch();

        /* Timing-safe: always run password_verify */
        $dummyHash = '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';
        $hashToVerify  = $a['password_hash'] ?? $dummyHash;
        $passwordValid = password_verify($password, $hashToVerify) && $a;

        if ($passwordValid) {
            session_regenerate_id(true);
            $_SESSION['csrf']        = bin2hex(random_bytes(32)); /* Rotate CSRF token */
            $_SESSION['admin_id']    = $a['id'];
            $_SESSION['admin_name']  = $a['name'];
            $_SESSION['last_active'] = time();
            header('Location: admin.php'); exit;
        }
        $pdo->prepare("INSERT INTO login_attempts (ip_address, email) VALUES (?, ?)")->execute([$ip, $email]);
        $error = 'Email or password is incorrect.';
    }
}

if (empty($_SESSION['admin_id'])) {
    site_header('Admin login');
    if (isset($_GET['timeout'])) echo '<div class="notice error">Your session expired. Please sign in again.</div>';
    if (!empty($error)) echo '<div class="notice error">'.h($error).'</div>';
    echo '<section class="hero portal-hero"><span class="eyebrow">CONTENT MANAGEMENT PORTAL</span><h1>Login to PSU Portal</h1><p>Enter your email and password to manage campus content.</p></section>';
    echo '<form class="panel form narrow login-panel" method="post"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="login" value="1"><label>User Name / Email<input name="email" type="email" required></label><label>Password<input name="password" type="password" required></label><button>Sign in</button><p class="muted">First visit? <a href="setup.php">Create the initial administrator</a>.</p></form>';
    site_footer(); exit;
}
admin_only();

/* ── Password change ─────────────────────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['change_password'])) {
    check_csrf();
    $currentPass = $_POST['current_password'] ?? '';
    $newPass     = $_POST['new_password']     ?? '';
    if (!is_string($currentPass)) $currentPass = '';
    if (!is_string($newPass))     $newPass     = '';
    $q = $pdo->prepare('SELECT password_hash FROM admins WHERE id=?');
    $q->execute([$_SESSION['admin_id']]);
    $row = $q->fetch();
    if (!$row || !password_verify($currentPass, $row['password_hash'])) {
        $error = 'Current password is incorrect.';
    } elseif (strlen($newPass) < 12) {
        $error = 'New password must be at least 12 characters.';
    } elseif (strlen($newPass) > 72) {
        $error = 'New password must not exceed 72 characters.';
    } else {
        try {
            $pdo->prepare('UPDATE admins SET password_hash=? WHERE id=?')
                ->execute([password_hash($newPass, PASSWORD_DEFAULT), $_SESSION['admin_id']]);
            header('Location: admin.php?pw_changed=1'); exit;
        } catch (PDOException $e) {
            error_log('PSU-CMS pw-change error: ' . $e->getMessage());
            $error = 'Could not update password. Please try again.';
        }
    }
}

/* ── Save content ────────────────────────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['save'])) {
    check_csrf();
    try {
        $id      = (int)($_POST['id'] ?? 0);
        $type    = post_str('type', 40);
        if (!isset($types[$type])) throw new RuntimeException('Invalid content type.');
        $title   = post_str('title', 220);
        if ($title === '') throw new RuntimeException('Title is required.');
        $slug    = slugify(post_str('slug', 240) ?: $title);
        $summary = post_str('summary', 65535);
        $body    = post_str('body', 16777215);
        $event_date_raw = post_str('event_date', 25);
        $event_date = $event_date_raw ?: null;
        $status  = (post_str('status', 10) === 'published') ? 'published' : 'draft';

        $img  = upload_file('image', 'images', ['image/jpeg'=>'jpg','image/png'=>'png','image/gif'=>'gif','image/webp'=>'webp']);
        $file = upload_file('file',  'files',  ['application/pdf'=>'pdf','application/msword'=>'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document'=>'docx','text/plain'=>'txt','application/zip'=>'zip']);

        /* Fetch existing paths from DB — never trust $_POST for file paths */
        $old_image = null; $old_file = null; $old_file_name = null;
        if ($id > 0) {
            $existing = $pdo->prepare('SELECT image_path, file_path, file_name FROM content WHERE id=?');
            $existing->execute([$id]);
            $row = $existing->fetch();
            if ($row) { $old_image = $row['image_path']; $old_file = $row['file_path']; $old_file_name = $row['file_name']; }
        }

        $final_image     = $img['path']  ?? $old_image;
        $final_file      = $file['path'] ?? $old_file;
        $final_file_name = $file['name'] ?? $old_file_name;

        /* Unlink replaced uploads */
        if ($img  && $old_image) delete_upload($old_image);
        if ($file && $old_file)  delete_upload($old_file);

        $values = [$type, $title, $slug, $body, $summary, $final_image, $final_file, $final_file_name, $event_date, $status];
        if ($id) { $sql='UPDATE content SET type=?,title=?,slug=?,body=?,summary=?,image_path=?,file_path=?,file_name=?,event_date=?,status=? WHERE id=?'; $values[]=$id; }
        else     { $sql='INSERT INTO content(type,title,slug,body,summary,image_path,file_path,file_name,event_date,status) VALUES(?,?,?,?,?,?,?,?,?,?)'; }
        $pdo->prepare($sql)->execute($values);
        header('Location: admin.php?type='.urlencode($type).'&saved=1'); exit;

    } catch (PDOException $e) {
        error_log('PSU-CMS DB error: ' . $e->getMessage());
        if (isset($img['path']))  delete_upload($img['path']);
        if (isset($file['path'])) delete_upload($file['path']);
        $error = 'A database error occurred. Please check your input and try again.';
    } catch (RuntimeException $e) {
        $error = $e->getMessage();
    } catch (Throwable $e) {
        error_log('PSU-CMS error: ' . $e->getMessage());
        $error = 'An unexpected error occurred. Please try again.';
    }
}

/* ── Delete content ──────────────────────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['delete'])) {
    check_csrf();
    $delId = (int)$_POST['id'];
    $existing = $pdo->prepare('SELECT image_path, file_path FROM content WHERE id=?');
    $existing->execute([$delId]);
    $row = $existing->fetch();
    if ($row) { delete_upload($row['image_path']); delete_upload($row['file_path']); }
    $pdo->prepare('DELETE FROM content WHERE id=?')->execute([$delId]);
    header('Location: admin.php?type='.urlencode(post_str('type', 40) ?: 'news')); exit;
}

if ($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['feedback_status'])) { check_csrf(); $pdo->prepare("UPDATE feedback SET status='read' WHERE id=?")->execute([(int)$_POST['feedback_id']]); header('Location: admin.php?view=feedback'); exit; }
$edit = null; if (isset($_GET['edit'])) { $q=$pdo->prepare('SELECT * FROM content WHERE id=?'); $q->execute([(int)$_GET['edit']]); $edit=$q->fetch(); }
$type = $_GET['type'] ?? 'news'; if (!isset($types[$type])) $type='news';

/* ── Pagination helpers ───────────────────────────────────────────────── */
$perPage  = 25;
$fbPage   = max(1, (int)($_GET['fbp'] ?? 1));
$fbOffset = ($fbPage - 1) * $perPage;
$ctPage   = max(1, (int)($_GET['ctp'] ?? 1));
$ctOffset = ($ctPage - 1) * $perPage;

site_header('CMS Dashboard');
echo '<div class="admin-top"><div><span class="eyebrow">ADMINISTRATION</span><h1>Content dashboard</h1><p>Signed in as '.h($_SESSION['admin_name']).'</p></div><form method="post" style="display:inline"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="logout" value="1"><button class="button secondary" type="submit">Sign out</button></form></div><div class="stats">';
foreach(['Published'=>"SELECT COUNT(*) FROM content WHERE status='published'",'Drafts'=>"SELECT COUNT(*) FROM content WHERE status='draft'",'Feedback'=>'SELECT COUNT(*) FROM feedback WHERE status=\'new\''] as $label=>$sql) echo '<div class="stat"><span>'.h($label).'</span><strong>'.(int)$pdo->query($sql)->fetchColumn().'</strong></div>';
echo '</div><div class="admin-layout"><aside class="side"><a class="'.(!isset($_GET['view'])?'active':'').'" href="admin.php">Overview</a>';
foreach ($types as $k=>$v) echo '<a class="'.($type===$k&&!isset($_GET['view'])?'active':'').'" href="admin.php?type='.h($k).'">'.h($v).'</a>';
echo '<a class="'.(isset($_GET['view'])&&$_GET['view']==='feedback'?'active':'').'" href="admin.php?view=feedback">Contact feedback</a>';
echo '<a class="'.(isset($_GET['view'])&&$_GET['view']==='password'?'active':'').'" href="admin.php?view=password">Change password</a>';
echo '<a href="index.php" target="_blank">View public site ↗</a></aside><section class="admin-main">';

if (isset($_GET['pw_changed'])) echo '<div class="notice">Password updated successfully.</div>';
if (!empty($error)) echo '<div class="notice error">'.h($error).'</div>';
if (isset($_GET['saved'])) echo '<div class="notice">Content saved.</div>';

/* ── Password change view ────────────────────────────────────────────── */
if (($_GET['view'] ?? '') === 'password') {
    echo '<h2>Change password</h2>';
    echo '<form class="panel form narrow" method="post"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="change_password" value="1"><label>Current password<input name="current_password" type="password" required></label><label>New password (12–72 characters)<input name="new_password" type="password" minlength="12" maxlength="72" required></label><button>Update password</button></form>';

/* ── Feedback view with pagination ───────────────────────────────────── */
} elseif (($_GET['view'] ?? '') === 'feedback') {
    $fbTotal = (int)$pdo->query('SELECT COUNT(*) FROM feedback')->fetchColumn();
    $fbPages = max(1, (int)ceil($fbTotal / $perPage));
    echo '<h2>Contact feedback</h2><div class="table-wrap"><table><thead><tr><th>Received</th><th>Sender</th><th>Subject & message</th><th>Status</th></tr></thead><tbody>';
    $fbRows = $pdo->prepare('SELECT * FROM feedback ORDER BY created_at DESC LIMIT ? OFFSET ?');
    $fbRows->execute([$perPage, $fbOffset]);
    foreach ($fbRows as $f) {
        echo '<tr><td>'.h($f['created_at']).'</td><td>'.h($f['name']).'<br>'.h($f['email']).'</td><td><strong>'.h($f['subject']).'</strong><br>'.h($f['message']).'</td><td>'.h($f['status']);
        if ($f['status']==='new') echo '<form method="post"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="feedback_id" value="'.(int)$f['id'].'"><button class="small">Mark read</button><input type="hidden" name="feedback_status" value="1"></form>';
        echo '</td></tr>';
    }
    echo '</tbody></table></div>';
    if ($fbPages > 1) {
        echo '<div class="pagination">';
        for ($p = 1; $p <= $fbPages; $p++) echo '<a href="admin.php?view=feedback&fbp='.$p.'" class="'.($p===$fbPage?'active':'').'">'.$p.'</a> ';
        echo '</div>';
    }

/* ── Content list/edit ───────────────────────────────────────────────── */
} else {
    $r = $edit ?: ['id'=>0,'type'=>$type,'title'=>'','slug'=>'','summary'=>'','body'=>'','image_path'=>'','file_path'=>'','file_name'=>'','event_date'=>'','status'=>'draft'];
    echo '<div class="section-head"><h2>'.($edit?'Edit content':'Add content').'</h2></div>';
    echo '<form class="panel form" method="post" enctype="multipart/form-data"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="save" value="1"><input type="hidden" name="id" value="'.(int)$r['id'].'"><div class="form-grid"><label>Content type<select name="type">';
    foreach ($types as $k=>$v) echo '<option value="'.h($k).'" '.($r['type']===$k?'selected':'').'>'.h($v).'</option>';
    echo '</select></label><label>Title<input name="title" required value="'.h($r['title']).'"></label><label>URL slug<input name="slug" value="'.h($r['slug']).'" placeholder="generated from title"></label><label>Event date and time<input name="event_date" type="datetime-local" value="'.h($r['event_date']?date('Y-m-d\TH:i',strtotime($r['event_date'])):'').'"></label><label class="full">Short description<textarea name="summary" rows="2">'.h($r['summary']).'</textarea></label><label class="full">Content<textarea name="body" rows="7">'.h($r['body']).'</textarea></label><label>Image (JPG, PNG, GIF, WebP; max 12 MB)<input name="image" type="file" accept="image/*"></label><label>Download file (PDF, DOC/DOCX, TXT, ZIP; max 12 MB)<input name="file" type="file"></label><label>Publishing status<select name="status"><option value="draft" '.($r['status']==='draft'?'selected':'').'>Draft</option><option value="published" '.($r['status']==='published'?'selected':'').'>Published</option></select></label></div>';
    if ($edit && $r['image_path']) echo '<p class="muted">Current image: '.h(basename($r['image_path'])).'</p>';
    if ($edit && $r['file_path'])  echo '<p class="muted">Current file: '.h($r['file_name'] ?: basename($r['file_path'])).'</p>';
    echo '<button>Save content</button></form>';

    /* Paginated content table */
    $ctTotal = (int)$pdo->prepare('SELECT COUNT(*) FROM content WHERE type=?')->execute([$type]) ? (int)$pdo->prepare('SELECT COUNT(*) FROM content WHERE type=?')->execute([$type]) : 0;
    $ctStmt  = $pdo->prepare('SELECT COUNT(*) FROM content WHERE type=?'); $ctStmt->execute([$type]); $ctTotal = (int)$ctStmt->fetchColumn();
    $ctPages = max(1, (int)ceil($ctTotal / $perPage));
    echo '<div class="section-head"><h2>'.h($types[$type]).'</h2><span class="muted">'.h(strtolower($types[$type])).'</span></div><div class="table-wrap"><table><thead><tr><th>Title</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>';
    $ctRows = $pdo->prepare('SELECT * FROM content WHERE type=? ORDER BY updated_at DESC LIMIT ? OFFSET ?');
    $ctRows->execute([$type, $perPage, $ctOffset]);
    foreach ($ctRows as $item) {
        echo '<tr><td><strong>'.h($item['title']).'</strong><br><span class="muted">/'.h($item['slug']).'</span></td><td><span class="pill '.h($item['status']).'">'.h($item['status']).'</span></td><td>'.h(date('M j, Y',strtotime($item['updated_at']))).'</td><td class="actions"><a href="admin.php?type='.h($type).'&edit='.(int)$item['id'].'">Edit</a> ';
        if ($item['status']==='published') echo '<a href="index.php?item='.(int)$item['id'].'" target="_blank">View</a> ';
        echo '<form method="post" onsubmit="return confirm(\'Delete this item?\')"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="delete" value="1"><input type="hidden" name="id" value="'.(int)$item['id'].'"><input type="hidden" name="type" value="'.h($type).'"><button class="link danger">Delete</button></form></td></tr>';
    }
    echo '</tbody></table></div>';
    if ($ctPages > 1) {
        echo '<div class="pagination">';
        for ($p = 1; $p <= $ctPages; $p++) echo '<a href="admin.php?type='.h($type).'&ctp='.$p.'" class="'.($p===$ctPage?'active':'').'">'.$p.'</a> ';
        echo '</div>';
    }
}
echo '</section></div>'; site_footer();
