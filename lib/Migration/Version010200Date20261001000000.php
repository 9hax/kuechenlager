<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\DB\Types;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version010200Date20261001000000 extends SimpleMigrationStep {
	public function changeSchema(IOutput $output, Closure $schemaClosure, array $options): ?ISchemaWrapper {
		/** @var ISchemaWrapper $schema */
		$schema = $schemaClosure();

		if ($schema->hasTable('kuechenlager_stock')) {
			$table = $schema->getTable('kuechenlager_stock');
			if (!$table->hasColumn('manufacturer')) {
				$table->addColumn('manufacturer', Types::STRING, [
					'notnull' => false,
					'length' => 255,
				]);
			}
		}

		if (!$schema->hasTable('kuechenlager_tags')) {
			$table = $schema->createTable('kuechenlager_tags');
			$table->addColumn('id', Types::BIGINT, [
				'autoincrement' => true,
				'notnull' => true,
			]);
			$table->addColumn('name', Types::STRING, [
				'notnull' => true,
				'length' => 64,
			]);
			$table->setPrimaryKey(['id']);
			$table->addUniqueIndex(['name'], 'kuechenlager_tag_name');
		}

		if (!$schema->hasTable('kuechenlager_stock_tags')) {
			$table = $schema->createTable('kuechenlager_stock_tags');
			$table->addColumn('id', Types::BIGINT, [
				'autoincrement' => true,
				'notnull' => true,
			]);
			$table->addColumn('stock_id', Types::BIGINT, [
				'notnull' => true,
			]);
			$table->addColumn('tag_id', Types::BIGINT, [
				'notnull' => true,
			]);
			$table->setPrimaryKey(['id'], 'stock_tags_pk');
			$table->addUniqueIndex(['stock_id', 'tag_id'], 'kuechenlager_stock_tag');
			$table->addIndex(['tag_id'], 'kuechenlager_tag_stock');
		}

		return $schema;
	}
}
