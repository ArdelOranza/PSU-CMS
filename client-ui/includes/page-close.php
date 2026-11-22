<?php
/** page-close.php: shared footer, then header.js and the page scripts ($pageScripts, paths from the project root). */
$root = PSU_BASE . '/';
include __DIR__ . '/footer.php';
$pageScripts = $pageScripts ?? [];
?>
<script src="<?= psu_e(psu_url('client-ui/js/header.js')) ?>"></script>
<script src="<?= psu_e(psu_url('client-ui/js/header-init.js')) ?>"></script>
<?php foreach ($pageScripts as $script): ?>
<script src="<?= psu_e(psu_url($script)) ?>"></script>
<?php endforeach; ?>
</body>
</html>
