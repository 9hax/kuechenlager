<?php

declare(strict_types=1);

namespace OCA\Lager\Tests;

use OCA\Lager\Db\Cabinet;
use OCA\Lager\Db\CabinetMapper;
use OCA\Lager\Db\Location;
use OCA\Lager\Db\LocationMapper;
use OCA\Lager\Db\Movement;
use OCA\Lager\Db\MovementMapper;
use OCA\Lager\Db\Slot;
use OCA\Lager\Db\SlotMapper;
use OCA\Lager\Db\StockItem;
use OCA\Lager\Db\StockItemMapper;
use OCA\Lager\Service\LagerService;
use OCP\DB\QueryBuilder\IExpressionBuilder;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\Files\AppData\IAppDataFactory;
use OCP\Files\IAppData;
use OCP\Files\SimpleFS\ISimpleFile;
use OCP\Files\SimpleFS\ISimpleFolder;
use OCP\IDBConnection;
use OCP\IL10N;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

final class LagerServiceTest extends TestCase {
	private IDBConnection&MockObject $db;
	private LocationMapper&MockObject $locationMapper;
	private CabinetMapper&MockObject $cabinetMapper;
	private SlotMapper&MockObject $slotMapper;
	private StockItemMapper&MockObject $stockMapper;
	private MovementMapper&MockObject $movementMapper;
	private IUserSession&MockObject $userSession;
	private IAppDataFactory&MockObject $appDataFactory;
	private LagerService $service;

	protected function setUp(): void {
		$this->db = $this->createMock(IDBConnection::class);
		$this->locationMapper = $this->createMock(LocationMapper::class);
		$this->cabinetMapper = $this->createMock(CabinetMapper::class);
		$this->slotMapper = $this->createMock(SlotMapper::class);
		$this->stockMapper = $this->createMock(StockItemMapper::class);
		$this->movementMapper = $this->createMock(MovementMapper::class);
		$this->userSession = $this->createMock(IUserSession::class);
		$l10n = $this->createMock(IL10N::class);
		$l10n->method('t')->willReturnCallback(
			static fn (string $text, array $parameters = []): string => $parameters === []
				? $text
				: vsprintf($text, $parameters),
		);
		$this->appDataFactory = $this->createMock(IAppDataFactory::class);

		$this->service = new LagerService(
			$this->db,
			$this->locationMapper,
			$this->cabinetMapper,
			$this->slotMapper,
			$this->stockMapper,
			$this->movementMapper,
			$this->userSession,
			$l10n,
			$this->appDataFactory,
		);
	}

	public function testTreeContainsLocationHierarchyAndAggregatedQuantities(): void {
		$location = new Location();
		$location->setId(1);
		$location->setName('Kitchen');
		$cabinet = new Cabinet();
		$cabinet->setId(2);
		$cabinet->setLocationId(1);
		$cabinet->setName('Pantry');
		$slot = new Slot();
		$slot->setId(3);
		$slot->setCabinetId(2);
		$slot->setName('Shelf A');
		$stock = new StockItem();
		$stock->setSlotId(3);
		$stock->setQuantity(4);
		$anotherStock = new StockItem();
		$anotherStock->setSlotId(3);
		$anotherStock->setQuantity(6);

		$this->locationMapper->method('findAll')->willReturn([$location]);
		$this->cabinetMapper->method('findAll')->willReturn([$cabinet]);
		$this->slotMapper->method('findAll')->willReturn([$slot]);
		$this->stockMapper->method('findAll')->willReturn([$stock, $anotherStock]);

		$tree = $this->service->getTree();

		self::assertSame('Kitchen', $tree[0]['name']);
		self::assertSame(10, $tree[0]['total_qty']);
		self::assertSame('Pantry', $tree[0]['cabinets'][0]['name']);
		self::assertSame(10, $tree[0]['cabinets'][0]['total_qty']);
		self::assertSame(10, $tree[0]['cabinets'][0]['slots'][0]['total_qty']);
	}

	public function testTreeIncludesEmptyBranchesWithZeroTotals(): void {
		$location = new Location();
		$location->setId(1);
		$location->setName('Kitchen');
		$this->locationMapper->method('findAll')->willReturn([$location]);
		$this->cabinetMapper->method('findAll')->willReturn([]);
		$this->slotMapper->method('findAll')->willReturn([]);
		$this->stockMapper->method('findAll')->willReturn([]);

		self::assertSame([[
			'id' => 1,
			'name' => 'Kitchen',
			'description' => null,
			'created_at' => 0,
			'cabinets' => [],
			'total_qty' => 0,
		]], $this->service->getTree());
	}

