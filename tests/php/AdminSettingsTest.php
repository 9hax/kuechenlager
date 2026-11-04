<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Tests;

use OCA\Kuechenlager\Controller\AdminSettingsController;
use OCA\Kuechenlager\Settings\AdminSettings;
use OCP\AppFramework\Http\JSONResponse;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\IConfig;
use OCP\IL10N;
use OCP\IRequest;
use OCP\IURLGenerator;
use PHPUnit\Framework\TestCase;

final class AdminSettingsTest extends TestCase {
	public function testAdminSettingsExposeConfiguredWebhookInGroupwareSection(): void {
		$config = $this->createMock(IConfig::class);
		$config->expects(self::once())
			->method('getAppValue')
			->with('kuechenlager', 'low_stock_webhook_url', '')
			->willReturn('https://shopping.example.test/hooks');
		$urlGenerator = $this->createMock(IURLGenerator::class);
		$urlGenerator->expects(self::once())
			->method('linkToRoute')
			->with('kuechenlager.adminSettings.saveWebhook')
			->willReturn('/apps/kuechenlager/settings/webhook');
		$settings = new AdminSettings($config, $urlGenerator);

		$form = $settings->getForm();

		self::assertSame('groupware', $settings->getSection());
		self::assertSame(50, $settings->getPriority());
		self::assertSame('https://shopping.example.test/hooks', $form->getParams()['webhookUrl']);
		self::assertSame('/apps/kuechenlager/settings/webhook', $form->getParams()['saveUrl']);
	}

	public function testAdminEndpointSavesAValidHttpsWebhook(): void {
		$config = $this->createMock(IConfig::class);
		$config->expects(self::once())
			->method('setAppValue')
			->with('kuechenlager', 'low_stock_webhook_url', 'https://shopping.example.test/hooks');
		$controller = new AdminSettingsController(
			$this->createMock(IRequest::class),
			$config,
			$this->createMock(IL10N::class),
		);

		$response = $controller->saveWebhook(' https://shopping.example.test/hooks ');

		self::assertInstanceOf(JSONResponse::class, $response);
		self::assertSame(200, $response->getStatus());
		self::assertSame(['ok' => true], $response->getData());
		self::assertCount(0, (new \ReflectionMethod($controller, 'saveWebhook'))->getAttributes(NoAdminRequired::class));
	}

	public function testAdminEndpointRejectsNonHttpsWebhook(): void {
		$config = $this->createMock(IConfig::class);
		$config->expects(self::never())->method('setAppValue');
		$l10n = $this->createMock(IL10N::class);
		$l10n->method('t')->with('Webhook URL must be a valid HTTPS URL.')->willReturn('HTTPS required.');
		$controller = new AdminSettingsController(
			$this->createMock(IRequest::class),
			$config,
			$l10n,
		);

		$response = $controller->saveWebhook('http://shopping.example.test/hooks');

		self::assertSame(400, $response->getStatus());
		self::assertSame(['error' => 'HTTPS required.'], $response->getData());
	}

	public function testBlankWebhookUrlDisablesWebhook(): void {
		$config = $this->createMock(IConfig::class);
		$config->expects(self::once())->method('setAppValue')->with('kuechenlager', 'low_stock_webhook_url', '');
		$controller = new AdminSettingsController(
			$this->createMock(IRequest::class),
			$config,
			$this->createMock(IL10N::class),
		);

		self::assertSame(['ok' => true], $controller->saveWebhook('  ')->getData());
	}
}
