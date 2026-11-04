<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Db;

use OCP\AppFramework\Db\QBMapper;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\IDBConnection;

/**
 * @template-extends BaseMapper<Slot>
 */
class SlotMapper extends BaseMapper {
	public function __construct(IDBConnection $db) {
		parent::__construct($db, 'kuechenlager_slots', Slot::class);
	}

	/**
	 * @return Slot[]
	 */
	public function findAll(): array {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->orderBy('name', 'ASC');
		return $this->findEntities($qb);
	}

	/**
	 * @return Slot[]
	 */
	public function findByCabinet(int $cabinetId): array {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->where($qb->expr()->eq('cabinet_id', $qb->createNamedParameter($cabinetId, IQueryBuilder::PARAM_INT)))
			->orderBy('name', 'ASC');
		return $this->findEntities($qb);
	}
}