	public function testCreateLocationTrimsFieldsAndPersistsTheRootLocation(): void {
		$this->locationMapper->expects(self::once())
			->method('findByName')
			->with('Kitchen')
			->willReturn(null);
		$this->locationMapper->expects(self::once())
			->method('insert')
			->with(self::callback(static function (Location $location): bool {
				self::assertSame('Kitchen', $location->getName());
				self::assertSame('Pantry', $location->getDescription());
				self::assertGreaterThan(0, $location->getCreatedAt());
				$location->setId(17);
				return true;
			}))
			->willReturnCallback(static fn (Location $location): Location => $location);

		$result = $this->service->createLocation(' Kitchen ', ' Pantry ');

		self::assertSame(17, $result['id']);
		self::assertSame('Kitchen', $result['name']);
		self::assertSame('Pantry', $result['description']);
	}

	public function testCreateLocationRejectsDuplicateNames(): void {
		$existing = new Location();
		$existing->setName('Kitchen');
		$this->locationMapper->expects(self::once())
			->method('findByName')
			->with('Kitchen')
			->willReturn($existing);
		$this->locationMapper->expects(self::never())->method('insert');

		$this->expectException(\InvalidArgumentException::class);
		$this->expectExceptionMessage('A location with this name already exists.');
		$this->service->createLocation(' Kitchen ', null);
	}

	public function testCreateLocationRejectsBlankNameBeforeDatabaseLookup(): void {
		$this->locationMapper->expects(self::never())->method('findByName');

		$this->expectException(\InvalidArgumentException::class);
		$this->expectExceptionMessage('Name is invalid.');
		$this->service->createLocation('  ', null);
	}

	public function testCreateLocationNormalizesBlankDescriptionToNull(): void {
		$this->locationMapper->method('findByName')->willReturn(null);
		$this->locationMapper->expects(self::once())
			->method('insert')
			->with(self::callback(static function (Location $location): bool {
				self::assertNull($location->getDescription());
				return true;
			}))
			->willReturnCallback(static fn (Location $location): Location => $location);

		$result = $this->service->createLocation('Kitchen', '   ');

		self::assertNull($result['description']);
	}

	public function testLocationAndCabinetLookupsDelegateToTheirMappers(): void {
		$location = new Location();
		$location->setId(1);
		$cabinet = new Cabinet();
		$cabinet->setId(2);
		$this->locationMapper->expects(self::once())->method('find')->with(1)->willReturn($location);
		$this->cabinetMapper->expects(self::once())->method('find')->with(2)->willReturn($cabinet);

		self::assertSame($location, $this->service->getLocation(1));
		self::assertSame($cabinet, $this->service->getCabinet(2));
	}

	public function testGetSlotBuildsItsLocationPath(): void {
		$slot = new Slot();
		$slot->setId(3);
		$slot->setCabinetId(2);
		$slot->setName('Shelf A');
		$cabinet = new Cabinet();
		$cabinet->setId(2);
		$cabinet->setLocationId(1);
		$cabinet->setName('Pantry');
		$location = new Location();
		$location->setId(1);
		$location->setName('Kitchen');
		$this->slotMapper->expects(self::once())->method('find')->with(3)->willReturn($slot);
		$this->cabinetMapper->expects(self::once())->method('find')->with(2)->willReturn($cabinet);
		$this->locationMapper->expects(self::once())->method('find')->with(1)->willReturn($location);

		self::assertSame('Kitchen / Pantry / Shelf A', $this->service->getSlot(3)['path']);
	}

