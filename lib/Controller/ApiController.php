<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Controller;

use OCA\Kuechenlager\AppInfo\Application;
use OCA\Kuechenlager\Service\LagerService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Db\DoesNotExistException;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\DataDisplayResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http\JSONResponse;
use OCP\AppFramework\Http\Response;
use OCP\IL10N;
use OCP\IRequest;

class ApiController extends Controller {
	public function __construct(
		string $appName,
		IRequest $request,
		private LagerService $service,
		private IL10N $l10n,
	) {
		parent::__construct($appName, $request);
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function tree(): JSONResponse {
		return $this->handle(function (): array {
			return $this->service->getTree();
		});
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function stockBySlot(int $slot_id): JSONResponse {
		return $this->handle(function () use ($slot_id): array {
			return [
				'slot' => $this->service->getSlot($slot_id),
				'items' => $this->service->getStockBySlot($slot_id),
			];
		});
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function stockByCabinet(int $cabinet_id): JSONResponse {
		return $this->handle(function () use ($cabinet_id): array {
			return $this->service->getStockByCabinet($cabinet_id);
		});
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function stockByLocation(int $location_id): JSONResponse {
		return $this->handle(function () use ($location_id): array {
			return $this->service->getStockByLocation($location_id);
		});
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function shoppingList(): JSONResponse {
		return $this->handle(function (): array {
			return $this->service->getShoppingList();
		});
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function history(int $limit = 100, ?string $slot_id = null, ?string $article = null): JSONResponse {
		return $this->handle(function () use ($limit, $slot_id, $article): array {
			return $this->service->getHistory($limit, $slot_id, $article);
		});
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function search(string $q = ''): JSONResponse {
		return $this->handle(function () use ($q): array {
			return $this->service->searchStock($q);
		});
	}

	#[NoAdminRequired]
	public function createLocation(string $name, ?string $description = null): JSONResponse {
		return $this->handle(function () use ($name, $description): array {
			return $this->service->createLocation($name, $description);
		});
	}

	#[NoAdminRequired]
	public function updateLocation(int $id, ?string $name = null, ?string $description = null): JSONResponse {
		return $this->handle(function () use ($id, $name, $description): array {
			return $this->service->updateLocation($id, $name, $description);
		});
	}

	#[NoAdminRequired]
	public function deleteLocation(int $id): JSONResponse {
		return $this->handle(function () use ($id): array {
			$this->service->deleteLocation($id);
			return ['ok' => true];
		});
	}

	#[NoAdminRequired]
	public function createCabinet(int $location_id, string $name, ?string $description = null): JSONResponse {
		return $this->handle(function () use ($location_id, $name, $description): array {
			return $this->service->createCabinet($location_id, $name, $description);
		});
	}

	#[NoAdminRequired]
	public function updateCabinet(int $id, ?string $name = null, ?string $description = null): JSONResponse {
		return $this->handle(function () use ($id, $name, $description): array {
			return $this->service->updateCabinet($id, $name, $description);
		});
	}

	#[NoAdminRequired]
	public function deleteCabinet(int $id): JSONResponse {
		return $this->handle(function () use ($id): array {
			$this->service->deleteCabinet($id);
			return ['ok' => true];
		});
	}

	#[NoAdminRequired]
	public function createSlot(int $cabinet_id, string $name, ?string $description = null): JSONResponse {
		return $this->handle(function () use ($cabinet_id, $name, $description): array {
			return $this->service->createSlot($cabinet_id, $name, $description);
		});
	}

	#[NoAdminRequired]
	public function updateSlot(int $id, ?string $name = null, ?string $description = null): JSONResponse {
		return $this->handle(function () use ($id, $name, $description): array {
			return $this->service->updateSlot($id, $name, $description);
		});
	}

	#[NoAdminRequired]
	public function deleteSlot(int $id): JSONResponse {
		return $this->handle(function () use ($id): array {
			$this->service->deleteSlot($id);
			return ['ok' => true];
		});
	}

	#[NoAdminRequired]
	public function createStock(?int $slot_id = null, string $article = '', ?string $description = null, int $quantity = 0, ?string $ean = null, ?int $cabinet_id = null, int $minimum_quantity = 0): JSONResponse {
		$manufacturer = $this->request->getParam('manufacturer');
		$notes = $this->request->getParam('notes');
		$tags = $this->request->getParam('tags');
		// Fallback: read from JSON body if parameter not resolved
		if ($ean === null) {
			$ean = $this->getJsonParam('ean');
		}
		return $this->handle(function () use ($slot_id, $cabinet_id, $article, $description, $quantity, $ean, $manufacturer, $notes, $tags, $minimum_quantity): array {
			if (($slot_id === null) === ($cabinet_id === null)) {
			throw new \InvalidArgumentException($this->l10n->t('Select a cabinet or slot.'));
			}
			$create = $slot_id === null
			? $this->service->createStockInCabinet(
				$cabinet_id,
				$article,
				$notes !== null ? (string)$notes : $description,
				$quantity,
				$ean,
				$manufacturer !== null ? (string)$manufacturer : null,
				$this->parseTagNames($tags),
				$minimum_quantity,
			)
			: $this->service->createStock(
				$slot_id,
				$article,
				$notes !== null ? (string)$notes : $description,
				$quantity,
				$ean,
				$manufacturer !== null ? (string)$manufacturer : null,
				$this->parseTagNames($tags),
				$minimum_quantity,
			);
			return $create;
		});
	}

	#[NoAdminRequired]
	public function updateStock(int $id, ?string $article = null, ?string $description = null, ?string $ean = null, ?int $minimum_quantity = null): JSONResponse {
		$manufacturer = $this->request->getParam('manufacturer');
		$notes = $this->request->getParam('notes');
		$tags = $this->request->getParam('tags');
		// Fallback: read from JSON body if parameter not resolved
		if ($ean === null && $this->request->getHeader('Content-Type') !== '') {
			$ean = $this->getJsonParam('ean');
		}
		return $this->handle(function () use ($id, $article, $description, $ean, $manufacturer, $notes, $tags, $minimum_quantity): array {
			return $this->service->updateStock(
				$id,
				$article,
				$notes !== null ? (string)$notes : $description,
				$ean,
				$manufacturer !== null ? (string)$manufacturer : null,
				$tags !== null ? $this->parseTagNames($tags) : null,
				$minimum_quantity,
			);
		});
	}

	#[NoAdminRequired]
	public function deleteStock(int $id): JSONResponse {
		return $this->handle(function () use ($id): array {
			$this->service->deleteStock($id);
			return ['ok' => true];
		});
	}

	#[NoAdminRequired]
	public function createMovement(int $stock_id, string $type, int $quantity, ?string $note = null): JSONResponse {
		return $this->handle(function () use ($stock_id, $type, $quantity, $note): array {
			return $this->service->moveStock($stock_id, $type, $quantity, $note);
		});
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function scanByCode(string $code): JSONResponse {
		return $this->handle(function () use ($code): array {
			$result = $this->service->searchByCode($code);
			if ($result === null) {
				throw new DoesNotExistException($this->l10n->t('No article found for this code.'));
			}
			return $result;
		});
	}

	#[NoAdminRequired]
	public function uploadStockImage(int $id): JSONResponse {
		return $this->handle(function () use ($id): array {
			$file = $this->request->getUploadedFile('file');
			if (!is_array($file) || (int)($file['error'] ?? \UPLOAD_ERR_NO_FILE) !== \UPLOAD_ERR_OK || empty($file['tmp_name'])) {
				throw new \InvalidArgumentException($this->l10n->t('No image uploaded.'));
			}
			if ((int)$file['size'] > 10 * 1024 * 1024) {
				throw new \InvalidArgumentException($this->l10n->t('Image is too large (max. 10 MB).'));
			}
			return $this->service->saveItemImage($id, (string)$file['tmp_name']);
		});
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function getStockImage(int $id): Response {
		$data = $this->service->getItemImage($id);
		if ($data === null) {
			// no-store: ein fehlendes Bild darf NICHT im Browser-Cache landen,
			// sonst bliebe das Thumbnail nach spaeterem Upload unsichtbar.
			return new DataResponse(['error' => $this->l10n->t('Not found.')], Http::STATUS_NOT_FOUND, [
				'Cache-Control' => 'no-store',
			]);
		}

		return new DataDisplayResponse($data, Http::STATUS_OK, [
			'Content-Type' => 'image/jpeg',
			'Cache-Control' => 'no-cache',
		]);
	}

	#[NoAdminRequired]
	public function uploadLocationImage(int $id): JSONResponse {
		return $this->handle(function () use ($id): array {
			$file = $this->request->getUploadedFile('file');
			if (!is_array($file) || (int)($file['error'] ?? \UPLOAD_ERR_NO_FILE) !== \UPLOAD_ERR_OK || empty($file['tmp_name'])) {
				throw new \InvalidArgumentException($this->l10n->t('No image uploaded.'));
			}
			if ((int)$file['size'] > 10 * 1024 * 1024) {
				throw new \InvalidArgumentException($this->l10n->t('Image is too large (max. 10 MB).'));
			}
			return $this->service->saveLocationImage($id, (string)$file['tmp_name']);
		});
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function getLocationImage(int $id): Response {
		try {
			$data = $this->service->getLocationImage($id);
		} catch (DoesNotExistException) {
			$data = null;
		}
		if ($data === null) {
			return new DataResponse(['error' => $this->l10n->t('Not found.')], Http::STATUS_NOT_FOUND, [
				'Cache-Control' => 'no-store',
			]);
		}

		return new DataDisplayResponse($data, Http::STATUS_OK, [
			'Content-Type' => 'image/jpeg',
			'Cache-Control' => 'no-cache',
		]);
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function tags(): JSONResponse {
		return $this->handle(function (): array {
			return $this->service->getTags();
		});
	}

	#[NoAdminRequired]
	public function createTag(string $name): JSONResponse {
		return $this->handle(function () use ($name): array {
			return $this->service->createTag($name);
		});
	}

	#[NoAdminRequired]
	public function updateTag(int $id, string $name): JSONResponse {
		return $this->handle(function () use ($id, $name): array {
			return $this->service->updateTag($id, $name);
		});
	}

	#[NoAdminRequired]
	public function deleteTag(int $id): JSONResponse {
		return $this->handle(function () use ($id): array {
			$this->service->deleteTag($id);
			return ['ok' => true];
		});
	}

	/**
	 * @return string[]
	 */
	private function parseTagNames(mixed $value): array {
		if (!is_string($value) || trim($value) === '') {
			return [];
		}
		return array_map('trim', explode(',', $value));
	}

	private function getJsonParam(string $key): ?string {
		$params = $this->request->getParams();
		if (isset($params[$key]) && $params[$key] !== '') {
			return (string)$params[$key];
		}
		// Try to parse raw JSON body
		$body = $this->request->getParam($key);
		if ($body !== null && $body !== '') {
			return (string)$body;
		}
		return null;
	}

	private function handle(callable $fn): JSONResponse {
		try {
			return new JSONResponse($fn());
		} catch (DoesNotExistException $e) {
			return new JSONResponse(['error' => $this->l10n->t('Not found.')], Http::STATUS_NOT_FOUND);
		} catch (\InvalidArgumentException $e) {
			return new JSONResponse(['error' => $e->getMessage()], Http::STATUS_BAD_REQUEST);
		} catch (\Throwable $e) {
			return new JSONResponse(['error' => $this->l10n->t('Unexpected error.')], Http::STATUS_INTERNAL_SERVER_ERROR);
		}
	}
}
