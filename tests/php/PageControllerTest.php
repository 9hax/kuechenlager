<?php

declare(strict_types=1);

namespace OCA\Kuechenlager\Tests;

use OCA\Kuechenlager\AppInfo\Application;
use OCA\Kuechenlager\Controller\PageController;
use OCP\AppFramework\Http\RedirectResponse;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IRequest;
use OCP\IURLGenerator;
use PHPUnit\Framework\TestCase;

final class PageControllerTest extends TestCase {
	public function testMainRendersPageWithoutAdminSpecificData(): void {
		$request = $this->createMock(IRequest::class);
		$urlGenerator = $this->createMock(IURLGenerator::class);

		$response = (new PageController($request, $urlGenerator))->main();

		self::assertInstanceOf(TemplateResponse::class, $response);
		self::assertSame(Application::APP_ID, $response->getApp());
		self::assertSame('main', $response->getTemplateName());
		self::assertSame([], $response->getParams());
	}

	public function testRedirectUsesTheMainPageRoute(): void {
		$request = $this->createMock(IRequest::class);
		$urlGenerator = $this->createMock(IURLGenerator::class);
		$urlGenerator->expects(self::once())
			->method('linkToRoute')
			->with('kuechenlager_page_main')
			->willReturn('/apps/kuechenlager/page/main');

		$response = (new PageController($request, $urlGenerator))->redirect();

		self::assertInstanceOf(RedirectResponse::class, $response);
		self::assertSame('/apps/kuechenlager/page/main', $response->getRedirectURL());
	}
}
