<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Db;

use OCP\AppFramework\Db\QBMapper;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\IDBConnection;

/**
 * @template-extends QBMapper<Movement>
 */
class MovementMapper extends QBMapper {
	public function __construct(IDBConnection $db) {
		parent::__construct($db, 'kuechenlager_movements', Movement::class);
	}

	/**
	 * @return Movement[]
	 */
	public function findRecent(int $limit, ?int $slotId, ?string $article): array {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName());
		$conditions = [];
		if ($slotId !== null) {
			$conditions[] = $qb->expr()->eq('slot_id', $qb->createNamedParameter($slotId, IQueryBuilder::PARAM_INT));
		}
		if ($article !== null && $article !== '') {
			$conditions[] = $qb->expr()->like('article', $qb->createNamedParameter('%' . $article . '%'));
		}
		if ($conditions !== []) {
			$qb->where($qb->expr()->andX(...$conditions));
		}
		$qb->orderBy('created_at', 'DESC')
			->addOrderBy('id', 'DESC')
			->setMaxResults($limit);
		return $this->findEntities($qb);
	}
}