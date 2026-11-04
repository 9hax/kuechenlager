<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Db;

use JsonSerializable;
use OCP\AppFramework\Db\Entity;

/**
 * @method int|null getSlotId()
 * @method void setSlotId(?int $slotId)
 * @method int|null getCabinetId()
 * @method void setCabinetId(?int $cabinetId)
 * @method string getArticle()
 * @method void setArticle(string $article)
 * @method string|null getDescription()
 * @method void setDescription(?string $description)
 * @method string|null getManufacturer()
 * @method void setManufacturer(?string $manufacturer)
 * @method int getQuantity()
 * @method void setQuantity(int $quantity)
 * @method int getMinimumQuantity()
 * @method void setMinimumQuantity(int $minimumQuantity)
 * @method string|null getEan()
 * @method void setEan(?string $ean)
 * @method int getCreatedAt()
 * @method void setCreatedAt(int $createdAt)
 * @method int getUpdatedAt()
 * @method void setUpdatedAt(int $updatedAt)
 */
class StockItem extends Entity implements JsonSerializable {
	protected ?int $slotId = null;
	protected ?int $cabinetId = null;
	protected string $article = '';
	protected ?string $description = null;
	protected ?string $manufacturer = null;
	protected int $quantity = 0;
	protected int $minimumQuantity = 0;
	protected ?string $ean = null;
	protected int $createdAt = 0;
	protected int $updatedAt = 0;

	public function jsonSerialize(): array {
		return [
			'id' => (int)$this->getId(),
			'slot_id' => $this->slotId,
			'cabinet_id' => $this->cabinetId,
			'article' => $this->article,
			'description' => $this->description,
			'notes' => $this->description,
			'manufacturer' => $this->manufacturer,
			'quantity' => $this->quantity,
			'minimum_quantity' => $this->minimumQuantity,
			'ean' => $this->ean,
			'created_at' => $this->createdAt,
			'updated_at' => $this->updatedAt,
		];
	}
}
