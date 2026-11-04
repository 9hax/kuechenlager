<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Tests;

use OCA\Kuechenlager\Controller\ApiController;
use OCP\AppFramework\Db\DoesNotExistException;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\DataDisplayResponse;
use OCA\Kuechenlager\Service\LagerService;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IL10N;
use OCP\IRequest;
use PHPUnit\Framework\TestCase;

final class ApiControllerTest extends TestCase {
	public function testDeleteEndpointsAreAvailableToNonAdministrators(): void {
		foreach (['deleteLocation', 'deleteCabinet', 'deleteSlot', 'deleteStock', 'uploadLocationImage', 'getLocationImage'] as $method) {
			$attributes = (new \ReflectionMethod(ApiController::class, $method))
				->getAttributes(NoAdminRequired::class);
			self::assertCount(1, $attributes, $method . ' must be available to regular users.');
		}
	}

	public function testLocationImageEndpointReturnsJpegOrNotFound(): void {
		$service = $this->createMock(LagerService::class);
		$calls = 0;
		$service->expects(self::exactly(3))
			->method('getLocationImage')
			->with(17)
			->willReturnCallback(static function () use (&$calls): ?string {
				$calls++;
				if ($calls === 1) {
					return 'jpeg-data';
				}
				if ($calls === 2) {
					return null;
				}
				throw new DoesNotExistException('missing');
			});
		$request = $this->createMock(IRequest::class);
		$l10n = $this->createMock(IL10N::class);
		$l10n->method('t')->willReturn('Not found.');
		$controller = new ApiController('lager', $request, $service, $l10n);

		$image = $controller->getLocationImage(17);
		self::assertInstanceOf(DataDisplayResponse::class, $image);
		self::assertSame(Http::STATUS_OK, $image->getStatus());

		$missing = $controller->getLocationImage(17);
		self::assertSame(Http::STATUS_NOT_FOUND, $missing->getStatus());
		self::assertSame('Not found.', $missing->getData()['error']);

		$missingLocation = $controller->getLocationImage(17);
		self::assertSame(Http::STATUS_NOT_FOUND, $missingLocation->getStatus());
		self::assertSame('Not found.', $missingLocation->getData()['error']);
	}

	public function testLocationImageUploadDelegatesUploadedTemporaryFile(): void {
		$request = $this->createMock(IRequest::class);
		$request->expects(self::once())->method('getUploadedFile')->with('file')->willReturn([
			'error' => \UPLOAD_ERR_OK,
			'tmp_name' => 'C:\\temp\\location.jpg',
			'size' => 1024,
		]);
		$service = $this->createMock(LagerService::class);
		$service->expects(self::once())
			->method('saveLocationImage')
			->with(17, 'C:\\temp\\location.jpg')
			->willReturn(['ok' => true, 'size' => 512]);
		$l10n = $this->createMock(IL10N::class);
		$controller = new ApiController('lager', $request, $service, $l10n);

		$response = $controller->uploadLocationImage(17);

		self::assertSame(Http::STATUS_OK, $response->getStatus());
		self::assertSame(['ok' => true, 'size' => 512], $response->getData());
	}

	public function testCreateLocationDelegatesRootLocationCreationAndReturnsJson(): void {
		$service = $this->createMock(LagerService::class);
		$service->expects(self::once())
			->method('createLocation')
			->with('Kitchen', 'Pantry')
			->willReturn([
				'id' => 17,
				'name' => 'Kitchen',
				'description' => 'Pantry',
				'created_at' => 123,
			]);
		$request = $this->createMock(IRequest::class);
		$l10n = $this->createMock(IL10N::class);

		$controller = new ApiController('lager', $request, $service, $l10n);

		$response = $controller->createLocation('Kitchen', 'Pantry');

		self::assertInstanceOf(JSONResponse::class, $response);
		self::assertSame(200, $response->getStatus());
		self::assertSame('Kitchen', $response->getData()['name']);
		self::assertSame(17, $response->getData()['id']);
	}