	public function testGetStockBySlotAddsImagePresenceForEveryItem(): void {
		$slot = new Slot();
		$slot->setId(3);
		$slot->setCabinetId(2);
		$slot->setName('Shelf A');
		$cabinet = new Cabinet();
		$cabinet->setId(2);
		$cabinet->setLocationId(1);
		$cabinet->setName('Pantry');
		$location = new Location();
		$location->setId(1);
		$location->setName('Kitchen');
		$plain = $this->stockItem(8, 3, 'Oats', 2);
		$pictured = $this->stockItem(9, 3, 'Tea', 1);
		$this->slotMapper->expects(self::once())->method('find')->with(3)->willReturn($slot);
		$this->cabinetMapper->expects(self::once())->method('find')->with(2)->willReturn($cabinet);
		$this->locationMapper->expects(self::once())->method('find')->with(1)->willReturn($location);
		$this->stockMapper->expects(self::once())->method('findBySlot')->with(3)->willReturn([$plain, $pictured]);
		$folder = $this->createMock(ISimpleFolder::class);
		$folder->expects(self::exactly(2))
			->method('fileExists')
			->with(self::logicalOr('item_8.jpg', 'item_9.jpg'))
			->willReturnOnConsecutiveCalls(false, true);
		$appData = $this->createMock(IAppData::class);
		$appData->expects(self::exactly(2))->method('getFolder')->with('/')->willReturn($folder);
		$this->appDataFactory->expects(self::exactly(2))->method('get')->willReturn($appData);

		$items = $this->service->getStockBySlot(3);

		self::assertFalse($items[0]['has_image']);
		self::assertTrue($items[1]['has_image']);
		self::assertSame('Oats', $items[0]['article']);
	}

	public function testCreateCabinetAndSlotNormalizeNamesAndDescriptions(): void {
		$location = new Location();
		$location->setId(1);
		$cabinet = new Cabinet();
		$cabinet->setId(2);
		$this->locationMapper->expects(self::once())->method('find')->with(1)->willReturn($location);
		$this->cabinetMapper->expects(self::once())->method('find')->with(2)->willReturn($cabinet);
		$this->cabinetMapper->expects(self::once())
			->method('insert')
			->with(self::callback(static function (Cabinet $created): bool {
				self::assertSame(1, $created->getLocationId());
				self::assertSame('Pantry', $created->getName());
				self::assertNull($created->getDescription());
				self::assertGreaterThan(0, $created->getCreatedAt());
				$created->setId(2);
				return true;
			}))
			->willReturnCallback(static fn (Cabinet $created): Cabinet => $created);
		$this->slotMapper->expects(self::once())
			->method('insert')
			->with(self::callback(static function (Slot $created): bool {
				self::assertSame(2, $created->getCabinetId());
				self::assertSame('Shelf A', $created->getName());
				self::assertSame('Canned goods', $created->getDescription());
				self::assertGreaterThan(0, $created->getCreatedAt());
				$created->setId(3);
				return true;
			}))
			->willReturnCallback(static fn (Slot $created): Slot => $created);

		$createdCabinet = $this->service->createCabinet(1, ' Pantry ', '  ');
		$createdSlot = $this->service->createSlot(2, ' Shelf A ', ' Canned goods ');

		self::assertSame(2, $createdCabinet['id']);
		self::assertSame(3, $createdSlot['id']);
	}

	public function testUpdateLocationCabinetAndSlotSaveNormalizedValues(): void {
		$location = new Location();
		$location->setId(1);
		$location->setName('Kitchen');
		$cabinet = new Cabinet();
		$cabinet->setId(2);
		$cabinet->setName('Pantry');
		$slot = new Slot();
		$slot->setId(3);
		$slot->setName('Shelf A');
		$this->locationMapper->expects(self::once())->method('find')->with(1)->willReturn($location);
		$this->locationMapper->expects(self::once())->method('findByName')->with('New kitchen')->willReturn(null);
		$this->locationMapper->expects(self::once())
			->method('update')
			->with(self::callback(static function (Location $updated): bool {
				self::assertSame('New kitchen', $updated->getName());
				self::assertNull($updated->getDescription());
				return true;
			}))
			->willReturnCallback(static fn (Location $updated): Location => $updated);
		$this->cabinetMapper->expects(self::once())->method('find')->with(2)->willReturn($cabinet);
		$this->cabinetMapper->expects(self::once())
			->method('update')
			->with(self::callback(static function (Cabinet $updated): bool {
				self::assertSame('Pantry', $updated->getName());
				self::assertSame('Dry food', $updated->getDescription());
				return true;
			}))
			->willReturnCallback(static fn (Cabinet $updated): Cabinet => $updated);
		$this->slotMapper->expects(self::once())->method('find')->with(3)->willReturn($slot);
		$this->slotMapper->expects(self::once())
			->method('update')
			->with(self::callback(static function (Slot $updated): bool {
				self::assertSame('Top shelf', $updated->getName());
				self::assertNull($updated->getDescription());
				return true;
			}))
			->willReturnCallback(static fn (Slot $updated): Slot => $updated);

		$this->service->updateLocation(1, ' New kitchen ', '  ');
		$this->service->updateCabinet(2, null, ' Dry food ');
		$this->service->updateSlot(3, ' Top shelf ', '  ');
	}

