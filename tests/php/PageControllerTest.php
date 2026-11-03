<?php

declare(strict_types=1);

namespace OCA\Lager\Tests;

use OCA\Lager\AppInfo\Application;
use OCA\Lager\Controller\PageController;
use OCP\AppFramework\Http\RedirectResponse;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IGroupManager;
use OCP\IRequest;
use OCP\IURLGenerator;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\TestCase;

final class PageControllerTest extends TestCase {
	public function testMainRendersPageForNonAdmin(): void {
		$request = $this->createMock(IRequest::class);
		$urlGenerator = $this->createMock(IURLGenerator::class);
		$userSession = $this->createMock(IUserSession::class);
		$userSession->expects(self::once())->method('getUser')->willReturn(null);
		$groupManager = $this->createMock(IGroupManager::class);
		$groupManager->expects(self::never())->method('isAdmin');

		$response = (new PageController($request, $urlGenerator, $userSession, $groupManager))->main();

		self::assertInstanceOf(TemplateResponse::class, $response);
		self::assertSame(Application::APP_ID, $response->getApp());
		self::assertSame('main', $response->getTemplateName());
		self::assertSame(['isAdmin' => false], $response->getParams());
	}

	public function testMainMarksLoggedInAdministrator(): void {
		$request = $this->createMock(IRequest::class);
		$urlGenerator = $this->createMock(IURLGenerator::class);
		$user = $this->createMock(IUser::class);
		$user->method('getUID')->willReturn('alice');
		$userSession = $this->createMock(IUserSession::class);
		$userSession->method('getUser')->willReturn($user);
		$groupManager = $this->createMock(IGroupManager::class);
		$groupManager->expects(self::once())->method('isAdmin')->with('alice')->willReturn(true);

		$response = (new PageController($request, $urlGenerator, $userSession, $groupManager))->main();

		self::assertSame(['isAdmin' => true], $response->getParams());
	}

	public function testRedirectUsesTheMainPageRoute(): void {
		$request = $this->createMock(IRequest::class);
		$urlGenerator = $this->createMock(IURLGenerator::class);
		$urlGenerator->expects(self::once())
			->method('linkToRoute')
			->with('lager_page_main')
			->willReturn('/apps/lager/page/main');
		$userSession = $this->createMock(IUserSession::class);
		$groupManager = $this->createMock(IGroupManager::class);

		$response = (new PageController($request, $urlGenerator, $userSession, $groupManager))->redirect();

		self::assertInstanceOf(RedirectResponse::class, $response);
		self::assertSame('/apps/lager/page/main', $response->getRedirectURL());
	}
}
