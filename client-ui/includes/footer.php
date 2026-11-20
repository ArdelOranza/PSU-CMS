<?php
/* PHP wrapper for the shared footer. Same $root convention as header.php. */
$root = $root ?? '';
$html = file_get_contents(__DIR__ . '/footer.html');
echo str_replace(['href="@/', 'src="@/'], ['href="' . $root, 'src="' . $root], $html);