	public function testDeleteEmptySlotCommitsTransaction(): void {
		$slot = new Slot();
		$slot->setId(3);
		$this->db->expects(self::once())->method('beginTransaction');
		$this->db->expects(self::once())->method('commit');
		$this->db->expects(self::never())->method('rollBack');
		$this->slotMapper->expects(self::once())->method('find')->with(3)->willReturn($slot);
		$this->stockMapper->expects(self::once())->method('findBySlot')->with(3)->willReturn([]);
		$this->slotMapper->expects(self::once())->method('delete')->with($slot);

		$this->service->deleteSlot(3);
	}

	public function testDeleteLocationDeletesNestedZeroStockItemsAtomically(): void {
		$location = new Location();
		$location->setId(1);
		$cabinet = new Cabinet();
		$cabinet->setId(2);
		$slot = new Slot();
		$slot->setId(3);
		$stock = $this->stockItem(8, 3, 'Oats', 0);
		$folder = $this->createMock(ISimpleFolder::class);
		$folder->expects(self::once())->method('fileExists')->with('item_8.jpg')->willReturn(false);
		$appData = $this->createMock(IAppData::class);
		$appData->expects(self::once())->method('getFolder')->with('/')->willReturn($folder);
		$this->appDataFactory->expects(self::once())->method('get')->willReturn($appData);
		$this->locationMapper->expects(self::once())->method('find')->with(1)->willReturn($location);
		$this->locationMapper->expects(self::once())->method('delete')->with($location);
		$this->cabinetMapper->expects(self::once())->method('findByLocation')->with(1)->willReturn([$cabinet]);
		$this->cabinetMapper->expects(self::once())->method('find')->with(2)->willReturn($cabinet);
		$this->cabinetMapper->expects(self::once())->method('delete')->with($cabinet);
		$this->slotMapper->expects(self::once())->method('findByCabinet')->with(2)->willReturn([$slot]);
		$this->slotMapper->expects(self::once())->method('find')->with(3)->willReturn($slot);
		$this->slotMapper->expects(self::once())->method('delete')->with($slot);
		$this->stockMapper->expects(self::once())->method('findBySlot')->with(3)->willReturn([$stock]);
		$this->stockMapper->expects(self::once())->method('find')->with(8)->willReturn($stock);
		$this->stockMapper->expects(self::once())->method('delete')->with($stock);
		$this->db->expects(self::once())->method('beginTransaction');
		$this->db->expects(self::once())->method('commit');
		$this->db->expects(self::never())->method('rollBack');

		$this->service->deleteLocation(1);
	}

	public function testDeleteLocationRollsBackWhenCascadeFails(): void {
		$this->db->expects(self::once())->method('beginTransaction');
		$this->db->expects(self::never())->method('commit');
		$this->db->expects(self::once())->method('rollBack');
		$this->locationMapper->expects(self::once())
			->method('find')
			->with(1)
			->willThrowException(new \RuntimeException('database unavailable'));

		try {
			$this->service->deleteLocation(1);
			self::fail('The deletion error should be rethrown.');
		} catch (\RuntimeException $exception) {
			self::assertSame('database unavailable', $exception->getMessage());
		}
	}

