<?php
require __DIR__.'/bootstrap.php';
$types=['news'=>'News','announcements'=>'Announcements','events'=>'Events','colleges'=>'Colleges','departments'=>'Departments','programs'=>'Academic Programs','directory'=>'Faculty & Staff Directory','documents'=>'Documents','media'=>'Media Library','pages'=>'Pages'];
$feedbackError='';
if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['feedback'])) {
    check_csrf();
    $name=trim((string)($_POST['name']??''));
    $email=trim((string)($_POST['email']??''));
    $subject=trim((string)($_POST['subject']??''));
    $message=trim((string)($_POST['message']??''));
    $errors=[];
    if($name===''||mb_strlen($name)>120) $errors[]='Enter a name (120 characters max).';
    if(!filter_var($email,FILTER_VALIDATE_EMAIL)||mb_strlen($email)>190) $errors[]='Enter a valid email address.';
    if($subject===''||mb_strlen($subject)>220) $errors[]='Enter a subject (220 characters max).';
    if($message===''||mb_strlen($message)>5000) $errors[]='Enter a message (5000 characters max).';
    if($errors) {
        http_response_code(422);
        $feedbackError=implode(' ',$errors);
    } else {
        // Persistent, server-enforced rate limit keyed by requester IP. Session
        // state cannot reset this; REMOTE_ADDR is only overridden when the
        // deployment really does sit behind a trusted proxy (see README).
        $feedbackLimit=max(1,(int)($config['feedback_limit']??5));
        $ip=client_ip();
        $allowed=true;
        try {
            $q=$pdo->prepare('SELECT COUNT(*) FROM feedback_attempts WHERE ip = ? AND attempted_at >= (NOW() - INTERVAL 15 MINUTE)');
            $q->execute([$ip]);
            if((int)$q->fetchColumn()>=$feedbackLimit) {
                $allowed=false;
                http_response_code(429);
                $feedbackError='Too many feedback submissions. Please wait and try again.';
                security_log('feedback_throttled',['ip'=>$ip]);
            }
        } catch(Throwable $e) {
            error_log('Feedback throttle unavailable: '.$e->getMessage());
            ensure_feedback_attempts_table($pdo);
            // Limiter storage unavailable: fail open and log loudly.
        }
        if($allowed) {
            try {
                $q=$pdo->prepare('INSERT INTO feedback(name,email,subject,message) VALUES(?,?,?,?)');
                $q->execute([$name,$email,$subject,$message]);
                try {
                    $a=$pdo->prepare('INSERT INTO feedback_attempts(ip) VALUES (?)');
                    $a->execute([$ip]);
                } catch(Throwable $e) {
                    error_log('Could not record feedback attempt: '.$e->getMessage());
                    ensure_feedback_attempts_table($pdo);
                }
                header('Location: index.php?contact=1&sent=1');
                exit;
            } catch(PDOException $e) {
                error_log('Feedback insert failed: '.$e->getMessage());
                http_response_code(500);
                $feedbackError='Could not send feedback. Please try again.';
            }
        }
    }
    $_GET['contact']='1';
}
$type=(string)($_GET['type']??''); $query=trim((string)($_GET['q']??''));
if(mb_strlen($query)>100) $query=mb_substr($query,0,100);
site_header($types[$type]??'Home');
if(isset($_GET['contact'])) {
    echo '<section class="hero"><span class="eyebrow">GET IN TOUCH</span><h1>Contact & feedback</h1><p>Send a question or comment to the campus team.</p></section>';
    if($feedbackError!=='') echo '<div class="notice error">'.h($feedbackError).'</div>';
    if(isset($_GET['sent'])) echo '<div class="notice">Thank you. Your feedback has been received.</div>';
    echo '<form class="panel form" method="post"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="feedback" value="1"><label>Name<input name="name" required maxlength="120"></label><label>Email<input name="email" type="email" required maxlength="190"></label><label>Subject<input name="subject" required maxlength="220"></label><label>Message<textarea name="message" rows="6" required maxlength="5000"></textarea></label><button>Send feedback</button></form>';
    site_footer();
    exit;
}
if(isset($_GET['item'])) {
    $q=$pdo->prepare("SELECT * FROM content WHERE id=? AND status='published'");
    $q->execute([(int)($_GET['item']??0)]);
    $item=$q->fetch();
    if(!$item){http_response_code(404);echo '<h1>Content not found</h1>';site_footer();exit;}
    echo '<article class="article"><span class="eyebrow">'.h($types[$item['type']]??'Content').'</span><h1>'.h($item['title']).'</h1><div class="meta">'.h($item['event_date']?:$item['created_at']).'</div>';
    $itemImage=safe_upload_path($item['image_path']??null,'images');
    if($itemImage) echo '<img class="cover" src="'.h($itemImage).'" alt="">';
    echo '<div class="prose">'.nl2br(h($item['body'])).'</div>';
    $itemFile=safe_upload_path($item['file_path']??null,'files');
    if($itemFile) echo '<a class="button" href="'.h($itemFile).'" download>Download '.h(safe_file_name($item['file_name']??null)?:'file').'</a>';
    echo '</article>';
    site_footer();
    exit;
}
if($query!=='') {
    $q=$pdo->prepare("SELECT * FROM content WHERE status='published' AND (title LIKE ? ESCAPE '!' OR summary LIKE ? ESCAPE '!' OR body LIKE ? ESCAPE '!') ORDER BY created_at DESC LIMIT 80");
    $like='%'.str_replace(['!','%','_'],['!!','!%','!_'],$query).'%';
    $q->execute([$like,$like,$like]);
    $rows=$q->fetchAll();
    echo '<section class="hero"><span class="eyebrow">SEARCH</span><h1>Results for “'.h($query).'”</h1></section>';
}
elseif(isset($types[$type])) {
    $q=$pdo->prepare("SELECT * FROM content WHERE type=? AND status='published' ORDER BY COALESCE(event_date,created_at) DESC LIMIT 100");
    $q->execute([$type]);
    $rows=$q->fetchAll();
    echo '<section class="hero"><span class="eyebrow">CAMPUS CONTENT</span><h1>'.h($types[$type]).'</h1><p>Explore the latest campus information.</p></section>';
}
else {
    $q=$pdo->query("SELECT * FROM content WHERE type='pages' AND slug='homepage' AND status='published' LIMIT 1");
    $home=$q->fetch();
    echo '<section class="hero"><span class="eyebrow">PANGASINAN STATE UNIVERSITY · URDANETA CITY CAMPUS</span><h1>'.h($home['title']??'Welcome to PSU Urdaneta City Campus').'</h1><p>'.h($home['summary']??'Campus news, announcements, events, academic programs and community information in one place.').'</p><form class="search" method="get"><input name="q" placeholder="Search campus content" aria-label="Search campus content" maxlength="100"><button>Search</button></form></section>';
    $rows=$pdo->query("SELECT * FROM content WHERE status='published' AND type IN ('news','announcements','events') ORDER BY created_at DESC LIMIT 9")->fetchAll();
    echo '<div class="section-head"><h2>Campus updates</h2><a href="index.php?type=news">Browse news</a></div>';
}
echo '<div class="cards">';
foreach($rows as $r) {
    echo '<article class="card">';
    $cardImage=safe_upload_path($r['image_path']??null,'images');
    if($cardImage) echo '<img src="'.h($cardImage).'" alt="">';
    echo '<div class="card-in"><span class="eyebrow">'.h($types[$r['type']]??$r['type']).'</span><h2><a href="index.php?item='.(int)$r['id'].'">'.h($r['title']).'</a></h2><p>'.h($r['summary']?:mb_substr(strip_tags($r['body']??''),0,170)).'</p><div class="meta">'.h($r['event_date']?:date('M j, Y',strtotime($r['created_at']))).'</div></div></article>';
}
if(!$rows) echo '<p class="empty">Nothing published here yet.</p>';
echo '</div>';
site_footer();
