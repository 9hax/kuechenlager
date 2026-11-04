<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Db;

use OCP\AppFramework\Db\QBMapper;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\IDBConnection;

/**
 * @template-extends BaseMapper<Location>
 */
class LocationMapper extends BaseMapper {
	public function __construct(IDBConnection $db) {
		parent::__construct($db, 'kuechenlager_locations', Location::class);
	}

	/**
	 * @return Location[]
	 */
	public function findAll(): array {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->orderBy('name', 'ASC');
		return $this->findEntities($qb);
	}

	public function findByName(string $name): ?Location {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->where($qb->expr()->eq('name', $qb->createNamedParameter($name)));
		$results = $this->findEntities($qb);
		return $results[0] ?? null;
	}
}