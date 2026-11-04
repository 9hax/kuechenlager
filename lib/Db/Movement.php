<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Db;

use JsonSerializable;
use OCP\AppFramework\Db\Entity;

/**
 * @method int|null getStockId()
 * @method void setStockId(?int $stockId)
 * @method int|null getSlotId()
 * @method void setSlotId(?int $slotId)
 * @method string getArticle()
 * @method void setArticle(string $article)
 * @method string getLocationName()
 * @method void setLocationName(string $locationName)
 * @method string getCabinetName()
 * @method void setCabinetName(string $cabinetName)
 * @method string getSlotName()
 * @method void setSlotName(string $slotName)
 * @method string getType()
 * @method void setType(string $type)
 * @method int getQuantity()
 * @method void setQuantity(int $quantity)
 * @method string|null getNote()
 * @method void setNote(?string $note)
 * @method string getUser()
 * @method void setUser(string $user)
 * @method int getCreatedAt()
 * @method void setCreatedAt(int $createdAt)
 */
class Movement extends Entity implements JsonSerializable {
	protected ?int $stockId = null;
	protected ?int $slotId = null;
	protected string $article = '';
	protected string $locationName = '';
	protected string $cabinetName = '';
	protected string $slotName = '';
	protected string $type = '';
	protected int $quantity = 0;
	protected ?string $note = null;
	protected string $user = '';
	protected int $createdAt = 0;

	public function jsonSerialize(): array {
		return [
			'id' => (int)$this->getId(),
			'stock_id' => $this->stockId,
			'slot_id' => $this->slotId,
			'article' => $this->article,
			'location_name' => $this->locationName,
			'cabinet_name' => $this->cabinetName,
			'slot_name' => $this->slotName,
			'type' => $this->type,
			'quantity' => $this->quantity,
			'note' => $this->note,
			'user' => $this->user,
			'created_at' => $this->createdAt,
		];
	}
}