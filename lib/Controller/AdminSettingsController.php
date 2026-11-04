<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Controller;

use OCA\Kuechenlager\AppInfo\Application;
use OCA\Kuechenlager\Service\WebhookService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IL10N;
use OCP\IRequest;

class AdminSettingsController extends Controller {
	public function __construct(
		IRequest $request,
		private IConfig $config,
		private IL10N $l10n,
	) {
		parent::__construct(Application::APP_ID, $request);
	}

	public function saveWebhook(?string $webhook_url = null): JSONResponse {
		$url = trim($webhook_url ?? '');
		if ($url !== '' && !WebhookService::isValidWebhookUrl($url)) {
			return new JSONResponse(['error' => $this->l10n->t('Webhook URL must be a valid HTTPS URL.')], 400);
		}

		$this->config->setAppValue(Application::APP_ID, 'low_stock_webhook_url', $url);
		return new JSONResponse(['ok' => true]);
	}
}
