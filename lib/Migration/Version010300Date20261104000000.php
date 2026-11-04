<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\DB\Types;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version010300Date20261104000000 extends SimpleMigrationStep {
	public function changeSchema(IOutput $output, Closure $schemaClosure, array $options): ?ISchemaWrapper {
		/** @var ISchemaWrapper $schema */
		$schema = $schemaClosure();

		if ($schema->hasTable('kuechenlager_stock')) {
			$table = $schema->getTable('kuechenlager_stock');
			if (!$table->hasColumn('cabinet_id')) {
				$table->addColumn('cabinet_id', Types::BIGINT, [
					'notnull' => false,
				]);
			}
			if ($table->hasColumn('slot_id')) {
				$table->modifyColumn('slot_id', [
					'notnull' => false,
					'default' => null,
				]);
			}
		}

		return $schema;
	}
}