	public function testCreateLocationMapsInvalidInputToBadRequest(): void {
		$service = $this->createMock(LagerService::class);
		$service->method('createLocation')
			->willThrowException(new \InvalidArgumentException('Name is invalid.'));
		$request = $this->createMock(IRequest::class);
		$l10n = $this->createMock(IL10N::class);

		$response = (new ApiController('lager', $request, $service, $l10n))
			->createLocation(' ', null);

		self::assertSame(400, $response->getStatus());
		self::assertSame('Name is invalid.', $response->getData()['error']);
	}

	public function testCreateLocationMapsMissingEntityToNotFound(): void {
		$service = $this->createMock(LagerService::class);
		$service->method('createLocation')
			->willThrowException(new DoesNotExistException('missing'));
		$request = $this->createMock(IRequest::class);
		$l10n = $this->createMock(IL10N::class);
		$l10n->method('t')->willReturn('Not found.');

		$response = (new ApiController('lager', $request, $service, $l10n))
			->createLocation('Kitchen', null);

		self::assertSame(Http::STATUS_NOT_FOUND, $response->getStatus());
		self::assertSame('Not found.', $response->getData()['error']);
	}

	public function testCreateLocationMapsUnexpectedErrorsToInternalServerError(): void {
		$service = $this->createMock(LagerService::class);
		$service->method('createLocation')
			->willThrowException(new \RuntimeException('database unavailable'));
		$request = $this->createMock(IRequest::class);
		$l10n = $this->createMock(IL10N::class);
		$l10n->method('t')->willReturn('Unexpected error.');

		$response = (new ApiController('lager', $request, $service, $l10n))
			->createLocation('Kitchen', null);

		self::assertSame(Http::STATUS_INTERNAL_SERVER_ERROR, $response->getStatus());
		self::assertSame('Unexpected error.', $response->getData()['error']);
	}

	public function testReadEndpointsDelegateFiltersAndReturnServiceResults(): void {
		$tree = [['id' => 1, 'name' => 'Kitchen']];
		$slot = ['id' => 3, 'name' => 'Shelf A'];
		$history = [['id' => 8, 'type' => 'in']];
		$article = ['id' => 12, 'article' => 'Green tea'];
		$locationInventory = ['location' => ['id' => 1], 'items' => [$article]];
		$cabinetInventory = ['cabinet' => ['id' => 2], 'items' => [$article]];
		$service = $this->createMock(LagerService::class);
		$service->expects(self::once())->method('getTree')->willReturn($tree);
		$service->expects(self::once())->method('getSlot')->with(3)->willReturn($slot);
		$service->expects(self::once())->method('getStockBySlot')->with(3)->willReturn([$article]);
		$service->expects(self::once())->method('getStockByLocation')->with(1)->willReturn($locationInventory);
		$service->expects(self::once())->method('getStockByCabinet')->with(2)->willReturn($cabinetInventory);
		$service->expects(self::once())->method('getShoppingList')->willReturn([$article]);
		$service->expects(self::once())->method('getHistory')->with(25, '3', 'tea')->willReturn($history);
		$service->expects(self::once())->method('searchStock')->with('tea')->willReturn([$article]);
		$service->expects(self::once())->method('searchByCode')->with('1234567890123')->willReturn($article);
		$request = $this->createMock(IRequest::class);
		$l10n = $this->createMock(IL10N::class);
		$l10n->method('t')->willReturnCallback(static fn (string $text): string => $text);
		$controller = new ApiController('lager', $request, $service, $l10n);

		self::assertSame($tree, $controller->tree()->getData());
		self::assertSame(['slot' => $slot, 'items' => [$article]], $controller->stockBySlot(3)->getData());
		self::assertSame($locationInventory, $controller->stockByLocation(1)->getData());
		self::assertSame($cabinetInventory, $controller->stockByCabinet(2)->getData());
		self::assertSame([$article], $controller->shoppingList()->getData());
		self::assertSame($history, $controller->history(25, '3', 'tea')->getData());
		self::assertSame([$article], $controller->search('tea')->getData());
		self::assertSame($article, $controller->scanByCode('1234567890123')->getData());
	}

