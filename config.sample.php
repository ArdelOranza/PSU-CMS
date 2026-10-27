<?php
// Copy this file to config.php and set your MySQL credentials.
// Use a dedicated database user with only the privileges this application needs.
return [
    'db_host' => '127.0.0.1',
    'db_name' => 'psu_cms',
    'db_user' => 'psu_cms',
    'db_pass' => 'change-me',
    'site_name' => 'PSU Urdaneta CMS',
    'base_url' => '',
    // Only enable this behind a trusted reverse proxy that overwrites these headers,
    // AND where network controls (firewall/ACL) prevent clients from reaching the
    // origin directly. Direct origin access lets clients spoof X-Forwarded-For,
    // bypassing IP throttles and falsifying logged IPs.
    'trust_proxy_headers' => false,
    // Idle admin session lifetime in seconds (0 disables the check).
    'session_timeout' => 7200,
    // Public feedback submissions allowed per requester IP per 15 minutes.
    // The limiter is stored in the database (feedback_attempts), not the session.
    'feedback_limit' => 5,
];
