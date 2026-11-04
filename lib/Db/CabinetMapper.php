<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Db;

use OCP\AppFramework\Db\QBMapper;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\IDBConnection;

/**
 * @template-extends BaseMapper<Cabinet>
 */
class CabinetMapper extends BaseMapper {
	public function __construct(IDBConnection $db) {
		parent::__construct($db, 'kuechenlager_cabinets', Cabinet::class);
	}

	/**
	 * @return Cabinet[]
	 */
	public function findAll(): array {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->orderBy('name', 'ASC');
		return $this->findEntities($qb);
	}

	/**
	 * @return Cabinet[]
	 */
	public function findByLocation(int $locationId): array {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->where($qb->expr()->eq('location_id', $qb->createNamedParameter($locationId, IQueryBuilder::PARAM_INT)))
			->orderBy('name', 'ASC');
		return $this->findEntities($qb);
	}
}