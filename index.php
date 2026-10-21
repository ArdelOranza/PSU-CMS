<?php
require __DIR__.'/bootstrap.php';
$types=['news'=>'News','announcements'=>'Announcements','events'=>'Events','colleges'=>'Colleges','departments'=>'Departments','programs'=>'Academic Programs','directory'=>'Faculty & Staff Directory','documents'=>'Documents','media'=>'Media Library','pages'=>'Pages'];

/* ── Feedback submission (Fixes 2, 4) ────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['feedback'])) {
    check_csrf();

    $name    = post_str('name', 120);
    $email   = post_str('email', 190);
    $subject = post_str('subject', 220);
    $message = post_str('message', 5000); /* Fix 2: server-side length limit */

    /* Fix 4: validate inputs */
    $fbError = '';
    if ($name === '' || $subject === '' || $message === '') {
        $fbError = 'All fields are required.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $fbError = 'Please enter a valid email address.';
    }

    /* Fix 2: session-based rate limiting (max 5 submissions per 15 minutes) */
    if (!$fbError) {
        $now = time();
        $_SESSION['feedback_times'] = array_filter($_SESSION['feedback_times'] ?? [], fn($t) => $t > $now - 900);
        if (count($_SESSION['feedback_times']) >= 5) {
            $fbError = 'You have submitted too many messages. Please try again later.';
        } else {
            $_SESSION['feedback_times'][] = $now;
        }
    }

    if ($fbError) {
        /* Store error to display after header */
    } else {
        try {
            $q = $pdo->prepare('INSERT INTO feedback(name,email,subject,message) VALUES(?,?,?,?)');
            $q->execute([$name, $email, $subject, $message]);
            header('Location: index.php?contact=1&sent=1'); exit;
        } catch (PDOException $e) {
            error_log('PSU-CMS feedback error: ' . $e->getMessage());
            $fbError = 'Could not save your feedback. Please try again.';
        }
    }
}

$type = $_GET['type'] ?? '';
$query = post_str('q', 100); /* check POST first */
if ($query === '') {
    $qRaw = $_GET['q'] ?? '';
    $query = is_string($qRaw) ? trim(mb_substr($qRaw, 0, 100)) : '';
}

site_header($types[$type] ?? 'Home');

if (isset($_GET['contact'])) {
    echo '<section class="hero"><span class="eyebrow">GET IN TOUCH</span><h1>Contact & feedback</h1><p>Send a question or comment to the campus team.</p></section>';
    if (isset($_GET['sent'])) echo '<div class="notice">Thank you. Your feedback has been received.</div>';
    if (!empty($fbError)) echo '<div class="notice error">'.h($fbError).'</div>';
    echo '<form class="panel form" method="post"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="feedback" value="1"><label>Name<input name="name" required maxlength="120"></label><label>Email<input name="email" type="email" required maxlength="190"></label><label>Subject<input name="subject" required maxlength="220"></label><label>Message<textarea name="message" rows="6" required maxlength="5000"></textarea></label><button>Send feedback</button></form>';
    site_footer(); exit;
}

if (isset($_GET['item'])) {
    $q = $pdo->prepare("SELECT * FROM content WHERE id=? AND status='published'");
    $q->execute([(int)$_GET['item']]);
    $item = $q->fetch();
    if (!$item) { http_response_code(404); echo '<h1>Content not found</h1>'; site_footer(); exit; }

    echo '<article class="article"><span class="eyebrow">'.h($types[$item['type']] ?? 'Content').'</span><h1>'.h($item['title']).'</h1><div class="meta">'.h($item['event_date'] ?: $item['created_at']).'</div>';

    /* Fix 1: validate asset paths before rendering */
    $safePath = safe_asset_path($item['image_path']);
    if ($safePath) echo '<img class="cover" src="'.h($safePath).'" alt="">';

    echo '<div class="prose">'.nl2br(h($item['body'])).'</div>';

    /* Fix 1: validate file_path — prevents javascript: and other dangerous schemes */
    $safeFile = safe_asset_path($item['file_path']);
    if ($safeFile) echo '<a class="button" href="'.h($safeFile).'" download>Download '.h($item['file_name'] ?: 'file').'</a>';

    echo '</article>'; site_footer(); exit;
}

if ($query !== '') {
    /* Fix 8: escape LIKE wildcards */
    $escaped = addcslashes($query, '%_\\');
    $like = '%' . $escaped . '%';
    $q = $pdo->prepare("SELECT * FROM content WHERE status='published' AND (title LIKE ? OR summary LIKE ? OR body LIKE ?) ORDER BY created_at DESC LIMIT 80");
    $q->execute([$like, $like, $like]);
    $rows = $q->fetchAll();
    echo '<section class="hero"><span class="eyebrow">SEARCH</span><h1>Results for "'.h($query).'"</h1></section>';
}
elseif (isset($types[$type])) {
    $q = $pdo->prepare("SELECT * FROM content WHERE type=? AND status='published' ORDER BY COALESCE(event_date,created_at) DESC LIMIT 100");
    $q->execute([$type]);
    $rows = $q->fetchAll();
    echo '<section class="hero"><span class="eyebrow">CAMPUS CONTENT</span><h1>'.h($types[$type]).'</h1><p>Explore the latest campus information.</p></section>';
}
else {
    $q = $pdo->query("SELECT * FROM content WHERE type='pages' AND slug='homepage' AND status='published' LIMIT 1");
    $home = $q->fetch();
    echo '<section class="hero"><span class="eyebrow">PANGASINAN STATE UNIVERSITY · URDANETA CITY CAMPUS</span><h1>'.h($home['title'] ?? 'Welcome to PSU Urdaneta City Campus').'</h1><p>'.h($home['summary'] ?? 'Campus news, announcements, events, academic programs and community information in one place.').'</p><form class="search" method="get"><input name="q" placeholder="Search campus content" aria-label="Search campus content" maxlength="100"><button>Search</button></form></section>';
    $rows = $pdo->query("SELECT * FROM content WHERE status='published' AND type IN ('news','announcements','events') ORDER BY created_at DESC LIMIT 9")->fetchAll();
    echo '<div class="section-head"><h2>Campus updates</h2><a href="index.php?type=news">Browse news</a></div>';
}

echo '<div class="cards">';
foreach ($rows as $r) {
    echo '<article class="card">';
    /* Fix 1: validate image paths in listings too */
    $cardImg = safe_asset_path($r['image_path']);
    if ($cardImg) echo '<img src="'.h($cardImg).'" alt="">';
    echo '<div class="card-in"><span class="eyebrow">'.h($types[$r['type']] ?? $r['type']).'</span><h2><a href="index.php?item='.(int)$r['id'].'">'.h($r['title']).'</a></h2><p>'.h($r['summary'] ?: mb_substr(strip_tags($r['body'] ?? ''), 0, 170)).'</p><div class="meta">'.h($r['event_date'] ?: date('M j, Y', strtotime($r['created_at']))).'</div></div></article>';
}
if (empty($rows)) echo '<p class="empty">Nothing published here yet.</p>';
echo '</div>';
site_footer();
