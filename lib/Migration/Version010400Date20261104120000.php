<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\DB\Types;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version010400Date20261104120000 extends SimpleMigrationStep {
	public function changeSchema(IOutput $output, Closure $schemaClosure, array $options): ?ISchemaWrapper {
		/** @var ISchemaWrapper $schema */
		$schema = $schemaClosure();

		if ($schema->hasTable('kuechenlager_stock')) {
			$table = $schema->getTable('kuechenlager_stock');
			if (!$table->hasColumn('minimum_quantity')) {
				$table->addColumn('minimum_quantity', Types::BIGINT, [
					'notnull' => true,
					'default' => 0,
				]);
			}
		}

		return $schema;
	}
}
