<?php
require __DIR__.'/bootstrap.php';
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');

$types=['pages'=>'Homepage / Pages','news'=>'News','announcements'=>'Announcements','events'=>'Events','colleges'=>'Colleges','departments'=>'Departments','programs'=>'Academic Programs','directory'=>'Faculty & Staff','documents'=>'Documents','media'=>'Media Library'];

function render_pager(string $base, int $page, int $pages): void {
    if ($pages <= 1) return;
    echo '<div class="pagination">';
    for ($p = 1; $p <= $pages; $p++) echo '<a href="'.$base.$p.'"'.($p === $page ? ' class="active"' : '').'>'.(int)$p.'</a>';
    echo '</div>';
}

if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['logout'])) {
    check_csrf();
    security_log('admin_logout',['admin_id'=>$_SESSION['admin_id']??null,'ip'=>client_ip()]);
    destroy_session();
    header('Location: admin.php');
    exit;
}
if(isset($_GET['logout'])) {
    require_post();
}

$error='';
if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['login'])) {
    check_csrf();
    $email=mb_substr(trim((string)($_POST['email']??'')),0,190);
    $password=substr((string)($_POST['password']??''),0,1024);
    $ip=client_ip();
    if(login_is_throttled($pdo,$email,$ip)) {
        http_response_code(429);
        $error='Too many failed attempts. Try again in 15 minutes.';
        security_log('login_throttled',['email'=>$email,'ip'=>$ip]);
    } else {
        $q=$pdo->prepare('SELECT * FROM admins WHERE email=?');
        $q->execute([$email]);
        $admin=$q->fetch();
        $hash=$admin['password_hash']??DUMMY_PASSWORD_HASH;
        $valid=is_string($hash)&&password_verify($password,$hash);
        if($admin&&$valid) {
            session_regenerate_id(true);
            $_SESSION['admin_id']=(int)$admin['id'];
            $_SESSION['admin_name']=$admin['name'];
            $_SESSION['last_seen']=time();
            csrf_rotate();
            clear_login_failures($pdo,$email);
            if(password_needs_rehash($admin['password_hash'],PASSWORD_DEFAULT)) {
                $up=$pdo->prepare('UPDATE admins SET password_hash=? WHERE id=?');
                $up->execute([password_hash($password,PASSWORD_DEFAULT),$admin['id']]);
            }
            security_log('login_success',['admin_id'=>(int)$admin['id'],'ip'=>$ip]);
            header('Location: admin.php');
            exit;
        }
        record_login_failure($pdo,$email,$ip);
        security_log('login_failure',['email'=>$email,'ip'=>$ip]);
        $error='Email or password is incorrect.';
    }
}

if(empty($_SESSION['admin_id'])) {
    site_header('Admin login');
    echo '<section class="hero portal-hero"><span class="eyebrow">CONTENT MANAGEMENT PORTAL</span><h1>Login to PSU Portal</h1><p>Enter your email and password to manage campus content.</p></section>';
    if(!empty($error)) echo '<div class="notice error">'.h($error).'</div>';
    if(isset($_GET['expired'])) echo '<div class="notice error">Your session expired. Sign in again.</div>';
    echo '<form class="panel form narrow login-panel" method="post"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="login" value="1"><label>User Name / Email<input name="email" type="email" required maxlength="190" autocomplete="username"></label><label>Password<input name="password" type="password" required maxlength="1024" autocomplete="current-password"></label><button>Sign in</button><p class="muted">First visit? <a href="setup.php">Create the initial administrator</a>.</p></form>';
    site_footer();
    exit;
}

admin_only();

