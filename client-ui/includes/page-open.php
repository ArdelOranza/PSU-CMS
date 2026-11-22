<?php
/**
 * page-open.php: <head>, shared header and <body> start for the News / Announcements / Events pages.
 * Set BEFORE including:  $pageTitle, $activeNav (news|events|...), $pageStyles (files in client-ui/css/).
 * The header itself is the shared client-ui/includes/header.html (via header.php), same as the Contact page.
 */
require_once __DIR__ . '/paths.php';
$pageTitle  = $pageTitle ?? 'Pangasinan State University';
$activeNav  = $activeNav ?? '';
$pageStyles = $pageStyles ?? [];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= psu_e($pageTitle) ?> | Pangasinan State University</title>
  <link rel="icon" type="image/png" href="<?= psu_e(psu_url('client-ui/assets/images/psu-logo.png')) ?>">
  <link rel="stylesheet" href="<?= psu_e(psu_url('client-ui/assets/vendor/bootstrap-icons/bootstrap-icons.min.css')) ?>">
  <link rel="stylesheet" href="<?= psu_e(psu_url('client-ui/css/variables.css')) ?>">
  <link rel="stylesheet" href="<?= psu_e(psu_url('client-ui/css/global.css')) ?>">
  <link rel="stylesheet" href="<?= psu_e(psu_url('client-ui/css/header.css')) ?>">
  <link rel="stylesheet" href="<?= psu_e(psu_url('client-ui/css/footer.css')) ?>">
  <link rel="stylesheet" href="<?= psu_e(psu_url('client-ui/css/psu-pages.css')) ?>">
<?php foreach ($pageStyles as $style): ?>
  <link rel="stylesheet" href="<?= psu_e(psu_url('client-ui/css/' . $style)) ?>">
<?php endforeach; ?>
</head>
<body class="psu-body" data-nav="<?= psu_e($activeNav) ?>">
<?php
$root = PSU_BASE . '/';   // header.php rewrites "@/" links to this
include __DIR__ . '/header.php';
