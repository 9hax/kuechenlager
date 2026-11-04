<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Settings;

use OCA\Kuechenlager\AppInfo\Application;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IConfig;
use OCP\IURLGenerator;
use OCP\Settings\ISettings;

class AdminSettings implements ISettings {
	public function __construct(
		private IConfig $config,
		private IURLGenerator $urlGenerator,
	) {
	}

	public function getForm(): TemplateResponse {
		return new TemplateResponse(Application::APP_ID, 'settings/admin', [
			'webhookUrl' => $this->config->getAppValue(Application::APP_ID, 'low_stock_webhook_url', ''),
			'saveUrl' => $this->urlGenerator->linkToRoute('kuechenlager.adminSettings.saveWebhook'),
		]);
	}

	public function getSection(): string {
		return 'groupware';
	}

	public function getPriority(): int {
		return 50;
	}
}
