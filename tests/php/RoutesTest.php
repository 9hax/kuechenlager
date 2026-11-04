<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Tests;

use PHPUnit\Framework\TestCase;

final class RoutesTest extends TestCase {
	public function testRootLocationCreationRouteTargetsTheApiController(): void {
		$routes = require dirname(__DIR__, 2) . '/appinfo/routes.php';
		$matches = array_values(array_filter(
			$routes['routes'],
			static fn (array $route): bool => $route['url'] === '/api/location'
				&& $route['verb'] === 'POST',
		));

		self::assertCount(1, $matches);
		self::assertSame('api#createLocation', $matches[0]['name']);
	}

	public function testTagManagementRoutesExposeSharedTagOperations(): void {
		$routes = require dirname(__DIR__, 2) . '/appinfo/routes.php';
		$registeredRoutes = array_map(
			static fn (array $route): string => $route['verb'] . ' ' . $route['url'],
			$routes['routes'],
		);

		self::assertContains('GET /api/tags', $registeredRoutes);
		self::assertContains('POST /api/tag', $registeredRoutes);
		self::assertContains('PUT /api/tag/{id}', $registeredRoutes);
		self::assertContains('DELETE /api/tag/{id}', $registeredRoutes);
	}

	public function testLocationImageRoutesSupportUploadAndDisplay(): void {
		$routes = require dirname(__DIR__, 2) . '/appinfo/routes.php';
		$registeredRoutes = array_map(
			static fn (array $route): string => $route['verb'] . ' ' . $route['url'],
			$routes['routes'],
		);

		self::assertContains('POST /api/location/{id}/image', $registeredRoutes);
		self::assertContains('GET /api/location/{id}/image', $registeredRoutes);
	}

	public function testInventoryCanBeLoadedByLocationAndCabinet(): void {
		$routes = require dirname(__DIR__, 2) . '/appinfo/routes.php';
		$registeredRoutes = array_map(
			static fn (array $route): string => $route['verb'] . ' ' . $route['url'],
			$routes['routes'],
		);

		self::assertContains('GET /api/stock/location/{location_id}', $registeredRoutes);
		self::assertContains('GET /api/stock/cabinet/{cabinet_id}', $registeredRoutes);
	}

	public function testShoppingListRouteIsAvailable(): void {
		$routes = require dirname(__DIR__, 2) . '/appinfo/routes.php';
		$registeredRoutes = array_map(
			static fn (array $route): string => $route['verb'] . ' ' . $route['url'],
			$routes['routes'],
		);

		self::assertContains('GET /api/stock/shopping-list', $registeredRoutes);
	}

	public function testAdminWebhookSettingsHaveASaveRoute(): void {
		$routes = require dirname(__DIR__, 2) . '/appinfo/routes.php';
		$registeredRoutes = array_map(
			static fn (array $route): string => $route['verb'] . ' ' . $route['url'],
			$routes['routes'],
		);

		self::assertContains('POST /settings/webhook', $registeredRoutes);
	}
}
