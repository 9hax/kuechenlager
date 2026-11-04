<?php

declare(strict_types=1);

use OCP\Util;

/** @var \OCP\IL10N\IL10N $l */
$l = Util::getL10N('kuechenlager');

Util::addScript('kuechenlager', 'qrcode-generator.min');
Util::addScript('kuechenlager', 'zxing');
Util::addScript('kuechenlager', 'jsqr');
Util::addScript('kuechenlager', 'html5qrcode.min');
Util::addScript('kuechenlager', 'lager');
Util::addStyle('kuechenlager', 'lager');
?>
<div id="app-content" class="app-lager">
	<header class="lager-header">
		<h1>
			<img class="app-icon" src="<?php p(image_path('kuechenlager', 'app-dark.svg')); ?>" alt=""/>
			<?php p($l->t('Kitchen inventory')); ?>
		</h1>
		<div class="search-box">
			<button id="lager-scan-btn" class="btn" type="button" title="<?php p($l->t('Scan barcode/QR')); ?>">&#128247; <?php p($l->t('Scan')); ?></button>
			<input type="search" id="lager-search" placeholder="<?php p($l->t('Search article or EAN …')); ?>" autocomplete="off"/>
			<div id="lager-search-results" class="search-results hidden"></div>
			<button id="lager-tags-btn" class="btn" type="button"><?php p($l->t('Manage tags')); ?></button>
			<button id="lager-shopping-list-btn" class="btn" type="button"><?php p($l->t('Shopping list')); ?></button>
			<button id="lager-history-btn" class="btn primary" type="button"><?php p($l->t('History')); ?></button>
		</div>
	</header>

	<div class="lager-layout">
		<section class="tree-pane">
			<div class="pane-toolbar">
				<button id="lager-add-location-btn" class="btn primary" type="button"><?php p($l->t('+ Location')); ?></button>
				<button id="lager-toggle-locations-pane-btn" class="btn sidebar-toggle mobile-sidebar-close" type="button" aria-expanded="true" aria-label="<?php p($l->t('Hide locations')); ?>" title="<?php p($l->t('Hide locations')); ?>">
					<img class="sidebar-toggle-icon" src="<?php p(image_path('core', 'actions/toggle-filelist.svg')); ?>" alt="" aria-hidden="true"/>
				</button>
			</div>
			<ul id="lager-tree" class="tree"></ul>
			<div id="lager-tree-empty" class="pane-empty hidden"></div>
		</section>

		<section class="detail-pane">
			<div class="detail-toolbar">
				<button id="lager-toggle-locations-btn" class="btn sidebar-toggle" type="button" aria-expanded="true" aria-label="<?php p($l->t('Hide locations')); ?>" title="<?php p($l->t('Hide locations')); ?>">
					<img class="sidebar-toggle-icon" src="<?php p(image_path('core', 'actions/toggle-filelist.svg')); ?>" alt="" aria-hidden="true"/>
				</button>
				<button id="lager-add-article-btn" class="btn primary" type="button" disabled><?php p($l->t('+ Add article')); ?></button>
				<span id="lager-add-article-hint" role="status"><?php p($l->t('Select a location.')); ?></span>
			</div>
			<div id="lager-detail" class="detail-empty"></div>
		</section>
	</div>

	<div id="lager-scan-modal" class="modal-overlay hidden">
		<div class="modal">
			<h2><?php p($l->t('Scan barcode / QR')); ?></h2>
			<div id="lager-scan-status" class="scan-status"><?php p($l->t('Starting camera …')); ?></div>
			<div id="html5-qrcode-region"></div>
			<div id="html5-file-decode" style="display:none;"></div>
			<div class="scan-row">
				<span class="scan-file-label"><?php p($l->t('Or load a photo:')); ?>
					<button id="lager-scan-file-btn" class="btn" type="button"><?php p($l->t('Choose file …')); ?></button>
				</span>
				<input type="file" id="lager-scan-file" accept="image/*" class="scan-file-input"/>
			</div>
			<div class="scan-manual">
				<label><?php p($l->t('Manual:')); ?></label>
				<input type="text" id="lager-scan-manual" placeholder="<?php p($l->t('EAN / code …')); ?>"/>
				<button id="lager-scan-manual-btn" class="btn primary" type="button"><?php p($l->t('Search')); ?></button>
			</div>
			<div class="scan-tip"><?php p($l->t('Tip: hold the code about 20–40 cm in front of the camera.')); ?></div>
			<div id="lager-scan-result" class="scan-result hidden"></div>
			<div class="modal-buttons">
				<button id="lager-scan-close" class="btn" type="button"><?php p($l->t('Close')); ?></button>
			</div>
		</div>
	</div>

	<div id="lager-qr-modal" class="modal-overlay hidden">
		<div class="modal">
			<h2><?php p($l->t('Show code')); ?></h2>
			<div id="lager-qr-content" class="qr-display"></div>
			<div class="modal-buttons">
				<button id="lager-qr-close" class="btn" type="button"><?php p($l->t('Close')); ?></button>
			</div>
		</div>
	</div>

	<footer class="lager-footer">
		<span><?php p($l->t('Based on')); ?> <a href="https://github.com/wenigdigital/lager" target="_blank" rel="noopener noreferrer">wenigdigital/lager</a>.</span>
		<a id="lager-donate-btn" href="https://paypal.me/ToniWenig" target="_blank" rel="noopener noreferrer"><?php p($l->t('Donate to the original project here.')); ?></a>
	</footer>
</div>
