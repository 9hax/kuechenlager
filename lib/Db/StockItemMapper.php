<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Db;

use OCP\AppFramework\Db\QBMapper;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\IDBConnection;

/**
 * @template-extends BaseMapper<StockItem>
 */
class StockItemMapper extends BaseMapper {
	public function __construct(IDBConnection $db) {
		parent::__construct($db, 'kuechenlager_stock', StockItem::class);
	}

	/**
	 * @return StockItem[]
	 */
	public function findAll(): array {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->orderBy('article', 'ASC');
		return $this->findEntities($qb);
	}

	/**
	 * @return StockItem[]
	 */
	public function findBySlot(int $slotId): array {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->where($qb->expr()->eq('slot_id', $qb->createNamedParameter($slotId, IQueryBuilder::PARAM_INT)))
			->orderBy('article', 'ASC');
		return $this->findEntities($qb);
	}

	public function findBySlotAndArticle(int $slotId, string $article): ?StockItem {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->where($qb->expr()->eq('slot_id', $qb->createNamedParameter($slotId, IQueryBuilder::PARAM_INT)))
			->andWhere($qb->expr()->eq('article', $qb->createNamedParameter($article)));
		$results = $this->findEntities($qb);
		return $results[0] ?? null;
	}

	/**
	 * @return StockItem[]
	 */
	public function findByCabinet(int $cabinetId): array {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->where($qb->expr()->eq('cabinet_id', $qb->createNamedParameter($cabinetId, IQueryBuilder::PARAM_INT)))
			->andWhere($qb->expr()->isNull('slot_id'))
			->orderBy('article', 'ASC');
		return $this->findEntities($qb);
	}

	public function findByCabinetAndArticle(int $cabinetId, string $article): ?StockItem {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->where($qb->expr()->eq('cabinet_id', $qb->createNamedParameter($cabinetId, IQueryBuilder::PARAM_INT)))
			->andWhere($qb->expr()->isNull('slot_id'))
			->andWhere($qb->expr()->eq('article', $qb->createNamedParameter($article)));
		$results = $this->findEntities($qb);
		return $results[0] ?? null;
	}

	/**
	 * @return StockItem[]
	 */
	public function findByArticleLike(string $term): array {
		$qb = $this->db->getQueryBuilder();
		// Tabelle hat Collation utf8mb4_bin -> ohne LOWER() waere die Suche case-sensitiv
		$lowerTerm = mb_strtolower($term);
		$pattern = $qb->createNamedParameter('%' . $lowerTerm . '%');
		$qb->selectDistinct('stock.*')
			->from($this->getTableName(), 'stock')
			->leftJoin('stock', 'kuechenlager_stock_tags', 'stock_tag', 'stock.id = stock_tag.stock_id')
			->leftJoin('stock_tag', 'kuechenlager_tags', 'tag', 'stock_tag.tag_id = tag.id')
			->where($qb->expr()->like($qb->createFunction('LOWER(stock.article)'), $pattern))
			->orWhere($qb->expr()->like($qb->createFunction('LOWER(stock.manufacturer)'), $pattern))
			->orWhere($qb->expr()->like($qb->createFunction('LOWER(stock.description)'), $pattern))
			->orWhere($qb->expr()->like($qb->createFunction('LOWER(stock.ean)'), $pattern))
			->orWhere($qb->expr()->like($qb->createFunction('LOWER(tag.name)'), $pattern))
			->orderBy('stock.article', 'ASC');
		return $this->findEntities($qb);
	}

	public function findByEan(string $ean): ?StockItem {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->where($qb->expr()->eq('ean', $qb->createNamedParameter($ean)));
		$results = $this->findEntities($qb);
		return $results[0] ?? null;
	}

	public function findByEanLike(string $term): ?StockItem {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->where($qb->expr()->like('ean', $qb->createNamedParameter('%' . $term . '%')))
			->setMaxResults(1);
		$results = $this->findEntities($qb);
		return $results[0] ?? null;
	}
}