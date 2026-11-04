<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Tests;

use OCA\Kuechenlager\Db\StockItem;
use OCA\Kuechenlager\Service\WebhookService;
use OCP\Http\Client\IClient;
use OCP\Http\Client\IClientService;
use OCP\Http\Client\IResponse;
use OCP\IConfig;
use OCP\IL10N;
use Psr\Log\LoggerInterface;
use PHPUnit\Framework\TestCase;

final class WebhookServiceTest extends TestCase {
	public function testWebhookUrlMustBeHttpsWithoutCredentialsOrFragment(): void {
		self::assertTrue(WebhookService::isValidWebhookUrl('https://shopping.example.test/hooks/kitchen'));
		self::assertFalse(WebhookService::isValidWebhookUrl('http://shopping.example.test/hooks'));
		self::assertFalse(WebhookService::isValidWebhookUrl('https://user:pass@shopping.example.test/hooks'));
		self::assertFalse(WebhookService::isValidWebhookUrl('https://shopping.example.test/hooks#fragment'));
		self::assertFalse(WebhookService::isValidWebhookUrl('file:///etc/passwd'));
	}

	public function testPostsLowStockEventToConfiguredWebhook(): void {
		$config = $this->createMock(IConfig::class);
		$config->expects(self::once())
			->method('getAppValue')
			->with('kuechenlager', 'low_stock_webhook_url', '')
			->willReturn('https://shopping.example.test/hooks');
		$response = $this->createMock(IResponse::class);
		$response->method('getStatusCode')->willReturn(202);
		$client = $this->createMock(IClient::class);
		$client->expects(self::once())
			->method('post')
			->with(
				'https://shopping.example.test/hooks',
				self::callback(static function (array $options): bool {
					$payload = json_decode($options['body'], true, 512, JSON_THROW_ON_ERROR);
					self::assertSame('application/json', $options['headers']['Content-Type']);
					self::assertSame(5, $options['timeout']);
					self::assertFalse($options['allow_redirects']);
					self::assertSame('kuechenlager.stock.below_minimum', $payload['event']);
					self::assertSame('Low stock: Oats (1/2)', $payload['content']);
					self::assertSame(['parse' => []], $payload['allowed_mentions']);
					self::assertSame('Oats', $payload['item']['article']);
					self::assertSame(1, $payload['item']['quantity']);
					self::assertSame(2, $payload['item']['minimum_quantity']);
					return true;
				}),
			)
			->willReturn($response);
		$clientService = $this->createMock(IClientService::class);
		$clientService->expects(self::once())->method('newClient')->willReturn($client);
		$l10n = $this->createMock(IL10N::class);
		$l10n->expects(self::once())
			->method('t')
			->with('Low stock: %s (%d/%d)', ['Oats', 1, 2])
			->willReturn('Low stock: Oats (1/2)');
		$logger = $this->createMock(LoggerInterface::class);
		$logger->expects(self::never())->method('warning');

		$item = new StockItem();
		$item->setId(8);
		$item->setArticle('Oats');
		$item->setQuantity(1);
		$item->setMinimumQuantity(2);
		(new WebhookService($config, $clientService, $logger, $l10n))->notifyLowStock($item);
	}

	public function testDoesNotSendWhenWebhookIsNotConfigured(): void {
		$config = $this->createMock(IConfig::class);
		$config->method('getAppValue')->willReturn('');
		$clientService = $this->createMock(IClientService::class);
		$clientService->expects(self::never())->method('newClient');

		$item = new StockItem();
		(new WebhookService($config, $clientService, $this->createMock(LoggerInterface::class), $this->createMock(IL10N::class)))->notifyLowStock($item);
	}

	public function testInvalidConfiguredUrlIsNotRequestedAndIsLogged(): void {
		$config = $this->createMock(IConfig::class);
		$config->method('getAppValue')->willReturn('http://shopping.example.test/hooks');
		$clientService = $this->createMock(IClientService::class);
		$clientService->expects(self::never())->method('newClient');
		$logger = $this->createMock(LoggerInterface::class);
		$logger->expects(self::once())->method('warning');

		$item = new StockItem();
		(new WebhookService($config, $clientService, $logger, $this->createMock(IL10N::class)))->notifyLowStock($item);
	}
}
