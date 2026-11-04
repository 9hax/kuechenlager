<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Db;

use OCP\AppFramework\Db\DoesNotExistException;
use OCP\AppFramework\Db\Entity;
use OCP\AppFramework\Db\QBMapper;
use OCP\DB\QueryBuilder\IQueryBuilder;

/**
 * Gemeinsame Basis für die Lager-Mapper.
 *
 * Stellt die id-basierte find()-Methode bereit, die in neueren
 * Nextcloud-Versionen nicht mehr direkt in QBMapper enthalten ist,
 * und bleibt damit auch für zukünftige Nextcloud-Releases kompatibel.
 */
abstract class BaseMapper extends QBMapper {
	/**
	 * @template T of Entity
	 * @return T
	 */
	public function find(int $id): Entity {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->where($qb->expr()->eq('id', $qb->createNamedParameter($id, IQueryBuilder::PARAM_INT)));
		$entities = $this->findEntities($qb);
		if (count($entities) === 0) {
			throw new DoesNotExistException('Nicht gefunden.');
		}
		return $entities[0];
	}
}

