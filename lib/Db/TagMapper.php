<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Db;

use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\IDBConnection;

/**
 * @template-extends BaseMapper<Tag>
 */
class TagMapper extends BaseMapper {
	public function __construct(IDBConnection $db) {
		parent::__construct($db, 'kuechenlager_tags', Tag::class);
	}

	/**
	 * @return Tag[]
	 */
	public function findAll(): array {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->orderBy('name', 'ASC');
		return $this->findEntities($qb);
	}

	public function findByName(string $name): ?Tag {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->getTableName())
			->where($qb->expr()->eq($qb->createFunction('LOWER(name)'), $qb->createNamedParameter(mb_strtolower($name))));
		return $this->findEntities($qb)[0] ?? null;
	}

	/**
	 * @return Tag[]
	 */
	public function findByStockItem(int $stockId): array {
		$qb = $this->db->getQueryBuilder();
		$qb->select('tag.id', 'tag.name')
			->from($this->getTableName(), 'tag')
			->innerJoin('tag', 'kuechenlager_stock_tags', 'stock_tag', 'stock_tag.tag_id = tag.id')
			->where($qb->expr()->eq('stock_tag.stock_id', $qb->createNamedParameter($stockId, IQueryBuilder::PARAM_INT)))
			->orderBy('tag.name', 'ASC');
		return $this->findEntities($qb);
	}

	/**
	 * @param string[] $names
	 * @return Tag[]
	 */
	public function findOrCreateByNames(array $names): array {
		$tags = [];
		foreach ($names as $name) {
			$tag = $this->findByName($name);
			if ($tag === null) {
				$tag = new Tag();
				$tag->setName($name);
				$tag = $this->insert($tag);
			}
			$tags[] = $tag;
		}
		return $tags;
	}

	/**
	 * @param int[] $tagIds
	 */
	public function setForStockItem(int $stockId, array $tagIds): void {
		$delete = $this->db->getQueryBuilder();
		$delete->delete('kuechenlager_stock_tags')
			->where($delete->expr()->eq('stock_id', $delete->createNamedParameter($stockId, IQueryBuilder::PARAM_INT)))
			->executeStatement();

		foreach ($tagIds as $tagId) {
			$insert = $this->db->getQueryBuilder();
			$insert->insert('kuechenlager_stock_tags')
				->setValue('stock_id', $insert->createNamedParameter($stockId, IQueryBuilder::PARAM_INT))
				->setValue('tag_id', $insert->createNamedParameter($tagId, IQueryBuilder::PARAM_INT))
				->executeStatement();
		}
	}

	public function deleteForStockItem(int $stockId): void {
		$qb = $this->db->getQueryBuilder();
		$qb->delete('kuechenlager_stock_tags')
			->where($qb->expr()->eq('stock_id', $qb->createNamedParameter($stockId, IQueryBuilder::PARAM_INT)))
			->executeStatement();
	}

	public function deleteForTag(int $tagId): void {
		$qb = $this->db->getQueryBuilder();
		$qb->delete('kuechenlager_stock_tags')
			->where($qb->expr()->eq('tag_id', $qb->createNamedParameter($tagId, IQueryBuilder::PARAM_INT)))
			->executeStatement();
	}
}