	public function testLocationCabinetAndSlotEndpointsDelegateMutations(): void {
		$service = $this->createMock(LagerService::class);
		$service->expects(self::once())->method('updateLocation')->with(1, 'Kitchen', null)->willReturn(['id' => 1]);
		$service->expects(self::once())->method('deleteLocation')->with(1);
		$service->expects(self::once())->method('createCabinet')->with(1, 'Pantry', null)->willReturn(['id' => 2]);
		$service->expects(self::once())->method('updateCabinet')->with(2, 'Pantry', null)->willReturn(['id' => 2]);
		$service->expects(self::once())->method('deleteCabinet')->with(2);
		$service->expects(self::once())->method('createSlot')->with(2, 'Shelf A', null)->willReturn(['id' => 3]);
		$service->expects(self::once())->method('updateSlot')->with(3, 'Shelf A', null)->willReturn(['id' => 3]);
		$service->expects(self::once())->method('deleteSlot')->with(3);
		$request = $this->createMock(IRequest::class);
		$l10n = $this->createMock(IL10N::class);
		$controller = new ApiController('lager', $request, $service, $l10n);

		self::assertSame(['id' => 1], $controller->updateLocation(1, 'Kitchen')->getData());
		self::assertSame(['ok' => true], $controller->deleteLocation(1)->getData());
		self::assertSame(['id' => 2], $controller->createCabinet(1, 'Pantry')->getData());
		self::assertSame(['id' => 2], $controller->updateCabinet(2, 'Pantry')->getData());
		self::assertSame(['ok' => true], $controller->deleteCabinet(2)->getData());
		self::assertSame(['id' => 3], $controller->createSlot(2, 'Shelf A')->getData());
		self::assertSame(['id' => 3], $controller->updateSlot(3, 'Shelf A')->getData());
		self::assertSame(['ok' => true], $controller->deleteSlot(3)->getData());
	}

	public function testStockMutationEndpointsReadEanAndDelegateMovement(): void {
		$created = ['id' => 12, 'article' => 'Green tea'];
		$updated = ['id' => 12, 'article' => 'Black tea'];
		$service = $this->createMock(LagerService::class);
		$service->expects(self::once())
			->method('createStock')
			->with(3, 'Green tea', null, 2, '1234567890123', null, [], 0)
			->willReturn($created);
		$service->expects(self::once())
			->method('updateStock')
			->with(12, 'Black tea', null, '9876543210123', null, null, null)
			->willReturn($updated);
		$service->expects(self::once())->method('deleteStock')->with(12);
		$service->expects(self::once())
			->method('moveStock')
			->with(12, 'in', 2, 'Restock')
			->willReturn(['id' => 18, 'quantity' => 2]);
		$request = $this->createMock(IRequest::class);
		$request->method('getParams')->willReturnOnConsecutiveCalls(
			['ean' => '1234567890123'],
			[],
		);
		$request->method('getHeader')->with('Content-Type')->willReturn('application/json');
		$request->method('getParam')->willReturnCallback(
			static fn (string $key): ?string => $key === 'ean' ? '9876543210123' : null,
		);
		$l10n = $this->createMock(IL10N::class);
		$controller = new ApiController('lager', $request, $service, $l10n);

		self::assertSame($created, $controller->createStock(3, 'Green tea', null, 2)->getData());
		self::assertSame($updated, $controller->updateStock(12, 'Black tea')->getData());
		self::assertSame(['ok' => true], $controller->deleteStock(12)->getData());
		self::assertSame(
			['id' => 18, 'quantity' => 2],
			$controller->createMovement(12, 'in', 2, 'Restock')->getData(),
		);
	}

