<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Service;

use OCA\Kuechenlager\AppInfo\Application;
use OCA\Kuechenlager\Db\StockItem;
use OCP\Http\Client\IClientService;
use OCP\IConfig;
use OCP\IL10N;
use Psr\Log\LoggerInterface;

class WebhookService {
	private const CONFIG_KEY = 'low_stock_webhook_url';

	public function __construct(
		private IConfig $config,
		private IClientService $clientService,
		private LoggerInterface $logger,
		private IL10N $l10n,
	) {
	}

	public static function isValidWebhookUrl(string $url): bool {
		$parts = parse_url(trim($url));
		return is_array($parts)
			&& strtolower($parts['scheme'] ?? '') === 'https'
			&& isset($parts['host'])
			&& $parts['host'] !== ''
			&& !isset($parts['user'])
			&& !isset($parts['pass'])
			&& !isset($parts['fragment']);
	}

	public function notifyLowStock(StockItem $item): void {
		$url = trim($this->config->getAppValue(Application::APP_ID, self::CONFIG_KEY, ''));
		if ($url === '') {
			return;
		}
		if (!self::isValidWebhookUrl($url)) {
			$this->logger->warning('Low-stock webhook URL is invalid; request was not sent.', ['app' => Application::APP_ID]);
			return;
		}

		$payload = [
			'content' => $this->l10n->t('Low stock: %s (%d/%d)', [
				$item->getArticle(),
				$item->getQuantity(),
				$item->getMinimumQuantity(),
			]),
			'allowed_mentions' => ['parse' => []],
			'event' => 'kuechenlager.stock.below_minimum',
			'item' => [
				'id' => (int)$item->getId(),
				'article' => $item->getArticle(),
				'quantity' => $item->getQuantity(),
				'minimum_quantity' => $item->getMinimumQuantity(),
				'manufacturer' => $item->getManufacturer(),
				'ean' => $item->getEan(),
			],
		];

		try {
			$response = $this->clientService->newClient()->post($url, [
				'body' => json_encode($payload, JSON_THROW_ON_ERROR),
				'headers' => ['Content-Type' => 'application/json'],
				'timeout' => 5,
				'allow_redirects' => false,
			]);
			$status = $response->getStatusCode();
			if ($status < 200 || $status >= 300) {
				$this->logger->warning('Low-stock webhook returned HTTP {status}.', [
					'app' => Application::APP_ID,
					'status' => $status,
				]);
			}
		} catch (\Exception $exception) {
			$this->logger->warning('Low-stock webhook request failed ({type}).', [
				'app' => Application::APP_ID,
				'type' => get_class($exception),
			]);
		}
	}
}
