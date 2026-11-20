<?php
/*
 * PHP wrapper for the shared header.
 * Set $root to the path from the current page back to the repository root
 * ('' for a page at the root, '../' for one folder deep) and then include this
 * file, for example:  include 'client-ui/includes/header.php';
 */
$root = $root ?? '';
$html = file_get_contents(__DIR__ . '/header.html');
echo str_replace(['href="@/', 'src="@/', 'action="@/'], ['href="' . $root, 'src="' . $root, 'action="' . $root], $html);
