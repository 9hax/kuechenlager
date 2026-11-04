<?php

declare(strict_types=1);

use OCP\Util;

/** @var \OCP\IL10N\IL10N $l */
$l = Util::getL10N('kuechenlager');
Util::addScript('kuechenlager', 'settings');
?>
<div id="kuechenlager-admin-settings">
	<h2><?php p($l->t('Kitchen inventory')); ?></h2>
	<form id="kuechenlager-webhook-settings" data-save-url="<?php p($_['saveUrl']); ?>">
		<label for="kuechenlager-webhook-url"><?php p($l->t('Low-stock webhook URL')); ?></label>
		<p><?php p($l->t('Send an HTTPS JSON webhook when an item drops below its minimum quantity. Leave blank to disable.')); ?></p>
		<input id="kuechenlager-webhook-url" type="url" name="webhook_url" value="<?php p($_['webhookUrl']); ?>"/>
		<button type="submit" class="button"><?php p($l->t('Save')); ?></button>
		<span id="kuechenlager-webhook-status" role="status" data-saved="<?php p($l->t('Saved.')); ?>" data-error="<?php p($l->t('Could not save webhook settings.')); ?>"></span>
	</form>
</div>
