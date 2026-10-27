<?php
require __DIR__.'/bootstrap.php';
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');
$count=(int)$pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn(); $message='';
if($_SERVER['REQUEST_METHOD']==='POST' && $count===0){
    check_csrf();
    $name=trim((string)($_POST['name']??''));
    $email=trim((string)($_POST['email']??''));
    $pass=(string)($_POST['password']??'');
    if($name===''||mb_strlen($name)>120) $message='Enter a name (120 characters max).';
    elseif(!filter_var($email,FILTER_VALIDATE_EMAIL)||mb_strlen($email)>190) $message='Enter a valid email address.';
    elseif(strlen($pass)<12||strlen($pass)>1024) $message='Use a password with 12 to 1024 characters.';
    else {
        $locked=(int)$pdo->query("SELECT GET_LOCK('psu_cms_setup', 5)")->fetchColumn();
        if($locked!==1) {
            http_response_code(503);
            $message='Setup is busy. Try again in a moment.';
        } else {
            try {
                $count=(int)$pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn();
                if($count===0) {
                    $q=$pdo->prepare('INSERT INTO admins(name,email,password_hash) VALUES(?,?,?)');
                    $q->execute([$name,$email,password_hash($pass,PASSWORD_DEFAULT)]);
                    session_regenerate_id(true);
                    csrf_rotate();
                    security_log('admin_created',['email'=>$email,'ip'=>client_ip()]);
                    header('Location: admin.php?created=1');
                    exit;
                }
                $message='An administrator already exists.';
            } catch(PDOException $e) {
                error_log('Setup failed: '.$e->getMessage());
                http_response_code(500);
                $message='Could not create the administrator. Please try again.';
            } finally {
                try {
                    $pdo->query("SELECT RELEASE_LOCK('psu_cms_setup')");
                } catch(Throwable $e) {
                    error_log('Could not release setup lock: '.$e->getMessage());
                }
            }
        }
    }
}
site_header('Initial setup');
echo '<section class="hero"><span class="eyebrow">ONE TIME SETUP</span><h1>Create administrator</h1><p>This account manages campus content and feedback.</p></section>';
if($count>0) echo '<div class="notice">An administrator already exists. <a href="admin.php">Go to sign in</a>.</div>';
else {
    if($message) echo '<div class="notice error">'.h($message).'</div>';
    echo '<form class="panel form narrow" method="post"><input type="hidden" name="csrf" value="'.h(csrf()).'"><label>Full name<input name="name" required maxlength="120" autocomplete="name"></label><label>Email<input name="email" type="email" required maxlength="190" autocomplete="email"></label><label>Password (12 characters minimum)<input name="password" type="password" minlength="12" maxlength="1024" required autocomplete="new-password"></label><button>Create administrator</button></form>';
}
site_footer();
