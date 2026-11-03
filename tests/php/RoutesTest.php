<?php

declare(strict_types=1);

namespace OCA\Lager\Tests;

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
}