	public function testItemImageIsStoredReadAndDeletedInAppData(): void {
		$imagePath = tempnam(sys_get_temp_dir(), 'lager-test-');
		self::assertNotFalse($imagePath);
		$image = imagecreatetruecolor(2, 2);
		imagejpeg($image, $imagePath);
		imagedestroy($image);

		$stock = $this->stockItem(12, 3, 'Green tea', 0);
		$this->stockMapper->expects(self::once())->method('find')->with(12)->willReturn($stock);
		$file = $this->createMock(ISimpleFile::class);
		$folder = $this->createMock(ISimpleFolder::class);
		$folder->expects(self::exactly(4))
			->method('fileExists')
			->with('item_12.jpg')
			->willReturnOnConsecutiveCalls(false, true, true, true);
		$folder->expects(self::once())
			->method('newFile')
			->with(
				'item_12.jpg',
				self::callback(static function (string $contents): bool {
					return str_starts_with($contents, "\xFF\xD8");
				}),
			)
			->willReturn($file);
		$folder->expects(self::exactly(2))->method('getFile')->with('item_12.jpg')->willReturn($file);
		$file->expects(self::once())->method('getContent')->willReturn('stored-jpeg');
		$file->expects(self::once())->method('delete');
		$appData = $this->createMock(IAppData::class);
		$appData->expects(self::exactly(4))->method('getFolder')->with('/')->willReturn($folder);
		$this->appDataFactory->expects(self::exactly(4))->method('get')->willReturn($appData);

		try {
			$saved = $this->service->saveItemImage(12, $imagePath);

			self::assertTrue($saved['ok']);
			self::assertGreaterThan(0, $saved['size']);
			self::assertSame('stored-jpeg', $this->service->getItemImage(12));
			self::assertTrue($this->service->hasItemImage(12));
			$this->service->deleteItemImage(12);
		} finally {
			unlink($imagePath);
		}
	}

	public function testItemImageRejectsUnrecognizedImageData(): void {
		$imagePath = tempnam(sys_get_temp_dir(), 'lager-test-');
		self::assertNotFalse($imagePath);
		file_put_contents($imagePath, 'not an image');

		try {
			$this->stockMapper->expects(self::once())
				->method('find')
				->with(12)
				->willReturn($this->stockItem(12, 3, 'Green tea', 0));
			$this->appDataFactory->expects(self::never())->method('get');
			$this->expectException(\InvalidArgumentException::class);
			$this->expectExceptionMessage('Image could not be processed.');

			$this->service->saveItemImage(12, $imagePath);
		} finally {
			unlink($imagePath);
		}
	}

	public function testCreateStockAllowsManualEntryWithoutEanOrImage(): void {
		$slot = new Slot();
		$slot->setId(3);
		$this->slotMapper->expects(self::once())->method('find')->with(3)->willReturn($slot);
		$this->stockMapper->expects(self::once())
			->method('findBySlotAndArticle')
			->with(3, 'Olive oil')
			->willReturn(null);
		$this->stockMapper->expects(self::never())->method('findByEan');
		$this->stockMapper->expects(self::once())
			->method('insert')
			->with(self::callback(static function (StockItem $stock): bool {
				self::assertSame('Olive oil', $stock->getArticle());
				self::assertSame('Extra virgin', $stock->getDescription());
				self::assertSame(0, $stock->getQuantity());
				self::assertNull($stock->getEan());
				self::assertGreaterThan(0, $stock->getCreatedAt());
				$stock->setId(12);
				return true;
			}))
			->willReturnCallback(static fn (StockItem $stock): StockItem => $stock);

		$result = $this->service->createStock(3, ' Olive oil ', ' Extra virgin ', 0);

		self::assertSame(12, $result['id']);
		self::assertNull($result['ean']);
		self::assertSame(0, $result['quantity']);
	}

	public function testCreateStockRejectsDuplicateArticleWhenNoInitialQuantityIsGiven(): void {
		$slot = new Slot();
		$this->slotMapper->method('find')->willReturn($slot);
		$existing = $this->stockItem(8, 3, 'Olive oil', 0);
		$this->stockMapper->method('findBySlotAndArticle')->willReturn($existing);
		$this->stockMapper->expects(self::never())->method('insert');

		$this->expectException(\InvalidArgumentException::class);
		$this->expectExceptionMessage('This article is already in the slot.');
		$this->service->createStock(3, 'Olive oil', null, 0);
	}

	public function testCreateStockRejectsEanAlreadyAssignedToAnotherArticle(): void {
		$slot = new Slot();
		$this->slotMapper->method('find')->willReturn($slot);
		$this->stockMapper->method('findBySlotAndArticle')->willReturn(null);
		$this->stockMapper->method('findByEan')->willReturn(
			$this->stockItem(8, 2, 'Other item', 1),
		);
		$this->stockMapper->expects(self::never())->method('insert');

		$this->expectException(\InvalidArgumentException::class);
		$this->expectExceptionMessage('This EAN/code is already assigned to another article.');
		$this->service->createStock(3, 'Olive oil', null, 0, ' 123456 ');
	}