if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['save'])) {
    check_csrf();
    $img=null;
    $file=null;
    try {
        $id=(int)($_POST['id']??0);
        $type=(string)($_POST['type']??'news');
        if(!isset($types[$type])) throw new RuntimeException('Invalid content type.');
        $title=trim((string)($_POST['title']??''));
        if($title===''||mb_strlen($title)>220) throw new RuntimeException('Title is required and must be 220 characters or less.');
        $slugInput=mb_substr((string)($_POST['slug']??''),0,240);
        $slug=mb_substr(slugify($slugInput?:$title),0,240);
        $body=trim((string)($_POST['body']??''));
        if(mb_strlen($body)>2000000) throw new RuntimeException('Content is too long.');
        $summary=trim((string)($_POST['summary']??''));
        if(mb_strlen($summary)>5000) throw new RuntimeException('Short description is too long.');
        $eventDate=null;
        $eventDateRaw=substr(trim((string)($_POST['event_date']??'')),0,32);
        if($eventDateRaw!=='') {
            $dt=DateTimeImmutable::createFromFormat('Y-m-d\TH:i',$eventDateRaw);
            $dateErrors=DateTimeImmutable::getLastErrors();
            if(!$dt||($dateErrors&&($dateErrors['warning_count']>0||$dateErrors['error_count']>0))) {
                $dt=DateTimeImmutable::createFromFormat('Y-m-d\TH:i:s',$eventDateRaw);
                $dateErrors=DateTimeImmutable::getLastErrors();
                if(!$dt||($dateErrors&&($dateErrors['warning_count']>0||$dateErrors['error_count']>0))) $dt=false;
            }
            if(!$dt) throw new RuntimeException('Event date and time is invalid.');
            $eventDate=$dt->format('Y-m-d H:i:s');
        }
        $status=($_POST['status']??'draft')==='published'?'published':'draft';
        $img=upload_file('image','images',['image/jpeg'=>'jpg','image/png'=>'png','image/gif'=>'gif','image/webp'=>'webp']);
        $file=upload_file('file','files',['application/pdf'=>'pdf','application/msword'=>'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document'=>'docx','text/plain'=>'txt','application/zip'=>'zip']);
        $oldImage=null;
        $oldFile=null;
        $oldFileName=null;
        if($id) {
            $q=$pdo->prepare('SELECT image_path, file_path, file_name FROM content WHERE id=?');
            $q->execute([$id]);
            $existing=$q->fetch();
            if(!$existing) throw new RuntimeException('The item you are editing no longer exists.');
            $oldImage=safe_upload_path(is_string($existing['image_path'])&&$existing['image_path']!==''?$existing['image_path']:null,'images');
            $oldFile=safe_upload_path(is_string($existing['file_path'])&&$existing['file_path']!==''?$existing['file_path']:null,'files');
            $oldFileName=$oldFile?safe_file_name(is_string($existing['file_name'])?$existing['file_name']:null):null;
        }
        $values=[$type,$title,$slug,$body,$summary,$img['path']??$oldImage,$file['path']??$oldFile,$file['name']??$oldFileName,$eventDate,$status];
        if($id){$sql='UPDATE content SET type=?,title=?,slug=?,body=?,summary=?,image_path=?,file_path=?,file_name=?,event_date=?,status=? WHERE id=?';$values[]=$id;}
        else{$sql='INSERT INTO content(type,title,slug,body,summary,image_path,file_path,file_name,event_date,status) VALUES(?,?,?,?,?,?,?,?,?,?)';}
        $stmt=$pdo->prepare($sql);
        $stmt->execute($values);
        if($id&&$stmt->rowCount()===0) throw new RuntimeException('Could not save content. The item may have been removed.');
        if($img&&$oldImage) cleanup_orphaned_upload($pdo,$oldImage,'images');
        if($file&&$oldFile) cleanup_orphaned_upload($pdo,$oldFile,'files');
        header('Location: admin.php?type='.urlencode($type).'&saved=1');
        exit;
    } catch(PDOException $e) {
        cleanup_upload($img['path']??null,'images');
        cleanup_upload($file['path']??null,'files');
        error_log('Content save failed: '.$e->getMessage());
        $error='Could not save content. The URL slug may already be in use, or a database error occurred. The error has been logged.';
    } catch(RuntimeException $e) {
        cleanup_upload($img['path']??null,'images');
        cleanup_upload($file['path']??null,'files');
        $error=$e->getMessage();
    } catch(Throwable $e) {
        cleanup_upload($img['path']??null,'images');
        cleanup_upload($file['path']??null,'files');
        error_log('Content save failed: '.$e->getMessage());
        $error='Could not save content. Please try again.';
    }
}

if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['delete'])) {
    check_csrf();
    $id=(int)($_POST['id']??0);
    $type=(string)($_POST['type']??'news');
    if(!isset($types[$type])) $type='news';
    $q=$pdo->prepare('SELECT image_path, file_path FROM content WHERE id=?');
    $q->execute([$id]);
    $row=$q->fetch();
    $pdo->prepare('DELETE FROM content WHERE id=?')->execute([$id]);
    if($row){cleanup_orphaned_upload($pdo,$row['image_path'],'images');cleanup_orphaned_upload($pdo,$row['file_path'],'files');}
    header('Location: admin.php?type='.urlencode($type));
    exit;
}

if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['feedback_status'])) {
    check_csrf();
    $pdo->prepare("UPDATE feedback SET status='read' WHERE id=?")->execute([(int)($_POST['feedback_id']??0)]);
    header('Location: admin.php?view=feedback');
    exit;
}

