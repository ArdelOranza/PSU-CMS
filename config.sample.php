<?php
// Copy this file to config.php and set your MySQL credentials.
// WARNING: Never use root with an empty password in production.
// IMPORTANT: Set 'setup_key' to a random secret before running setup.php.
return [
    'db_host'     => '127.0.0.1',
    'db_name'     => 'psu_cms',
    'db_user'     => 'psu_cms_user',   // Use a dedicated DB user, not root
    'db_pass'     => '',               // Set a strong password
    'site_name'   => 'PSU Urdaneta CMS',
    'base_url'    => '',
    'setup_key'   => '', // Set a random secret, e.g. bin2hex(random_bytes(16))
    'force_https' => false, // Set true if behind a TLS-terminating reverse proxy
];