	public function testUpdateStockRejectsDuplicateArticleInTheSameSlot(): void {
		$stock = $this->stockItem(9, 3, 'Green tea', 2);
		$duplicate = $this->stockItem(10, 3, 'Coffee', 1);
		$this->stockMapper->method('find')->with(9)->willReturn($stock);
		$this->stockMapper->method('findBySlotAndArticle')->willReturn($duplicate);
		$this->stockMapper->expects(self::never())->method('update');

		$this->expectException(\InvalidArgumentException::class);
		$this->expectExceptionMessage('This article is already in the slot.');
		$this->service->updateStock(9, 'Coffee', null);
	}

	public function testUpdateStockTrimsTextAndAllowsItsExistingEan(): void {
		$stock = $this->stockItem(9, 3, 'Green tea', 2);
		$stock->setEan('123456');
		$this->stockMapper->method('find')->with(9)->willReturn($stock);
		$this->stockMapper->method('findBySlotAndArticle')->willReturn(null);
		$this->stockMapper->method('findByEan')->willReturn($stock);
		$this->stockMapper->expects(self::once())
			->method('update')
			->with(self::callback(static function (StockItem $updated): bool {
				self::assertSame('Black tea', $updated->getArticle());
				self::assertSame('Loose leaf', $updated->getDescription());
				self::assertSame('123456', $updated->getEan());
				return true;
			}))
			->willReturnCallback(static fn (StockItem $updated): StockItem => $updated);

		$result = $this->service->updateStock(9, ' Black tea ', ' Loose leaf ', ' 123456 ');

		self::assertSame('Black tea', $result['article']);
		self::assertSame('Loose leaf', $result['description']);
	}

	public function testSearchIgnoresQueriesShorterThanTwoCharacters(): void {
		$this->stockMapper->expects(self::never())->method('findByArticleLike');

		self::assertSame([], $this->service->searchStock(' a '));
	}

	public function testSearchAddsLocationPathToMatchingStock(): void {
		$stock = new StockItem();
		$stock->setId(9);
		$stock->setSlotId(3);
		$stock->setArticle('Green tea');
		$stock->setQuantity(5);
		$slot = new Slot();
		$slot->setId(3);
		$slot->setCabinetId(2);
		$slot->setName('Shelf A');
		$cabinet = new Cabinet();
		$cabinet->setId(2);
		$cabinet->setLocationId(1);
		$cabinet->setName('Pantry');
		$location = new Location();
		$location->setId(1);
		$location->setName('Kitchen');
		$this->stockMapper->expects(self::once())
			->method('findByArticleLike')
			->with('tea')
			->willReturn([$stock]);
		$this->slotMapper->method('find')->with(3)->willReturn($slot);
		$this->cabinetMapper->method('find')->with(2)->willReturn($cabinet);
		$this->locationMapper->method('find')->with(1)->willReturn($location);

		$result = $this->service->searchStock(' tea ');

		self::assertCount(1, $result);
		self::assertSame('Kitchen / Pantry / Shelf A', $result[0]['slot_path']);
		self::assertSame(3, $result[0]['slot_id']);
		self::assertSame(5, $result[0]['quantity']);
	}

	public function testHistoryClampsLimitAndConvertsOptionalSlotId(): void {
		$this->movementMapper->expects(self::once())
			->method('findRecent')
			->with(500, 12, 'tea')
			->willReturn([]);

		self::assertSame([], $this->service->getHistory(900, '12', 'tea'));
	}

	public function testHistoryUsesMinimumLimitAndOmitsBlankSlotFilter(): void {
		$this->movementMapper->expects(self::once())
			->method('findRecent')
			->with(1, null, null)
			->willReturn([]);

		self::assertSame([], $this->service->getHistory(0, '', null));
	}

	public function testSearchByCodeReturnsNoMatchForBlankCode(): void {
		$this->stockMapper->expects(self::never())->method('findByEan');

		self::assertNull($this->service->searchByCode('   '));
	}

