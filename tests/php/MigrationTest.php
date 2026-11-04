<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Tests;

use OCA\Kuechenlager\Migration\Version010200Date20261001000000;
use OCA\Kuechenlager\Migration\Version010300Date20261104000000;
use OCA\Kuechenlager\Migration\Version010400Date20261104120000;
use OCP\DB\ISchemaWrapper;
use OCP\DB\Types;
use OCP\DB\Schema\IColumn;
use OCP\DB\Schema\ITable;
use OCP\Migration\IOutput;
use PHPUnit\Framework\TestCase;

final class MigrationTest extends TestCase {
	public function testTagLinkTableUsesNextcloudCompatiblePrimaryIndexName(): void {
		$stockTable = $this->createMock(ITable::class);
		$stockTable->method('hasColumn')->with('manufacturer')->willReturn(true);
		$tagLinkTable = $this->createMock(ITable::class);
		$tagLinkTable->method('addColumn')->willReturn($this->createMock(IColumn::class));
		$tagLinkTable->expects(self::once())
			->method('setPrimaryKey')
			->with(['id'], 'stock_tags_pk')
			->willReturnSelf();
		$tagLinkTable->method('addUniqueIndex')->willReturnSelf();
		$tagLinkTable->method('addIndex')->willReturnSelf();

		$schema = $this->createMock(ISchemaWrapper::class);
		$schema->method('hasTable')->willReturnMap([
			['kuechenlager_stock', true],
			['kuechenlager_tags', true],
			['kuechenlager_stock_tags', false],
		]);
		$schema->method('getTable')->with('kuechenlager_stock')->willReturn($stockTable);
		$schema->expects(self::once())
			->method('createTable')
			->with('kuechenlager_stock_tags')
			->willReturn($tagLinkTable);

		(new Version010200Date20261001000000())->changeSchema(
			$this->createMock(IOutput::class),
			static fn (): ISchemaWrapper => $schema,
			[],
		);
	}

	public function testStockCanBeStoredDirectlyInCabinetWithoutLosingExistingSlots(): void {
		$stockTable = $this->createMock(ITable::class);
		$stockTable->method('hasColumn')
			->willReturnMap([['cabinet_id', false], ['slot_id', true]]);
		$stockTable->expects(self::once())
			->method('addColumn')
			->with('cabinet_id', Types::BIGINT, ['notnull' => false])
			->willReturn($this->createMock(IColumn::class));
		$stockTable->expects(self::once())
			->method('modifyColumn')
			->with('slot_id', ['notnull' => false, 'default' => null])
			->willReturnSelf();

		$schema = $this->createMock(ISchemaWrapper::class);
		$schema->method('hasTable')->with('kuechenlager_stock')->willReturn(true);
		$schema->expects(self::once())->method('getTable')->with('kuechenlager_stock')->willReturn($stockTable);

		(new Version010300Date20261104000000())->changeSchema(
			$this->createMock(IOutput::class),
			static fn (): ISchemaWrapper => $schema,
			[],
		);
	}

	public function testStockMinimumQuantityHasAZeroDefault(): void {
		$stockTable = $this->createMock(ITable::class);
		$stockTable->method('hasColumn')
			->willReturnMap([['minimum_quantity', false]]);
		$stockTable->expects(self::once())
			->method('addColumn')
			->with('minimum_quantity', Types::BIGINT, ['notnull' => true, 'default' => 0])
			->willReturn($this->createMock(IColumn::class));

		$schema = $this->createMock(ISchemaWrapper::class);
		$schema->method('hasTable')->with('kuechenlager_stock')->willReturn(true);
		$schema->expects(self::once())->method('getTable')->with('kuechenlager_stock')->willReturn($stockTable);

		(new Version010400Date20261104120000())->changeSchema(
			$this->createMock(IOutput::class),
			static fn (): ISchemaWrapper => $schema,
			[],
		);
	}
}
