<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\DB\Types;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version010100Date20260921000000 extends SimpleMigrationStep {
	public function changeSchema(IOutput $output, Closure $schemaClosure, array $options): ?ISchemaWrapper {
		/** @var ISchemaWrapper $schema */
		$schema = $schemaClosure();

		if ($schema->hasTable('kuechenlager_stock')) {
			$table = $schema->getTable('kuechenlager_stock');
			if (!$table->hasColumn('ean')) {
				$table->addColumn('ean', Types::STRING, [
					'notnull' => false,
					'length' => 32,
					'comment' => 'EAN/GTIN oder QR-Code-Wert',
				]);
				$table->addUniqueIndex(['ean'], 'kuechenlager_stock_ean');
			}
		}

		return $schema;
	}
}