	public function testSearchByCodeTriesPartialEanOnlyForAtLeastSixCharacters(): void {
		$this->stockMapper->expects(self::once())->method('findByEan')->willReturn(null);
		$this->stockMapper->expects(self::never())->method('findByEanLike');
		$this->stockMapper->expects(self::never())->method('findByArticleLike');

		self::assertNull($this->service->searchByCode('abc'));
	}

	public function testSearchByCodeUsesExactEanBeforeFuzzyArticleSearch(): void {
		$stock = new StockItem();
		$stock->setId(9);
		$stock->setSlotId(3);
		$stock->setArticle('Green tea');
		$stock->setQuantity(5);
		$stock->setEan('1234567890123');
		$slot = new Slot();
		$slot->setId(3);
		$slot->setCabinetId(2);
		$slot->setName('Shelf A');
		$cabinet = new Cabinet();
		$cabinet->setId(2);
		$cabinet->setLocationId(1);
		$cabinet->setName('Pantry');
		$location = new Location();
		$location->setId(1);
		$location->setName('Kitchen');
		$this->stockMapper->expects(self::once())
			->method('findByEan')
			->with('1234567890123')
			->willReturn($stock);
		$this->stockMapper->expects(self::never())->method('findByEanLike');
		$this->stockMapper->expects(self::never())->method('findByArticleLike');
		$this->slotMapper->method('find')->with(3)->willReturn($slot);
		$this->cabinetMapper->method('find')->with(2)->willReturn($cabinet);
		$this->locationMapper->method('find')->with(1)->willReturn($location);

		$result = $this->service->searchByCode(' 1234567890123 ');

		self::assertSame('Green tea', $result['article']);
		self::assertSame('1234567890123', $result['ean']);
		self::assertSame('Kitchen / Pantry / Shelf A', $result['slot_path']);
	}

	public function testSearchByCodeFallsBackToPartialEanAndArticle(): void {
		$stock = $this->stockItem(9, 3, 'Green tea', 5);
		$stock->setEan('1234567890123');
		$slot = new Slot();
		$slot->setId(3);
		$slot->setCabinetId(2);
		$slot->setName('Shelf A');
		$cabinet = new Cabinet();
		$cabinet->setId(2);
		$cabinet->setLocationId(1);
		$cabinet->setName('Pantry');
		$location = new Location();
		$location->setId(1);
		$location->setName('Kitchen');
		$this->stockMapper->expects(self::exactly(2))->method('findByEan')->willReturn(null);
		$this->stockMapper->expects(self::once())
			->method('findByEanLike')
			->with('123456')
			->willReturn($stock);
		$this->stockMapper->expects(self::once())
			->method('findByArticleLike')
			->with('teas')
			->willReturn([$stock]);
		$this->slotMapper->expects(self::exactly(2))->method('find')->with(3)->willReturn($slot);
		$this->cabinetMapper->expects(self::exactly(2))->method('find')->with(2)->willReturn($cabinet);
		$this->locationMapper->expects(self::exactly(2))->method('find')->with(1)->willReturn($location);

		self::assertSame('Green tea', $this->service->searchByCode('123456')['article']);
		self::assertSame('Green tea', $this->service->searchByCode('teas')['article']);
	}

	public function testStockInUpdatesQuantityAndRecordsMovementAtomically(): void {
		$before = $this->stockItem(9, 3, 'Green tea', 4);
		$after = $this->stockItem(9, 3, 'Green tea', 7);
		$slot = new Slot();
		$slot->setId(3);
		$slot->setCabinetId(2);
		$slot->setName('Shelf A');
		$cabinet = new Cabinet();
		$cabinet->setId(2);
		$cabinet->setLocationId(1);
		$cabinet->setName('Pantry');
		$location = new Location();
		$location->setId(1);
		$location->setName('Kitchen');
		$user = $this->createMock(IUser::class);
		$user->method('getUID')->willReturn('alice');
		$this->userSession->method('getUser')->willReturn($user);
		$this->stockMapper->expects(self::exactly(2))
			->method('find')
			->with(9)
			->willReturnOnConsecutiveCalls($before, $after);
		$this->slotMapper->method('find')->with(3)->willReturn($slot);
		$this->cabinetMapper->method('find')->with(2)->willReturn($cabinet);
		$this->locationMapper->method('find')->with(1)->willReturn($location);
		$this->db->expects(self::once())->method('beginTransaction');
		$this->db->expects(self::once())->method('commit');
		$this->db->expects(self::never())->method('rollBack');
		$this->configureMovementQueryBuilder(1);
		$this->movementMapper->expects(self::once())
			->method('insert')
			->with(self::callback(static function (Movement $movement): bool {
				self::assertSame(9, $movement->getStockId());
				self::assertSame(3, $movement->getSlotId());
				self::assertSame('Green tea', $movement->getArticle());
				self::assertSame('Kitchen', $movement->getLocationName());
				self::assertSame('Pantry', $movement->getCabinetName());
				self::assertSame('Shelf A', $movement->getSlotName());
				self::assertSame('in', $movement->getType());
				self::assertSame(3, $movement->getQuantity());
				self::assertSame('weekly shop', $movement->getNote());
				self::assertSame('alice', $movement->getUser());
				return true;
			}))
			->willReturnArgument(0);

		$result = $this->service->moveStock(9, ' IN ', 3, ' weekly shop ');

		self::assertSame(7, $result['quantity']);
	}

