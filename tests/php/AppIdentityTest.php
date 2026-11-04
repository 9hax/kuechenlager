<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Tests;

use OCA\Kuechenlager\AppInfo\Application;
use PHPUnit\Framework\TestCase;

final class AppIdentityTest extends TestCase {
	public function testApplicationMetadataUsesAnIndependentNextcloudIdentity(): void {
		$metadata = simplexml_load_file(__DIR__ . '/../../appinfo/info.xml');
		self::assertNotFalse($metadata);

		self::assertSame('kuechenlager', (string)$metadata->id);
		self::assertSame('Kuechenlager', (string)$metadata->namespace);
		self::assertSame('kuechenlager', Application::APP_ID);
		self::assertSame('Küchenlager', (string)$metadata->name);
		self::assertSame('kuechenlager.page.main', (string)$metadata->navigations->navigation->route);
		self::assertStringContainsString('gemeinsames Inventarmanagement', (string)$metadata->description);
		self::assertStringContainsString('Suche nach Titel, Hersteller, EAN, Notizen und Tags', (string)$metadata->description);
		self::assertSame('https://github.com/9hax/kuechenlager.git', (string)$metadata->repository);

		foreach ($metadata->screenshot as $screenshot) {
			$url = (string)$screenshot;
			self::assertStringStartsWith(
				'https://raw.githubusercontent.com/9hax/kuechenlager/main/docs/screenshots/',
				$url,
			);
			self::assertFileExists(__DIR__ . '/../../docs/screenshots/' . basename((string)parse_url($url, PHP_URL_PATH)));
		}

		$composer = json_decode(
			(string)file_get_contents(__DIR__ . '/../../composer.json'),
			true,
			512,
			JSON_THROW_ON_ERROR,
		);
		self::assertSame('lib/', $composer['autoload']['psr-4']['OCA\\Kuechenlager\\']);
	}

	public function testDatabaseTablesAreIsolatedFromTheOriginalApp(): void {
		$expectedTables = [
			'kuechenlager_locations',
			'kuechenlager_cabinets',
			'kuechenlager_slots',
			'kuechenlager_stock',
			'kuechenlager_movements',
			'kuechenlager_tags',
			'kuechenlager_stock_tags',
		];
		$files = [
			__DIR__ . '/../../lib/Db/LocationMapper.php',
			__DIR__ . '/../../lib/Db/CabinetMapper.php',
			__DIR__ . '/../../lib/Db/SlotMapper.php',
			__DIR__ . '/../../lib/Db/StockItemMapper.php',
			__DIR__ . '/../../lib/Db/MovementMapper.php',
			__DIR__ . '/../../lib/Migration/Version010000Date20260831000000.php',
			__DIR__ . '/../../lib/Migration/Version010100Date20260921000000.php',
			__DIR__ . '/../../lib/Migration/Version010200Date20261001000000.php',
			__DIR__ . '/../../lib/Service/LagerService.php',
		];
		$source = implode("\n", array_map(
			static fn (string $file): string => (string)file_get_contents($file),
			$files,
		));

		foreach ($expectedTables as $table) {
			self::assertStringContainsString($table, $source);
		}
		self::assertStringNotContainsString("'lager_", $source);
		self::assertStringNotContainsString('"lager_', $source);
		self::assertStringContainsString("'manufacturer'", $source);
		self::assertStringContainsString("'kuechenlager_stock_tags'", $source);
	}

	public function testFooterCreditsTheVerifiedBaseAppWithoutFloatingDonationControl(): void {
		$template = (string)file_get_contents(__DIR__ . '/../../templates/main.php');
		$styles = (string)file_get_contents(__DIR__ . '/../../css/lager.css');

		self::assertStringContainsString('class="lager-footer"', $template);
		self::assertStringContainsString("\$l->t('Based on')", $template);
		self::assertStringContainsString('>wenigdigital/lager</a>.', $template);
		self::assertStringContainsString("\$l->t('Donate to the original project here.')", $template);
		self::assertStringContainsString('href="https://github.com/wenigdigital/lager"', $template);
		self::assertStringContainsString('href="https://paypal.me/ToniWenig"', $template);
		self::assertStringNotContainsString('Kitchen inventory management for Nextcloud', $template);
		self::assertStringNotContainsString('Based on the original Lager app by T. Wenig.', $template);
		self::assertStringNotContainsString('class="lager-donate"', $template);
		self::assertDoesNotMatchRegularExpression('/\.lager-donate\s*\{[^}]*position:\s*fixed/s', $styles);
		self::assertStringContainsString('.lager-footer {', $styles);
	}

	public function testAddArticleButtonIsAlwaysVisibleAndInitiallyDisabled(): void {
		$template = (string)file_get_contents(__DIR__ . '/../../templates/main.php');

		self::assertMatchesRegularExpression(
			'/<button id="lager-add-article-btn"[^>]*disabled>/',
			$template,
		);
		self::assertStringContainsString('id="lager-add-article-hint" role="status"', $template);
		self::assertStringContainsString("\$l->t('Select a location.')", $template);
	}
}