	public function testCreateStockCanTargetCabinetWithoutASlot(): void {
		$created = ['id' => 12, 'article' => 'Tea', 'cabinet_id' => 4, 'slot_id' => null];
		$service = $this->createMock(LagerService::class);
		$service->expects(self::once())
			->method('createStockInCabinet')
			->with(4, 'Tea', null, 2, null, null, [], 0)
			->willReturn($created);
		$request = $this->createMock(IRequest::class);
		$request->method('getParams')->willReturn([]);
		$request->method('getParam')->willReturn(null);
		$l10n = $this->createMock(IL10N::class);

		$response = (new ApiController('kuechenlager', $request, $service, $l10n))
			->createStock(null, 'Tea', null, 2, null, 4);

		self::assertSame($created, $response->getData());
	}

	public function testStockEndpointsAcceptMinimumQuantity(): void {
		$service = $this->createMock(LagerService::class);
		$service->expects(self::once())
			->method('createStock')
			->with(3, 'Tea', null, 2, null, null, [], 4)
			->willReturn(['id' => 12, 'minimum_quantity' => 4]);
		$service->expects(self::once())
			->method('updateStock')
			->with(12, null, null, null, null, null, 5)
			->willReturn(['id' => 12, 'minimum_quantity' => 5]);
		$request = $this->createMock(IRequest::class);
		$request->method('getParam')->willReturn(null);
		$controller = new ApiController('kuechenlager', $request, $service, $this->createMock(IL10N::class));

		self::assertSame(
			['id' => 12, 'minimum_quantity' => 4],
			$controller->createStock(slot_id: 3, article: 'Tea', quantity: 2, minimum_quantity: 4)->getData(),
		);
		self::assertSame(
			['id' => 12, 'minimum_quantity' => 5],
			$controller->updateStock(12, minimum_quantity: 5)->getData(),
		);
	}

	public function testTagEndpointsDelegateSharedTagManagement(): void {
		$service = $this->createMock(LagerService::class);
		$service->expects(self::once())->method('getTags')->willReturn([['id' => 7, 'name' => 'Vegan']]);
		$service->expects(self::once())->method('createTag')->with('Vegan')->willReturn(['id' => 7, 'name' => 'Vegan']);
		$service->expects(self::once())->method('updateTag')->with(7, 'Plant-based')->willReturn(['id' => 7, 'name' => 'Plant-based']);
		$service->expects(self::once())->method('deleteTag')->with(7);
		$request = $this->createMock(IRequest::class);
		$l10n = $this->createMock(IL10N::class);
		$controller = new ApiController('kuechenlager', $request, $service, $l10n);

		self::assertSame([['id' => 7, 'name' => 'Vegan']], $controller->tags()->getData());
		self::assertSame(['id' => 7, 'name' => 'Vegan'], $controller->createTag('Vegan')->getData());
		self::assertSame(['id' => 7, 'name' => 'Plant-based'], $controller->updateTag(7, 'Plant-based')->getData());
		self::assertSame(['ok' => true], $controller->deleteTag(7)->getData());
	}

	public function testStockEndpointsAcceptManufacturerNotesAndCommaSeparatedTags(): void {
		$service = $this->createMock(LagerService::class);
		$service->expects(self::once())
			->method('createStock')
			->with(3, 'Oat milk', 'Unsweetened', 2, null, 'Local farm', ['Vegan', 'Breakfast'], 0)
			->willReturn(['id' => 12]);
		$service->expects(self::once())
			->method('updateStock')
			->with(12, 'Oat milk', 'Barista blend', null, 'Local farm', ['Vegan'], null)
			->willReturn(['id' => 12]);
		$request = $this->createMock(IRequest::class);
		$request->method('getParam')->willReturnOnConsecutiveCalls(
			'Local farm',
			'Unsweetened',
			'Vegan, Breakfast',
			null,
			'Local farm',
			'Barista blend',
			'Vegan',
		);
		$l10n = $this->createMock(IL10N::class);
		$controller = new ApiController('kuechenlager', $request, $service, $l10n);

		self::assertSame(['id' => 12], $controller->createStock(3, 'Oat milk', null, 2)->getData());
		self::assertSame(['id' => 12], $controller->updateStock(12, 'Oat milk', null)->getData());
	}

