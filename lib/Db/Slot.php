<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Db;

use JsonSerializable;
use OCP\AppFramework\Db\Entity;

/**
 * @method int getCabinetId()
 * @method void setCabinetId(int $cabinetId)
 * @method string getName()
 * @method void setName(string $name)
 * @method string|null getDescription()
 * @method void setDescription(?string $description)
 * @method int getCreatedAt()
 * @method void setCreatedAt(int $createdAt)
 */
class Slot extends Entity implements JsonSerializable {
	protected int $cabinetId = 0;
	protected string $name = '';
	protected ?string $description = null;
	protected int $createdAt = 0;

	public function jsonSerialize(): array {
		return [
			'id' => (int)$this->getId(),
			'cabinet_id' => $this->cabinetId,
			'name' => $this->name,
			'description' => $this->description,
			'created_at' => $this->createdAt,
		];
	}
}