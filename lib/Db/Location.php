<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Db;

use JsonSerializable;
use OCP\AppFramework\Db\Entity;

/**
 * @method string getName()
 * @method void setName(string $name)
 * @method string|null getDescription()
 * @method void setDescription(?string $description)
 * @method int getCreatedAt()
 * @method void setCreatedAt(int $createdAt)
 */
class Location extends Entity implements JsonSerializable {
	protected string $name = '';
	protected ?string $description = null;
	protected int $createdAt = 0;

	public function jsonSerialize(): array {
		return [
			'id' => (int)$this->getId(),
			'name' => $this->name,
			'description' => $this->description,
			'created_at' => $this->createdAt,
		];
	}
}