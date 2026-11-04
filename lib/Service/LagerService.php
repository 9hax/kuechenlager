<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Service;

use OCA\Kuechenlager\Db\Cabinet;
use OCA\Kuechenlager\Db\CabinetMapper;
use OCA\Kuechenlager\Db\Location;
use OCA\Kuechenlager\Db\LocationMapper;
use OCA\Kuechenlager\Db\Movement;
use OCA\Kuechenlager\Db\MovementMapper;
use OCA\Kuechenlager\Db\Slot;
use OCA\Kuechenlager\Db\SlotMapper;
use OCA\Kuechenlager\Db\StockItem;
use OCA\Kuechenlager\AppInfo\Application;
use OCA\Kuechenlager\Db\StockItemMapper;
use OCA\Kuechenlager\Db\Tag;
use OCA\Kuechenlager\Db\TagMapper;
use OCP\Files\AppData\IAppDataFactory;
use OCP\Files\IAppData;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\IL10N;
use OCP\IDBConnection;
use OCP\IUser;
use OCP\IUserSession;

class LagerService {
	public function __construct(
		private IDBConnection $db,
		private LocationMapper $locationMapper,
		private CabinetMapper $cabinetMapper,
		private SlotMapper $slotMapper,
		private StockItemMapper $stockMapper,
		private MovementMapper $movementMapper,
		private IUserSession $userSession,
		private IL10N $l10n,
		private IAppDataFactory $appDataFactory,
		private TagMapper $tagMapper,
		private WebhookService $webhookService,
	) {
	}