	public function testStockWithdrawalInsufficientQuantityRollsBackWithoutHistory(): void {
		$before = $this->stockItem(9, 3, 'Green tea', 2);
		$this->stockMapper->expects(self::once())->method('find')->with(9)->willReturn($before);
		$slot = new Slot();
		$slot->setId(3);
		$slot->setCabinetId(2);
		$this->slotMapper->method('find')->with(3)->willReturn($slot);
		$cabinet = new Cabinet();
		$cabinet->setId(2);
		$cabinet->setLocationId(1);
		$this->cabinetMapper->method('find')->with(2)->willReturn($cabinet);
		$location = new Location();
		$location->setId(1);
		$this->locationMapper->method('find')->with(1)->willReturn($location);
		$this->db->expects(self::once())->method('beginTransaction');
		$this->db->expects(self::never())->method('commit');
		$this->db->expects(self::once())->method('rollBack');
		$this->configureMovementQueryBuilder(0);
		$this->movementMapper->expects(self::never())->method('insert');

		$this->expectException(\InvalidArgumentException::class);
		$this->expectExceptionMessage('Not enough stock for this withdrawal.');
		$this->service->moveStock(9, 'out', 3, null);
	}

	public function testMovementRejectsInvalidTypeAndNonPositiveQuantityBeforeTransaction(): void {
		$this->stockMapper->method('find')->willReturn(
			$this->stockItem(9, 3, 'Green tea', 2),
		);
		$this->db->expects(self::never())->method('beginTransaction');
		$this->db->expects(self::never())->method('getQueryBuilder');

		try {
			$this->service->moveStock(9, 'adjust', 1, null);
			self::fail('Invalid movement types must be rejected.');
		} catch (\InvalidArgumentException $exception) {
			self::assertSame('Movement type must be "in" or "out".', $exception->getMessage());
		}

		try {
			$this->service->moveStock(9, 'in', 0, null);
			self::fail('Non-positive movement quantities must be rejected.');
		} catch (\InvalidArgumentException $exception) {
			self::assertSame('Quantity must be greater than 0.', $exception->getMessage());
		}
	}

	private function stockItem(int $id, int $slotId, string $article, int $quantity): StockItem {
		$stock = new StockItem();
		$stock->setId($id);
		$stock->setSlotId($slotId);
		$stock->setArticle($article);
		$stock->setQuantity($quantity);
		return $stock;
	}

	private function configureMovementQueryBuilder(int $affectedRows): void {
		$builder = $this->createMock(IQueryBuilder::class);
		$expressionBuilder = $this->createMock(IExpressionBuilder::class);
		$expressionBuilder->method('eq')->willReturn('id = :id');
		$expressionBuilder->method('gte')->willReturn('quantity >= :quantity');
		$builder->method('expr')->willReturn($expressionBuilder);
		$builder->method('update')->willReturnSelf();
		$builder->method('set')->willReturnSelf();
		$builder->method('where')->willReturnSelf();
		$builder->method('andWhere')->willReturnSelf();
		$builder->method('createNamedParameter')->willReturn('?');
		$builder->method('createFunction')->willReturn('quantity + ?');
		$builder->method('executeStatement')->willReturn($affectedRows);
		$this->db->method('getQueryBuilder')->willReturn($builder);
	}
}