if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['change_password'])) {
    check_csrf();
    $currentPassword=(string)($_POST['current_password']??'');
    $newPassword=substr((string)($_POST['new_password']??''),0,1024);
    $q=$pdo->prepare('SELECT password_hash FROM admins WHERE id=?');
    $q->execute([(int)$_SESSION['admin_id']]);
    $row=$q->fetch();
    if(!$row||!is_string($row['password_hash'])||!password_verify($currentPassword,$row['password_hash'])) {
        $error='Current password is incorrect.';
    } elseif(strlen($newPassword)<12) {
        $error='New password must be at least 12 characters.';
    } else {
        $pdo->prepare('UPDATE admins SET password_hash=? WHERE id=?')->execute([password_hash($newPassword,PASSWORD_DEFAULT),(int)$_SESSION['admin_id']]);
        security_log('password_changed',['admin_id'=>(int)$_SESSION['admin_id'],'ip'=>client_ip()]);
        csrf_rotate();
        header('Location: admin.php?view=password&pw_changed=1');
        exit;
    }
}

$edit=null;
if(isset($_GET['edit'])) {
    $q=$pdo->prepare('SELECT * FROM content WHERE id=?');
    $q->execute([(int)$_GET['edit']]);
    $edit=$q->fetch();
}
$type=(string)($_GET['type']??'news');
if(!isset($types[$type]))$type='news';
site_header('CMS Dashboard');
echo '<div class="admin-top"><div><span class="eyebrow">ADMINISTRATION</span><h1>Content dashboard</h1><p>Signed in as '.h($_SESSION['admin_name']).'</p></div><form class="logout-form" method="post"><input type="hidden" name="csrf" value="'.h(csrf()).'"><button class="button secondary" name="logout" value="1">Sign out</button></form></div><div class="stats">';
foreach(['Published'=>"SELECT COUNT(*) FROM content WHERE status='published'",'Drafts'=>"SELECT COUNT(*) FROM content WHERE status='draft'",'Feedback'=>'SELECT COUNT(*) FROM feedback WHERE status=\'new\''] as $label=>$sql) echo '<div class="stat"><span>'.h($label).'</span><strong>'.(int)$pdo->query($sql)->fetchColumn().'</strong></div>';
echo '</div><div class="admin-layout"><aside class="side"><a class="'.(!isset($_GET['view'])?'active':'').'" href="admin.php">Overview</a>';
foreach($types as $k=>$v) echo '<a class="'.($type===$k&&!isset($_GET['view'])?'active':'').'" href="admin.php?type='.h($k).'">'.h($v).'</a>';
echo '<a class="'.(($_GET['view']??'')==='feedback'?'active':'').'" href="admin.php?view=feedback">Contact feedback</a><a class="'.(($_GET['view']??'')==='password'?'active':'').'" href="admin.php?view=password">Password</a><a href="index.php" target="_blank" rel="noopener">View public site ↗</a></aside><section class="admin-main">';
if(!empty($error)) echo '<div class="notice error">'.h($error).'</div>';
if(isset($_GET['saved'])) echo '<div class="notice">Content saved.</div>';
if(isset($_GET['pw_changed'])) echo '<div class="notice">Password updated.</div>';
$perPage=25;
if(($_GET['view']??'')==='password') {
    echo '<h2>Change password</h2><form class="panel form narrow" method="post"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="change_password" value="1"><label>Current password<input name="current_password" type="password" autocomplete="current-password" required></label><label>New password (12 characters minimum)<input name="new_password" type="password" autocomplete="new-password" minlength="12" maxlength="1024" required></label><button>Update password</button></form>';
} elseif(($_GET['view']??'')==='feedback') {
    $fbPages=max(1,(int)ceil((int)$pdo->query('SELECT COUNT(*) FROM feedback')->fetchColumn()/$perPage));
    $fbPage=max(1,min($fbPages,(int)($_GET['fbp']??1)));
    $fbRows=$pdo->prepare('SELECT * FROM feedback ORDER BY created_at DESC LIMIT ? OFFSET ?');
    $fbRows->bindValue(1,$perPage,PDO::PARAM_INT);
    $fbRows->bindValue(2,($fbPage-1)*$perPage,PDO::PARAM_INT);
    $fbRows->execute();
    echo '<h2>Contact feedback</h2><div class="table-wrap"><table><thead><tr><th>Received</th><th>Sender</th><th>Subject & message</th><th>Status</th></tr></thead><tbody>';
    foreach($fbRows as $f) {
        echo '<tr><td>'.h($f['created_at']).'</td><td>'.h($f['name']).'<br>'.h($f['email']).'</td><td><strong>'.h($f['subject']).'</strong><br>'.h($f['message']).'</td><td>'.h($f['status']);
        if($f['status']==='new') echo '<form method="post"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="feedback_id" value="'.(int)$f['id'].'"><button class="small">Mark read</button><input type="hidden" name="feedback_status" value="1"></form>';
        echo '</td></tr>';
    }
    echo '</tbody></table></div>';
    render_pager('admin.php?view=feedback&fbp=', $fbPage, $fbPages);
} else {
    $r=$edit?:['id'=>0,'type'=>$type,'title'=>'','slug'=>'','summary'=>'','body'=>'','image_path'=>'','file_path'=>'','file_name'=>'','event_date'=>'','status'=>'draft'];
    echo '<div class="section-head"><h2>'.($edit?'Edit content':'Add content').'</h2></div><form class="panel form" method="post" enctype="multipart/form-data"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="save" value="1"><input type="hidden" name="id" value="'.(int)$r['id'].'"><input type="hidden" name="old_image" value="'.h($r['image_path']).'"><input type="hidden" name="old_file" value="'.h($r['file_path']).'"><input type="hidden" name="old_file_name" value="'.h($r['file_name']).'"><div class="form-grid"><label>Content type<select name="type">';
    foreach($types as $k=>$v)echo '<option value="'.h($k).'" '.($r['type']===$k?'selected':'').'>'.h($v).'</option>';
    echo '</select></label><label>Title<input name="title" required maxlength="220" value="'.h($r['title']).'"></label><label>URL slug<input name="slug" maxlength="240" value="'.h($r['slug']).'" placeholder="generated from title"></label><label>Event date and time<input name="event_date" type="datetime-local" value="'.h($r['event_date']?date('Y-m-d\TH:i',strtotime($r['event_date'])):'').'"></label><label class="full">Short description<textarea name="summary" rows="2" maxlength="5000">'.h($r['summary']).'</textarea></label><label class="full">Content<textarea name="body" rows="7">'.h($r['body']).'</textarea></label><label>Image (JPG, PNG, GIF, WebP; max 12 MB)<input name="image" type="file" accept="image/*"></label><label>Download file (PDF, DOC/DOCX, TXT, ZIP; max 12 MB)<input name="file" type="file"></label><label>Publishing status<select name="status"><option value="draft" '.($r['status']==='draft'?'selected':'').'>Draft</option><option value="published" '.($r['status']==='published'?'selected':'').'>Published</option></select></label></div>'
    .($edit&&$r['image_path']?'<p class="muted">Current image: '.h(basename($r['image_path'])).'</p>':'')
    .($edit&&$r['file_path']?'<p class="muted">Current file: '.h($r['file_name']?:basename($r['file_path'])).'</p>':'')
    .'<button>Save content</button></form><div class="section-head"><h2>'.h($types[$type]).'</h2><span class="muted">'.h(strtolower($types[$type])).'</span></div><div class="table-wrap"><table><thead><tr><th>Title</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>';
    $ctCount=$pdo->prepare('SELECT COUNT(*) FROM content WHERE type=?');
    $ctCount->execute([$type]);
    $ctPages=max(1,(int)ceil(((int)$ctCount->fetchColumn())/$perPage));
    $ctPage=max(1,min($ctPages,(int)($_GET['ctp']??1)));
    $q=$pdo->prepare('SELECT * FROM content WHERE type=? ORDER BY updated_at DESC LIMIT ? OFFSET ?');
    $q->bindValue(1,$type);
    $q->bindValue(2,$perPage,PDO::PARAM_INT);
    $q->bindValue(3,($ctPage-1)*$perPage,PDO::PARAM_INT);
    $q->execute();
    foreach($q as $item) {
        echo '<tr><td><strong>'.h($item['title']).'</strong><br><span class="muted">/'.h($item['slug']).'</span></td><td><span class="pill '.h($item['status']).'">'.h($item['status']).'</span></td><td>'.h(date('M j, Y',strtotime($item['updated_at']))).'</td><td class="actions"><a href="admin.php?type='.h($type).'&edit='.(int)$item['id'].'">Edit</a> ';
        if($item['status']==='published')echo '<a href="index.php?item='.(int)$item['id'].'" target="_blank" rel="noopener">View</a> ';
        echo '<form method="post" data-confirm="Delete this item?"><input type="hidden" name="csrf" value="'.h(csrf()).'"><input type="hidden" name="delete" value="1"><input type="hidden" name="id" value="'.(int)$item['id'].'"><input type="hidden" name="type" value="'.h($type).'"><button class="link danger">Delete</button></form></td></tr>';
    }
    echo '</tbody></table></div>';
    render_pager('admin.php?type='.urlencode($type).'&ctp=', $ctPage, $ctPages);
}
echo '</section></div>';
site_footer();
