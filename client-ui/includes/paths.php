<?php
/**
 * paths.php: helpers for the PHP pages in client-ui/news, announcements and events.
 *   psu_url('client-ui/css/page.css') -> "/PSU-CMS/client-ui/css/page.css"
 * PSU_BASE is "" when the project is the web root, "/PSU-CMS" when it sits in a subfolder.
 */
if (!defined('PSU_BASE')) {
    $psuDocRoot = rtrim(str_replace('\\', '/', (string) realpath($_SERVER['DOCUMENT_ROOT'] ?? '')), '/');
    $psuSiteDir = rtrim(str_replace('\\', '/', (string) realpath(__DIR__ . '/../..')), '/');
    define('PSU_BASE', ($psuDocRoot !== '' && strpos($psuSiteDir, $psuDocRoot) === 0) ? substr($psuSiteDir, strlen($psuDocRoot)) : '');
}
if (!function_exists('psu_url')) {
    function psu_url(string $path = ''): string { return PSU_BASE . '/' . ltrim($path, '/'); }
}
if (!function_exists('psu_e')) {
    function psu_e($s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
}
