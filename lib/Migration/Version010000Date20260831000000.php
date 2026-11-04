<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\DB\Types;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version010000Date20260831000000 extends SimpleMigrationStep {
	/**
	 * @param IOutput $output
	 * @param Closure(): ISchemaWrapper $schemaClosure
	 * @param array<string, mixed> $options
	 */
	public function changeSchema(IOutput $output, Closure $schemaClosure, array $options): ?ISchemaWrapper {
		/** @var ISchemaWrapper $schema */
		$schema = $schemaClosure();

		// Force create table for testing
		if (!$schema->hasTable('kuechenlager_locations')) {
			$table = $schema->createTable('kuechenlager_locations');
			$table->addColumn('id', Types::BIGINT, [
				'autoincrement' => true,
				'notnull' => true,
			]);
			$table->addColumn('name', Types::STRING, [
				'notnull' => true,
				'length' => 100,
			]);
			$table->addColumn('description', Types::TEXT, [
				'notnull' => false,
				'comment' => 'Beschreibung',
			]);
			$table->addColumn('created_at', Types::BIGINT, [
				'notnull' => true,
				'default' => 0,
			]);
			$table->setPrimaryKey(['id']);
			$table->addUniqueIndex(['name'], 'kuechenlager_loc_name');
		}

		if (!$schema->hasTable('kuechenlager_cabinets')) {
			$table = $schema->createTable('kuechenlager_cabinets');
			$table->addColumn('id', Types::BIGINT, [
				'autoincrement' => true,
				'notnull' => true,
			]);
			$table->addColumn('location_id', Types::BIGINT, [
				'notnull' => true,
				'default' => 0,
			]);
			$table->addColumn('name', Types::STRING, [
				'notnull' => true,
				'length' => 100,
			]);
			$table->addColumn('description', Types::TEXT, [
				'notnull' => false,
				'comment' => 'Beschreibung',
			]);
			$table->addColumn('created_at', Types::BIGINT, [
				'notnull' => true,
				'default' => 0,
			]);
			$table->setPrimaryKey(['id']);
			$table->addIndex(['location_id'], 'kuechenlager_cab_loc');
		}

		if (!$schema->hasTable('kuechenlager_slots')) {
			$table = $schema->createTable('kuechenlager_slots');
			$table->addColumn('id', Types::BIGINT, [
				'autoincrement' => true,
				'notnull' => true,
			]);
			$table->addColumn('cabinet_id', Types::BIGINT, [
				'notnull' => true,
				'default' => 0,
			]);
			$table->addColumn('name', Types::STRING, [
				'notnull' => true,
				'length' => 100,
			]);
			$table->addColumn('description', Types::TEXT, [
				'notnull' => false,
				'comment' => 'Beschreibung',
			]);
			$table->addColumn('created_at', Types::BIGINT, [
				'notnull' => true,
				'default' => 0,
			]);
			$table->setPrimaryKey(['id']);
			$table->addIndex(['cabinet_id'], 'kuechenlager_slot_cab');
		}

		if (!$schema->hasTable('kuechenlager_stock')) {
			$table = $schema->createTable('kuechenlager_stock');
			$table->addColumn('id', Types::BIGINT, [
				'autoincrement' => true,
				'notnull' => true,
			]);
			$table->addColumn('slot_id', Types::BIGINT, [
				'notnull' => true,
				'default' => 0,
			]);
			$table->addColumn('article', Types::STRING, [
				'notnull' => true,
				'length' => 255,
			]);
			$table->addColumn('description', Types::TEXT, [
				'notnull' => false,
				'comment' => 'Beschreibung',
			]);
			$table->addColumn('quantity', Types::BIGINT, [
				'notnull' => true,
				'default' => 0,
			]);
			$table->addColumn('created_at', Types::BIGINT, [
				'notnull' => true,
				'default' => 0,
			]);
			$table->addColumn('updated_at', Types::BIGINT, [
				'notnull' => true,
				'default' => 0,
			]);
			$table->setPrimaryKey(['id']);
			$table->addIndex(['slot_id'], 'kuechenlager_stock_slot');
		}

		if (!$schema->hasTable('kuechenlager_movements')) {
			$table = $schema->createTable('kuechenlager_movements');
			$table->addColumn('id', Types::BIGINT, [
				'autoincrement' => true,
				'notnull' => true,
			]);
			$table->addColumn('stock_id', Types::BIGINT, [
				'notnull' => false,
			]);
			$table->addColumn('slot_id', Types::BIGINT, [
				'notnull' => false,
			]);
			$table->addColumn('article', Types::STRING, [
				'notnull' => true,
				'length' => 255,
				'default' => '',
			]);
			$table->addColumn('location_name', Types::STRING, [
				'notnull' => true,
				'length' => 100,
				'default' => '',
			]);
			$table->addColumn('cabinet_name', Types::STRING, [
				'notnull' => true,
				'length' => 100,
				'default' => '',
			]);
			$table->addColumn('slot_name', Types::STRING, [
				'notnull' => true,
				'length' => 100,
				'default' => '',
			]);
			$table->addColumn('type', Types::STRING, [
				'notnull' => true,
				'length' => 8,
			]);
			$table->addColumn('quantity', Types::BIGINT, [
				'notnull' => true,
				'default' => 0,
			]);
			$table->addColumn('note', Types::TEXT, [
				'notnull' => false,
				'comment' => 'Notiz',
			]);
			$table->addColumn('user', Types::STRING, [
				'notnull' => true,
				'length' => 128,
				'default' => '',
			]);
			$table->addColumn('created_at', Types::BIGINT, [
				'notnull' => true,
				'default' => 0,
			]);
			$table->setPrimaryKey(['id']);
			$table->addIndex(['created_at'], 'kuechenlager_move_time');
			$table->addIndex(['slot_id'], 'kuechenlager_move_slot');
		}

		return $schema;
	}
}