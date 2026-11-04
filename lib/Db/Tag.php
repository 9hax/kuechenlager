<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Db;

use JsonSerializable;
use OCP\AppFramework\Db\Entity;

/**
 * @method string getName()
 * @method void setName(string $name)
 */
class Tag extends Entity implements JsonSerializable {
	protected string $name = '';

	public function jsonSerialize(): array {
		return [
			'id' => (int)$this->getId(),
			'name' => $this->name,
		];
	}
}