	public function testImageUploadRejectsMissingAndOversizedFiles(): void {
		$service = $this->createMock(LagerService::class);
		$request = $this->createMock(IRequest::class);
		$request->method('getUploadedFile')->with('file')->willReturnOnConsecutiveCalls(
			null,
			[
				'error' => \UPLOAD_ERR_OK,
				'tmp_name' => 'unused',
				'size' => 10 * 1024 * 1024 + 1,
			],
		);
		$l10n = $this->createMock(IL10N::class);
		$l10n->method('t')->willReturnCallback(static fn (string $text): string => $text);
		$controller = new ApiController('lager', $request, $service, $l10n);

		$missing = $controller->uploadStockImage(12);
		self::assertSame(Http::STATUS_BAD_REQUEST, $missing->getStatus());
		self::assertSame('No image uploaded.', $missing->getData()['error']);

		$large = $controller->uploadStockImage(12);
		self::assertSame(Http::STATUS_BAD_REQUEST, $large->getStatus());
		self::assertSame('Image is too large (max. 10 MB).', $large->getData()['error']);
	}

	public function testImageUploadDelegatesValidTemporaryFile(): void {
		$imagePath = tempnam(sys_get_temp_dir(), 'lager-upload-');
		self::assertNotFalse($imagePath);
		file_put_contents($imagePath, 'image payload');
		$service = $this->createMock(LagerService::class);
		$service->expects(self::once())
			->method('saveItemImage')
			->with(12, $imagePath)
			->willReturn(['ok' => true, 'size' => 11]);
		$request = $this->createMock(IRequest::class);
		$request->expects(self::once())->method('getUploadedFile')->with('file')->willReturn([
			'error' => \UPLOAD_ERR_OK,
			'tmp_name' => $imagePath,
			'size' => 13,
		]);
		$l10n = $this->createMock(IL10N::class);
		$controller = new ApiController('lager', $request, $service, $l10n);

		try {
			$response = $controller->uploadStockImage(12);

			self::assertSame(Http::STATUS_OK, $response->getStatus());
			self::assertSame(['ok' => true, 'size' => 11], $response->getData());
		} finally {
			unlink($imagePath);
		}
	}

	public function testImageResponsesExposeJpegAndNoStoreForMissingImage(): void {
		$service = $this->createMock(LagerService::class);
		$service->expects(self::exactly(2))
			->method('getItemImage')
			->with(12)
			->willReturnOnConsecutiveCalls('jpeg-bytes', null);
		$request = $this->createMock(IRequest::class);
		$l10n = $this->createMock(IL10N::class);
		$l10n->method('t')->with('Not found.')->willReturn('Not found.');
		$controller = new ApiController('lager', $request, $service, $l10n);

		$image = $controller->getStockImage(12);
		self::assertInstanceOf(DataDisplayResponse::class, $image);
		self::assertSame(Http::STATUS_OK, $image->getStatus());
		self::assertSame('jpeg-bytes', $image->render());

		$missing = $controller->getStockImage(12);
		self::assertSame(Http::STATUS_NOT_FOUND, $missing->getStatus());
		self::assertSame('Not found.', $missing->getData()['error']);
	}

	public function testScanWithoutMatchReturnsNotFound(): void {
		$service = $this->createMock(LagerService::class);
		$service->expects(self::once())->method('searchByCode')->with('unknown')->willReturn(null);
		$request = $this->createMock(IRequest::class);
		$l10n = $this->createMock(IL10N::class);
		$l10n->method('t')->willReturnCallback(static fn (string $text): string => $text);

		$response = (new ApiController('lager', $request, $service, $l10n))->scanByCode('unknown');

		self::assertSame(Http::STATUS_NOT_FOUND, $response->getStatus());
		self::assertSame('Not found.', $response->getData()['error']);
	}
}