	private function appData(): IAppData {
		return $this->appDataFactory->get(Application::APP_ID);
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public function getTree(): array {
		$locations = $this->locationMapper->findAll();
		$cabinets = $this->cabinetMapper->findAll();
		$slots = $this->slotMapper->findAll();
		$stocks = $this->stockMapper->findAll();

		$qtyBySlot = [];
		$qtyByCabinet = [];
		foreach ($stocks as $stock) {
			if ($stock->getSlotId() !== null) {
				$slotId = (int)$stock->getSlotId();
				$qtyBySlot[$slotId] = ($qtyBySlot[$slotId] ?? 0) + (int)$stock->getQuantity();
			} elseif ($stock->getCabinetId() !== null) {
				$cabinetId = (int)$stock->getCabinetId();
				$qtyByCabinet[$cabinetId] = ($qtyByCabinet[$cabinetId] ?? 0) + (int)$stock->getQuantity();
			}
		}

		$slotsByCabinet = [];
		foreach ($slots as $slot) {
			$cabId = (int)$slot->getCabinetId();
			$slotArr = $slot->jsonSerialize();
			$slotArr['total_qty'] = $qtyBySlot[(int)$slot->getId()] ?? 0;
			$slotsByCabinet[$cabId][] = $slotArr;
		}

		$cabinetsByLocation = [];
		foreach ($cabinets as $cabinet) {
			$locId = (int)$cabinet->getLocationId();
			$cabId = (int)$cabinet->getId();
			$cabArr = $cabinet->jsonSerialize();
			$cabArr['slots'] = $slotsByCabinet[$cabId] ?? [];
			$cabTotal = $qtyByCabinet[$cabId] ?? 0;
			foreach ($cabArr['slots'] as $s) { $cabTotal += (int)$s['total_qty']; }
			$cabArr['total_qty'] = $cabTotal;
			$cabinetsByLocation[$locId][] = $cabArr;
		}

		$result = [];
		foreach ($locations as $location) {
			$locId = (int)$location->getId();
			$locArr = $location->jsonSerialize();
			$cabArrs = $cabinetsByLocation[$locId] ?? [];
			$totalQty = 0;
			foreach ($cabArrs as $cabArr) { $totalQty += $cabArr['total_qty']; }
			$locArr['cabinets'] = $cabArrs;
			$locArr['total_qty'] = $totalQty;
			$locArr['has_image'] = $this->hasLocationImage($locId);
			$result[] = $locArr;
		}

		return $result;
	}

	public function getLocation(int $id): Location {
		return $this->locationMapper->find($id);
	}

	public function getCabinet(int $id): Cabinet {
		return $this->cabinetMapper->find($id);
	}

	public function getSlot(int $id): array {
		$slot = $this->slotMapper->find($id);
		$cabinet = $this->cabinetMapper->find((int)$slot->getCabinetId());
		$location = $this->locationMapper->find((int)$cabinet->getLocationId());
		$arr = $slot->jsonSerialize();
		$arr['path'] = trim($location->getName() . ' / ' . $cabinet->getName() . ' / ' . $slot->getName(), ' /');
		return $arr;
	}

	public function getStockBySlot(int $slotId): array {
		$slot = $this->getSlot($slotId);
		$result = [];
		foreach ($this->stockMapper->findBySlot($slotId) as $item) {
			$arr = $this->stockResponse($item);
			$arr['cabinet_id'] = (int)$slot['cabinet_id'];
			$arr['slot_id'] = $slotId;
			$arr['container_path'] = $slot['name'];
			$arr['has_image'] = $this->hasItemImage((int)$item->getId());
			$result[] = $arr;
		}
		return $result;
	}

	/**
	 * @return array{cabinet: array<string, mixed>, items: array<int, array<string, mixed>>}
	 */
	public function getStockByCabinet(int $cabinetId): array {
		$cabinet = $this->cabinetMapper->find($cabinetId);
		return [
			'cabinet' => $cabinet->jsonSerialize(),
			'items' => $this->stockItemsForCabinet($cabinet),
		];
	}

	/**
	 * @return array{location: array<string, mixed>, items: array<int, array<string, mixed>>}
	 */
	public function getStockByLocation(int $locationId): array {
		$location = $this->locationMapper->find($locationId);
		$items = [];
		foreach ($this->cabinetMapper->findByLocation($locationId) as $cabinet) {
			array_push($items, ...$this->stockItemsForCabinet($cabinet));
		}
		return [
			'location' => $location->jsonSerialize(),
			'items' => $items,
		];
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public function getShoppingList(): array {
		$items = [];
		foreach ($this->stockMapper->findAll() as $stock) {
			if ($stock->getQuantity() >= $stock->getMinimumQuantity()) {
				continue;
			}
			$item = $this->stockToSearchResult($stock->jsonSerialize());
			$item['needed_quantity'] = $stock->getMinimumQuantity() - $stock->getQuantity();
			$items[] = $item;
		}
		return $items;
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	private function stockItemsForCabinet(Cabinet $cabinet): array {
		$items = [];
		foreach ($this->stockMapper->findByCabinet((int)$cabinet->getId()) as $stock) {
			$items[] = $this->stockWithContainerPath($stock, $cabinet);
		}
		foreach ($this->slotMapper->findByCabinet((int)$cabinet->getId()) as $slot) {
			foreach ($this->stockMapper->findBySlot((int)$slot->getId()) as $stock) {
				$items[] = $this->stockWithContainerPath($stock, $cabinet, $slot);
			}
		}
		return $items;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function stockWithContainerPath(StockItem $stock, Cabinet $cabinet, ?Slot $slot = null): array {
		$item = $this->stockResponse($stock);
		$item['cabinet_id'] = (int)$cabinet->getId();
		$item['slot_id'] = $slot === null ? null : (int)$slot->getId();
		$item['container_path'] = $cabinet->getName() . ($slot === null ? '' : ' / ' . $slot->getName());
		$item['has_image'] = $this->hasItemImage((int)$stock->getId());
		return $item;
	}

	public function createLocation(string $name, ?string $description): array {
		$name = $this->normalizeName($name, 'Name');
		if ($this->locationMapper->findByName($name) !== null) {
			throw new \InvalidArgumentException($this->l10n->t('A location with this name already exists.'));
		}
		$location = new Location();
		$location->setName($name);
		$location->setDescription($this->normalizeDescription($description));
		$location->setCreatedAt(time());
		return $this->locationMapper->insert($location)->jsonSerialize();
	}

	public function updateLocation(int $id, ?string $name, ?string $description): array {
		$location = $this->locationMapper->find($id);
		if ($name !== null) {
			$newName = $this->normalizeName($name, 'Name');
			if ($this->locationNameExists($newName, $id)) {
				throw new \InvalidArgumentException($this->l10n->t('A location with this name already exists.'));
			}
			$location->setName($newName);
		}
		if ($description !== null) {
			$location->setDescription($this->normalizeDescription($description));
		}
		return $this->locationMapper->update($location)->jsonSerialize();
	}

	public function deleteLocation(int $id): void {
		$this->db->beginTransaction();
		try {
			$location = $this->locationMapper->find($id);
			foreach ($this->cabinetMapper->findByLocation($id) as $cabinet) {
				$this->deleteCabinetInTransaction((int)$cabinet->getId());
			}
			$this->deleteLocationImage($id);
			$this->locationMapper->delete($location);
			$this->db->commit();
		} catch (\Throwable $e) {
			$this->db->rollBack();
			throw $e;
		}
	}

	public function createCabinet(int $locationId, string $name, ?string $description): array {
		$location = $this->locationMapper->find($locationId);
		$name = $this->normalizeName($name, 'Name');
		$cabinet = new Cabinet();
		$cabinet->setLocationId($locationId);
		$cabinet->setName($name);
		$cabinet->setDescription($this->normalizeDescription($description));
		$cabinet->setCreatedAt(time());
		return $this->cabinetMapper->insert($cabinet)->jsonSerialize();
	}

	public function updateCabinet(int $id, ?string $name, ?string $description): array {
		$cabinet = $this->cabinetMapper->find($id);
		if ($name !== null) {
			$cabinet->setName($this->normalizeName($name, 'Name'));
		}
		if ($description !== null) {
			$cabinet->setDescription($this->normalizeDescription($description));
		}
		return $this->cabinetMapper->update($cabinet)->jsonSerialize();
	}

	public function deleteCabinet(int $id): void {
		$this->db->beginTransaction();
		try {
			$this->deleteCabinetInTransaction($id);
			$this->db->commit();
		} catch (\Throwable $e) {
			$this->db->rollBack();
			throw $e;
		}
	}

	private function deleteCabinetInTransaction(int $id): void {
		$cabinet = $this->cabinetMapper->find($id);
		foreach ($this->stockMapper->findByCabinet($id) as $stock) {
			$this->deleteStockInTransaction((int)$stock->getId());
		}
		foreach ($this->slotMapper->findByCabinet($id) as $slot) {
			$this->deleteSlotInTransaction((int)$slot->getId());
		}
		$this->cabinetMapper->delete($cabinet);
	}

	public function createSlot(int $cabinetId, string $name, ?string $description): array {
		$cabinet = $this->cabinetMapper->find($cabinetId);
		$name = $this->normalizeName($name, 'Name');
		$slot = new Slot();
		$slot->setCabinetId($cabinetId);
		$slot->setName($name);
		$slot->setDescription($this->normalizeDescription($description));
		$slot->setCreatedAt(time());
		return $this->slotMapper->insert($slot)->jsonSerialize();
	}

	public function updateSlot(int $id, ?string $name, ?string $description): array {
		$slot = $this->slotMapper->find($id);
		if ($name !== null) {
			$slot->setName($this->normalizeName($name, 'Name'));
		}
		if ($description !== null) {
			$slot->setDescription($this->normalizeDescription($description));
		}
		return $this->slotMapper->update($slot)->jsonSerialize();
	}

	public function deleteSlot(int $id): void {
		$this->db->beginTransaction();
		try {
			$this->deleteSlotInTransaction($id);
			$this->db->commit();
		} catch (\Throwable $e) {
			$this->db->rollBack();
			throw $e;
		}
	}

	private function deleteSlotInTransaction(int $id): void {
		$slot = $this->slotMapper->find($id);
		foreach ($this->stockMapper->findBySlot($id) as $stock) {
			$this->deleteStockInTransaction((int)$stock->getId());
		}
		$this->slotMapper->delete($slot);
	}

	public function createStock(
		int $slotId,
		string $article,
		?string $description,
		int $quantity,
		?string $ean = null,
		?string $manufacturer = null,
		array $tagNames = [],
		int $minimumQuantity = 0,
	): array {
		$slot = $this->slotMapper->find($slotId);
		return $this->createStockInContainer(
			$slotId,
			(int)$slot->getCabinetId(),
			$article,
			$description,
			$quantity,
			$ean,
			$manufacturer,
			$tagNames,
			$minimumQuantity,
		);
	}

	public function createStockInCabinet(
		int $cabinetId,
		string $article,
		?string $description,
		int $quantity,
		?string $ean = null,
		?string $manufacturer = null,
		array $tagNames = [],
		int $minimumQuantity = 0,
	): array {
		$this->cabinetMapper->find($cabinetId);
		return $this->createStockInContainer(
			null,
			$cabinetId,
			$article,
			$description,
			$quantity,
			$ean,
			$manufacturer,
			$tagNames,
			$minimumQuantity,
		);
	}

	private function createStockInContainer(
		?int $slotId,
		int $cabinetId,
		string $article,
		?string $description,
		int $quantity,
		?string $ean,
		?string $manufacturer,
		array $tagNames,
		int $minimumQuantity,
	): array {
		$article = $this->normalizeArticle($article);
		$quantity = max(0, $quantity);
		$minimumQuantity = max(0, $minimumQuantity);
		$existing = $slotId === null
			? $this->stockMapper->findByCabinetAndArticle($cabinetId, $article)
			: $this->stockMapper->findBySlotAndArticle($slotId, $article);
		if ($existing !== null) {
			if ($quantity > 0) {
				return $this->recordMovement($existing, 'in', $quantity, $this->l10n->t('Initial stock'))->jsonSerialize();
			}
			$message = $slotId === null
				? $this->l10n->t('This article is already in this location.')
				: $this->l10n->t('This article is already in the slot.');
			throw new \InvalidArgumentException($message);
		}
		$stock = new StockItem();
		$stock->setSlotId($slotId);
		$stock->setCabinetId($cabinetId);
		$stock->setArticle($article);
		$stock->setDescription($this->normalizeDescription($description));
		$stock->setManufacturer($this->normalizeManufacturer($manufacturer));
		$stock->setQuantity(0);
		$stock->setMinimumQuantity($minimumQuantity);
		$ean = $this->normalizeEan($ean);
		$this->assertEanAvailable($ean);
		$stock->setEan($ean);
		$stock->setCreatedAt(time());
		$stock->setUpdatedAt(time());
		$stock = $this->stockMapper->insert($stock);
		if ($tagNames !== []) {
			$this->setTagsForStockItem((int)$stock->getId(), $tagNames);
		}
		if ($quantity > 0) {
			$stock = $this->recordMovement($stock, 'in', $quantity, $this->l10n->t('Initial stock'));
		}
		if ($stock->getQuantity() < $stock->getMinimumQuantity()) {
			$this->webhookService->notifyLowStock($stock);
		}
		return $this->stockResponse($stock);
	}

	public function updateStock(
		int $id,
		?string $article,
		?string $description,
		?string $ean = null,
		?string $manufacturer = null,
		?array $tagNames = null,
		?int $minimumQuantity = null,
	): array {
		$stock = $this->stockMapper->find($id);
		$wasBelowMinimum = $stock->getQuantity() < $stock->getMinimumQuantity();
		if ($article !== null) {
			$article = $this->normalizeArticle($article);
			$existing = $stock->getSlotId() === null
				? $this->stockMapper->findByCabinetAndArticle((int)$stock->getCabinetId(), $article)
				: $this->stockMapper->findBySlotAndArticle((int)$stock->getSlotId(), $article);
			if ($existing !== null && (int)$existing->getId() !== (int)$stock->getId()) {
				$message = $stock->getSlotId() === null
					? $this->l10n->t('This article is already in this location.')
					: $this->l10n->t('This article is already in the slot.');
				throw new \InvalidArgumentException($message);
			}
			$stock->setArticle($article);
		}
		if ($description !== null) {
			$stock->setDescription($this->normalizeDescription($description));
		}
		if ($manufacturer !== null) {
			$stock->setManufacturer($this->normalizeManufacturer($manufacturer));
		}
		if ($ean !== null) {
			$ean = $this->normalizeEan($ean);
			$this->assertEanAvailable($ean, (int)$stock->getId());
			$stock->setEan($ean);
		}
		if ($minimumQuantity !== null) {
			$stock->setMinimumQuantity(max(0, $minimumQuantity));
		}
		$stock->setUpdatedAt(time());
		$stock = $this->stockMapper->update($stock);
		if ($tagNames !== null) {
			$this->setTagsForStockItem((int)$stock->getId(), $tagNames);
		}
		if (!$wasBelowMinimum && $stock->getQuantity() < $stock->getMinimumQuantity()) {
			$this->webhookService->notifyLowStock($stock);
		}
		return $this->stockResponse($stock);
	}

	public function deleteStock(int $id): void {
		$this->db->beginTransaction();
		try {
			$this->deleteStockInTransaction($id);
			$this->db->commit();
		} catch (\Throwable $e) {
			$this->db->rollBack();
			throw $e;
		}
	}

	private function deleteStockInTransaction(int $id): void {
		$stock = $this->stockMapper->find($id);
		if ((int)$stock->getQuantity() > 0) {
			throw new \InvalidArgumentException($this->l10n->t('Stock can only be deleted with a quantity of 0.'));
		}
		$this->tagMapper->deleteForStockItem((int)$stock->getId());
		$this->deleteItemImage((int)$stock->getId());
		$this->stockMapper->delete($stock);
	}

	/**
	 * @return array<int, array{id: int, name: string}>
	 */
	public function getTags(): array {
		return array_map(
			static fn (Tag $tag): array => $tag->jsonSerialize(),
			$this->tagMapper->findAll(),
		);
	}

	public function createTag(string $name): array {
		$name = $this->normalizeTagName($name);
		if ($this->tagMapper->findByName($name) !== null) {
			throw new \InvalidArgumentException($this->l10n->t('A tag with this name already exists.'));
		}
		$tag = new Tag();
		$tag->setName($name);
		return $this->tagMapper->insert($tag)->jsonSerialize();
	}

	public function updateTag(int $id, string $name): array {
		$tag = $this->tagMapper->find($id);
		$name = $this->normalizeTagName($name);
		$existing = $this->tagMapper->findByName($name);
		if ($existing !== null && (int)$existing->getId() !== $id) {
			throw new \InvalidArgumentException($this->l10n->t('A tag with this name already exists.'));
		}
		$tag->setName($name);
		return $this->tagMapper->update($tag)->jsonSerialize();
	}

	public function deleteTag(int $id): void {
		$this->db->beginTransaction();
		try {
			$tag = $this->tagMapper->find($id);
			$this->tagMapper->deleteForTag($id);
			$this->tagMapper->delete($tag);
			$this->db->commit();
		} catch (\Throwable $e) {
			$this->db->rollBack();
			throw $e;
		}
	}

	/**
	 * Speichert das Artikelbild (max. 1024px, JPEG) in der App-Datenbank (app_data).
	 */
	public function saveItemImage(int $itemId, string $tmpPath): array {
		$this->stockMapper->find($itemId);
		return $this->saveImage('item_' . $itemId . '.jpg', $tmpPath);
	}

	public function saveLocationImage(int $locationId, string $tmpPath): array {
		$this->locationMapper->find($locationId);
		return $this->saveImage('location_' . $locationId . '.jpg', $tmpPath);
	}

	private function saveImage(string $name, string $tmpPath): array {
		$maxSide = 1024;
		$jpeg = null;
		$src = @imagecreatefromstring((string)file_get_contents($tmpPath));
		if ($src !== false) {
			$w = imagesx($src);
			$h = imagesy($src);
			$scale = min(1.0, $maxSide / max($w, $h));
			$nw = max(1, (int)round($w * $scale));
			$nh = max(1, (int)round($h * $scale));
			$dst = imagecreatetruecolor($nw, $nh);
			imagealphablending($dst, false);
			imagesavealpha($dst, true);
			imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
			ob_start();
			imagejpeg($dst, null, 82);
			$jpeg = (string)ob_get_clean();
			imagedestroy($dst);
			imagedestroy($src);
		}
		if ($jpeg === null || $jpeg === '') {
			throw new \InvalidArgumentException($this->l10n->t('Image could not be processed.'));
		}
		if (strlen($jpeg) > 2 * 1024 * 1024) {
			throw new \InvalidArgumentException($this->l10n->t('Image is too large (max. 2 MB after compression).'));
		}
		$folder = $this->appData()->getFolder('/');
		if ($folder->fileExists($name)) {
			$folder->getFile($name)->putContent($jpeg);
		} else {
			$folder->newFile($name, $jpeg);
		}
		return ['ok' => true, 'size' => strlen($jpeg)];
	}

	public function getItemImage(int $itemId): ?string {
		return $this->getImage('item_' . $itemId . '.jpg');
	}

	public function hasItemImage(int $itemId): bool {
		return $this->appData()->getFolder('/')->fileExists('item_' . $itemId . '.jpg');
	}

	public function deleteItemImage(int $itemId): void {
		$this->deleteImage('item_' . $itemId . '.jpg');
	}

	public function getLocationImage(int $locationId): ?string {
		$this->locationMapper->find($locationId);
		return $this->getImage('location_' . $locationId . '.jpg');
	}

	public function hasLocationImage(int $locationId): bool {
		return $this->appData()->getFolder('/')->fileExists('location_' . $locationId . '.jpg');
	}

	public function deleteLocationImage(int $locationId): void {
		$this->deleteImage('location_' . $locationId . '.jpg');
	}

	private function getImage(string $name): ?string {
		$folder = $this->appData()->getFolder('/');
		if (!$folder->fileExists($name)) {
			return null;
		}
		return $folder->getFile($name)->getContent();
	}

	private function deleteImage(string $name): void {
		$folder = $this->appData()->getFolder('/');
		if ($folder->fileExists($name)) {
			$folder->getFile($name)->delete();
		}
	}

	public function moveStock(int $stockId, string $type, int $quantity, ?string $note): array {
		return $this->recordMovement(
			$this->stockMapper->find($stockId),
			$type,
			$quantity,
			$note,
		)->jsonSerialize();
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public function getHistory(int $limit, ?string $slotId, ?string $article): array {
		$limit = max(1, min(500, $limit));
		$limit = (int)$limit;
		$slotId = $slotId === null || $slotId === '' ? null : (int)$slotId;
		$rows = $this->movementMapper->findRecent($limit, $slotId, $article);
		return array_map(static function (Movement $m): array {
			return $m->jsonSerialize();
		}, $rows);
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public function searchStock(string $q): array {
		$q = trim($q);
		if (mb_strlen($q) < 2) {
			return [];
		}
		$rows = $this->stockMapper->findByArticleLike($q);
		$result = [];
		foreach ($rows as $stock) {
			$slot = $stock->getSlotId() === null ? null : $this->slotMapper->find((int)$stock->getSlotId());
			$cabinetId = $stock->getCabinetId() ?? $slot?->getCabinetId();
			$cabinet = $this->cabinetMapper->find((int)$cabinetId);
			$location = $this->locationMapper->find((int)$cabinet->getLocationId());
			$stockArr = $this->stockResponse($stock);
			$stockArr['cabinet_id'] = (int)$cabinet->getId();
			$stockArr['slot_id'] = $slot === null ? null : (int)$slot->getId();
			$stockArr['slot_path'] = $location->getName() . ' / ' . $cabinet->getName()
				. ($slot === null ? '' : ' / ' . $slot->getName());
			$result[] = $stockArr;
		}
		return $result;
	}

	private function recordMovement(StockItem $stock, string $type, int $quantity, ?string $note): StockItem {
		$type = strtolower(trim($type));
		if (!in_array($type, ['in', 'out'], true)) {
			throw new \InvalidArgumentException($this->l10n->t('Movement type must be "in" or "out".'));
		}
		$quantity = (int)$quantity;
		if ($quantity <= 0) {
			throw new \InvalidArgumentException($this->l10n->t('Quantity must be greater than 0.'));
		}
		$now = time();
		$slot = $stock->getSlotId() === null ? null : $this->slotMapper->find((int)$stock->getSlotId());
		$cabinetId = $stock->getCabinetId() ?? $slot?->getCabinetId();
		$cabinet = $this->cabinetMapper->find((int)$cabinetId);
		$location = $this->locationMapper->find((int)$cabinet->getLocationId());
		$user = $this->userSession->getUser();
		$previousQuantity = $stock->getQuantity();

		$this->db->beginTransaction();
		try {
			$stock = $this->updateStockQuantityAtomically((int)$stock->getId(), $type, $quantity, $now);

			$note = $this->normalizeDescription($note);
			$movement = new Movement();
			$movement->setStockId((int)$stock->getId());
			$movement->setSlotId($slot === null ? null : (int)$slot->getId());
			$movement->setArticle($stock->getArticle());
			$movement->setLocationName($location->getName());
			$movement->setCabinetName($cabinet->getName());
			$movement->setSlotName($slot?->getName() ?? '');
			$movement->setType($type);
			$movement->setQuantity($quantity);
			$movement->setNote($note);
			$movement->setUser($user instanceof IUser ? $user->getUID() : '');
			$movement->setCreatedAt($now);
			$this->movementMapper->insert($movement);

			$this->db->commit();
			if ($previousQuantity >= $stock->getMinimumQuantity()
				&& $stock->getQuantity() < $stock->getMinimumQuantity()) {
				$this->webhookService->notifyLowStock($stock);
			}
			return $stock;
		} catch (\Throwable $e) {
			$this->db->rollBack();
			throw $e;
		}
	}

	private function updateStockQuantityAtomically(int $stockId, string $type, int $quantity, int $updatedAt): StockItem {
		$qb = $this->db->getQueryBuilder();
		$adjustment = $type === 'in' ? $quantity : -$quantity;
		$qb->update('kuechenlager_stock')
			->set('quantity', $qb->createFunction('quantity + ' . $qb->createNamedParameter($adjustment, IQueryBuilder::PARAM_INT)))
			->set('updated_at', $qb->createNamedParameter($updatedAt, IQueryBuilder::PARAM_INT))
			->where($qb->expr()->eq('id', $qb->createNamedParameter($stockId, IQueryBuilder::PARAM_INT)));
		if ($type === 'out') {
			$qb->andWhere($qb->expr()->gte('quantity', $qb->createNamedParameter($quantity, IQueryBuilder::PARAM_INT)));
		}
		if ($qb->executeStatement() !== 1) {
			throw new \InvalidArgumentException($this->l10n->t('Not enough stock for this withdrawal.'));
		}
		return $this->stockMapper->find($stockId);
	}

	public function searchByCode(string $code): ?array {
		$code = trim($code);
		if ($code === '') {
			return null;
		}
		// 1) exakte EAN-Treffer
		$stock = $this->stockMapper->findByEan($code);
		if ($stock !== null) {
			return $this->stockToSearchResult($stock->jsonSerialize());
		}
		// 2) Teiltreffer in der EAN (Scanner liefern manchmal Präfix/Suffix) – nur ab 6 Zeichen, sonst Fehlesungen
		if (mb_strlen($code) >= 6) {
			$stock = $this->stockMapper->findByEanLike($code);
			if ($stock !== null) {
				return $this->stockToSearchResult($stock->jsonSerialize());
			}
		}
		// 3) Fuzzy-Suche über Artikelnamen / EAN – nur ab 4 Zeichen, sonst sind es Fehlesungen
		if (mb_strlen($code) >= 4) {
			$rows = $this->stockMapper->findByArticleLike($code);
			if (count($rows) > 0) {
				return $this->stockToSearchResult($rows[0]->jsonSerialize());
			}
		}
		return null;
	}

	private function stockToSearchResult(array $stock): array {
		$slotId = $stock['slot_id'] === null ? null : (int)$stock['slot_id'];
		$slot = $slotId === null ? null : $this->slotMapper->find($slotId);
		$cabinetId = $stock['cabinet_id'] ?? $slot?->getCabinetId();
		$cabinet = $this->cabinetMapper->find((int)$cabinetId);
		$location = $this->locationMapper->find((int)$cabinet->getLocationId());
		return [
			'id' => (int)$stock['id'],
			'article' => $stock['article'],
			'description' => $stock['description'] ?? null,
			'notes' => $stock['description'] ?? null,
			'manufacturer' => $stock['manufacturer'] ?? null,
			'minimum_quantity' => (int)($stock['minimum_quantity'] ?? 0),
			'tags' => array_map(
				static fn (Tag $tag): array => $tag->jsonSerialize(),
				$this->tagMapper->findByStockItem((int)$stock['id']),
			),
			'quantity' => (int)$stock['quantity'],
			'ean' => $stock['ean'] ?? null,
			'slot_id' => $slotId,
			'cabinet_id' => (int)$cabinet->getId(),
			'slot_path' => $location->getName() . ' / ' . $cabinet->getName()
				. ($slot === null ? '' : ' / ' . $slot->getName()),
		];
	}

	private function stockResponse(StockItem $stock): array {
		$result = $stock->jsonSerialize();
		$result['tags'] = array_map(
			static fn (Tag $tag): array => $tag->jsonSerialize(),
			$this->tagMapper->findByStockItem((int)$stock->getId()),
		);
		return $result;
	}

	/**
	 * @param string[] $names
	 */
	private function setTagsForStockItem(int $stockId, array $names): void {
		$names = $this->normalizeTagNames($names);
		$this->db->beginTransaction();
		try {
			$tags = $this->tagMapper->findOrCreateByNames($names);
			$tagIds = array_map(static fn (Tag $tag): int => (int)$tag->getId(), $tags);
			$this->tagMapper->setForStockItem($stockId, $tagIds);
			$this->db->commit();
		} catch (\Throwable $e) {
			$this->db->rollBack();
			throw $e;
		}
	}

	private function normalizeEan(?string $value): ?string {
		if ($value === null) {
			return null;
		}
		$value = trim($value);
		if ($value === '') {
			return null;
		}
		if (mb_strlen($value) > 32) {
			throw new \InvalidArgumentException($this->l10n->t('EAN/code is too long (max. 32 characters).'));
		}
		return $value;
	}

	private function assertEanAvailable(?string $ean, ?int $exceptId = null): void {
		if ($ean === null) {
			return;
		}
		$existing = $this->stockMapper->findByEan($ean);
		if ($existing !== null && (int)$existing->getId() !== $exceptId) {
			throw new \InvalidArgumentException($this->l10n->t('This EAN/code is already assigned to another article.'));
		}
	}

	private function normalizeName(string $value, string $label): string {
		$value = trim($value);
		if ($value === '' || mb_strlen($value) > 100) {
			throw new \InvalidArgumentException($this->l10n->t('%s is invalid.', [$label]));
		}
		return $value;
	}

	private function normalizeArticle(string $value): string {
		$value = trim($value);
		if ($value === '' || mb_strlen($value) > 255) {
			throw new \InvalidArgumentException($this->l10n->t('Article is invalid.'));
		}
		return $value;
	}

	private function normalizeDescription(?string $value): ?string {
		if ($value === null) {
			return null;
		}
		$value = trim($value);
		if ($value === '') {
			return null;
		}
		if (mb_strlen($value) > 500) {
			throw new \InvalidArgumentException($this->l10n->t('Description is too long.'));
		}
		return $value;
	}

	private function normalizeManufacturer(?string $value): ?string {
		if ($value === null) {
			return null;
		}
		$value = trim($value);
		if ($value === '') {
			return null;
		}
		if (mb_strlen($value) > 255) {
			throw new \InvalidArgumentException($this->l10n->t('Manufacturer is too long.'));
		}
		return $value;
	}

	private function normalizeTagName(string $value): string {
		$value = trim($value);
		if ($value === '' || mb_strlen($value) > 64) {
			throw new \InvalidArgumentException($this->l10n->t('Tag name is invalid.'));
		}
		return $value;
	}

	/**
	 * @param string[] $names
	 * @return string[]
	 */
	private function normalizeTagNames(array $names): array {
		if (count($names) > 20) {
			throw new \InvalidArgumentException($this->l10n->t('No more than 20 tags can be assigned to an article.'));
		}
		$normalized = [];
		foreach ($names as $name) {
			if (!is_string($name)) {
				throw new \InvalidArgumentException($this->l10n->t('Tag name is invalid.'));
			}
			$name = $this->normalizeTagName($name);
			$key = mb_strtolower($name);
			$normalized[$key] = $name;
		}
		return array_values($normalized);
	}

	private function locationNameExists(string $name, ?int $exceptId = null): bool {
		$location = $this->locationMapper->findByName($name);
		return $location !== null && ((int)$location->getId()) !== $exceptId;
	}
}
