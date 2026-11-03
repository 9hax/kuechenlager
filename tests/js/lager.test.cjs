'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'js/lager.js'), 'utf8');
const appMarkup = `<!doctype html>
	<html><head data-requesttoken="head-token"></head><body>
		<div id="app-content" data-is-admin="0">
			<button id="lager-add-location-btn"></button>
			<input id="lager-search">
			<div id="lager-search-results" class="hidden"></div>
			<button id="lager-history-btn"></button>
			<button id="lager-scan-btn"></button>
			<button id="lager-scan-close"></button>
			<button id="lager-qr-close"></button>
			<button id="lager-scan-manual-btn"></button>
			<input id="lager-scan-manual">
			<input id="lager-scan-file" type="file">
			<button id="lager-scan-file-btn"></button>
			<div id="lager-scan-status"></div>
			<ul id="lager-tree"></ul>
			<div id="lager-tree-empty" class="hidden"></div>
			<div id="lager-detail" class="detail-empty"></div>
			<div id="lager-scan-modal" class="hidden"></div>
			<div id="lager-scan-result" class="hidden"></div>
			<div id="html5-qrcode-region"></div>
			<div id="lager-qr-modal" class="hidden"></div>
			<div id="lager-qr-content"></div>
		</div>
	</body></html>`;

function loadFrontend({ fetchImpl = async () => {}, window = {} } = {}) {
	const closure = source.lastIndexOf('})();');
	assert.notEqual(closure, -1, 'frontend IIFE closing marker must exist');

	const instrumentedSource = [
		source.slice(0, closure),
		'globalThis.__lagerTest = { T, api, apiUpload, DE_I18N };',
		source.slice(closure),
	].join('\n');
	const context = {
		document: {
			readyState: 'loading',
			addEventListener() {},
		},
		fetch: fetchImpl,
		URLSearchParams,
		window,
	};

	vm.runInNewContext(instrumentedSource, context, {
		filename: path.join(root, 'js/lager.js'),
	});

	return context.__lagerTest;
}

function jsonResponse({ ok = true, status = 200, data = {} } = {}) {
	return {
		ok,
		status,
		json: async () => data,
	};
}

async function createApp(fetchHandler, { isAdmin = false } = {}) {
	const dom = new JSDOM(appMarkup, {
		runScripts: 'outside-only',
		url: 'https://cloud.example.test/apps/lager/',
	});
	const { window } = dom;
	window.document.getElementById('app-content').dataset.isAdmin = isAdmin ? '1' : '0';
	window.OC = { requestToken: 'request-token' };
	vm.runInNewContext(source, {
		document: window.document,
		fetch: fetchHandler,
		URLSearchParams: window.URLSearchParams,
		window,
		navigator: window.navigator,
		console,
		setTimeout: window.setTimeout.bind(window),
		clearTimeout: window.clearTimeout.bind(window),
	}, { filename: path.join(root, 'js/lager.js') });
	window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
	await settleUntil(() => fetchHandler.calls.length > 0);
	await new Promise(resolve => setImmediate(resolve));
	return { dom, window, document: window.document };
}

async function settleUntil(predicate, attempts = 30) {
	for (let attempt = 0; attempt < attempts; attempt++) {
		if (predicate()) { return; }
		await new Promise(resolve => setImmediate(resolve));
	}
}

function trackedFetch(handler) {
	const fetch = (...args) => {
		fetch.calls.push(args);
		return handler(...args);
	};
	fetch.calls = [];
	return fetch;
}

function response(data, { ok = true, status = 200 } = {}) {
	return {
		ok,
		status,
		json: async () => data,
	};
}

function submitForm(window, values) {
	const form = window.document.querySelector('.modal-overlay form');
	assert.ok(form, 'an open modal form should exist');
	const inputs = [...form.querySelectorAll('input:not([type="file"])')];
	for (const [index, value] of values.entries()) {
		inputs[index].value = value;
	}
	form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
	return form.closest('.modal-overlay');
}

function nestedTree() {
	return [{
		id: 1,
		name: 'Kitchen',
		total_qty: 2,
		cabinets: [{
			id: 2,
			name: 'Pantry',
			total_qty: 2,
			slots: [{
				id: 3,
				name: 'Shelf A',
				total_qty: 2,
				description: null,
			}],
		}],
	}];
}

test('translation helper uses the Nextcloud translation when available', () => {
	const frontend = loadFrontend({
		window: {
			t: (app, text) => `${app}:${text}`,
		},
	});

	assert.equal(frontend.T('Warehouse'), 'lager:Warehouse');
});

test('translation helper falls back to German and interpolates variables', () => {
	const frontend = loadFrontend({
		window: {
			OC: {
				getLocale: () => 'de_DE',
			},
		},
	});

	assert.equal(frontend.T('Warehouse'), 'Lagerverwaltung');
	assert.equal(frontend.T('Error (HTTP {status})', { status: 503 }), 'Fehler (HTTP 503)');
});

test('embedded German fallback matches the German JSON catalog', () => {
	const catalog = JSON.parse(
		fs.readFileSync(path.join(root, 'l10n/de.json'), 'utf8'),
	).translations;
	const embedded = loadFrontend().DE_I18N;

	assert.deepEqual(JSON.parse(JSON.stringify(embedded)), catalog);
});

test('GET API request includes app path and request token without a body', async () => {
	const requests = [];
	const frontend = loadFrontend({
		fetchImpl: async (...args) => {
			requests.push(args);
			return jsonResponse({ data: [{ id: 1 }] });
		},
	});

	const result = await frontend.api('GET', '/tree');

	assert.deepEqual(result, [{ id: 1 }]);
	assert.equal(requests[0][0], '/index.php/apps/lager/api/tree');
	assert.equal(requests[0][1].method, 'GET');
	assert.equal(requests[0][1].headers.RequestToken, '');
	assert.equal(requests[0][1].body, undefined);
});

test('API form request encodes values and omits null fields', async () => {
	const requests = [];
	const frontend = loadFrontend({
		fetchImpl: async (...args) => {
			requests.push(args);
			return jsonResponse({ data: { ok: true } });
		},
	});

	await frontend.api('POST', '/stock', {
		article: 'Tea & coffee',
		quantity: 2,
		ean: null,
	});

	assert.equal(
		requests[0][1].headers['Content-Type'],
		'application/x-www-form-urlencoded',
	);
	assert.equal(requests[0][1].body, 'article=Tea+%26+coffee&quantity=2');
});

test('API request rejects with the server error message', async () => {
	const frontend = loadFrontend({
		fetchImpl: async () => jsonResponse({
			ok: false,
			status: 400,
			data: { error: 'Invalid article' },
		}),
	});

	await assert.rejects(frontend.api('POST', '/stock', {}), {
		message: 'Invalid article',
	});
});

test('API request uses translated HTTP status when an error body is invalid', async () => {
	const frontend = loadFrontend({
		window: {
			OC: {
				getLocale: () => 'de_DE',
			},
		},
		fetchImpl: async () => ({
			ok: false,
			status: 503,
			json: async () => {
				throw new Error('Invalid JSON');
			},
		}),
	});

	await assert.rejects(frontend.api('GET', '/tree'), {
		message: 'Fehler (HTTP 503)',
	});
});

test('multipart upload leaves Content-Type to the browser', async () => {
	const requests = [];
	const frontend = loadFrontend({
		fetchImpl: async (...args) => {
			requests.push(args);
			return jsonResponse({ data: { ok: true } });
		},
	});
	const formData = new FormData();

	await frontend.apiUpload('/stock/4/image', formData);

	assert.equal(requests[0][0], '/index.php/apps/lager/api/stock/4/image');
	assert.equal(requests[0][1].method, 'POST');
	assert.equal(requests[0][1].headers.RequestToken, '');
	assert.equal(requests[0][1].headers['Content-Type'], undefined);
	assert.equal(requests[0][1].body, formData);
});

test('adding a root location submits the registered app API route and renders it', async () => {
	const state = { tree: [], calls: [] };
	const fetch = trackedFetch((url, options) => {
		state.calls.push({ url, options });
		if (url.endsWith('/tree')) { return Promise.resolve(response(state.tree)); }
		if (url.endsWith('/location') && options.method === 'POST') {
			const body = new URLSearchParams(options.body);
			state.tree.push({
				id: 1,
				name: body.get('name'),
				description: body.get('description'),
				total_qty: 0,
				cabinets: [],
			});
			return Promise.resolve(response(state.tree[0]));
		}
		return Promise.resolve(response({}));
	});
	const app = await createApp(fetch);

	try {
		app.document.getElementById('lager-add-location-btn').click();
		submitForm(app.window, ['Kitchen', '']);
		await settleUntil(() => app.document.querySelector('.tree-label')?.textContent === 'Kitchen');

		assert.ok(state.calls.some(({ url, options }) =>
			url === '/index.php/apps/lager/api/location' &&
			options.method === 'POST' &&
			options.headers.RequestToken === 'request-token',
		));
		assert.equal(app.document.getElementById('lager-tree-empty').classList.contains('hidden'), true);
		assert.equal(app.document.querySelector('.tree-label').textContent, 'Kitchen');
	} finally {
		app.dom.window.close();
	}
});

test('a slot can be selected and a plain-text article added without scanning or uploading a photo', async () => {
	const state = { tree: nestedTree(), items: [], calls: [] };
	const fetch = trackedFetch((url, options) => {
		state.calls.push({ url, options });
		if (url.endsWith('/tree')) { return Promise.resolve(response(state.tree)); }
		if (url.endsWith('/stock/slot/3')) {
			return Promise.resolve(response({ slot: state.tree[0].cabinets[0].slots[0], items: state.items }));
		}
		if (url.endsWith('/stock') && options.method === 'POST') {
			const body = new URLSearchParams(options.body);
			const item = {
				id: 8,
				slot_id: Number(body.get('slot_id')),
				article: body.get('article'),
				description: body.get('description'),
				quantity: Number(body.get('quantity')),
				ean: body.get('ean'),
				has_image: false,
			};
			state.items.push(item);
			return Promise.resolve(response(item));
		}
		return Promise.resolve(response({}));
	});
	const app = await createApp(fetch);

	try {
		app.document.querySelector('[data-slot-id="3"]').click();
		await settleUntil(() => app.document.querySelector('.stock-empty'));
		app.document.querySelector('#lager-detail .btn.primary').click();
		app.document.querySelector('.lager-file-row .btn').click();
		const cameraModal = [...app.document.querySelectorAll('.modal-overlay')]
			.find(overlay => overlay.querySelector('.lager-capture-video'));
		assert.match(cameraModal.querySelector('.scan-status').textContent, /Camera not supported/);
		cameraModal.querySelector('.modal-buttons .btn:not(.primary)').click();
		assert.equal(app.document.querySelector('.lager-capture-video'), null);
		submitForm(app.window, ['Oats', 'Rolled oats', '', '2']);
		await settleUntil(() => app.document.querySelector('.stock-table tbody tr'));

		const createCall = state.calls.find(({ url, options }) =>
			url.endsWith('/stock') && options.method === 'POST',
		);
		assert.ok(createCall);
		assert.match(createCall.options.body, /article=Oats/);
		assert.match(createCall.options.body, /quantity=2/);
		assert.ok(!state.calls.some(({ url }) => url.endsWith('/image')));
		assert.equal(app.document.querySelector('.stock-table tbody tr').textContent.includes('Oats'), true);
	} finally {
		app.dom.window.close();
	}
});

test('article delete controls are only rendered for administrators', async () => {
	const item = {
		id: 8,
		slot_id: 3,
		article: 'Oats',
		quantity: 2,
		ean: null,
		has_image: false,
	};
	const fetch = trackedFetch(url => {
		if (url.endsWith('/tree')) { return Promise.resolve(response(nestedTree())); }
		if (url.endsWith('/stock/slot/3')) {
			return Promise.resolve(response({ slot: {}, items: [item] }));
		}
		return Promise.resolve(response({}));
	});
	const regular = await createApp(fetch);

	try {
		regular.document.querySelector('[data-slot-id="3"]').click();
		await settleUntil(() => regular.document.querySelector('.stock-table tbody tr'));
		assert.equal(
			[...regular.document.querySelectorAll('.stock-table .row-btn')].some(button => button.title === 'Delete'),
			false,
		);
	} finally {
		regular.dom.window.close();
	}

	const adminFetch = trackedFetch(url => {
		if (url.endsWith('/tree')) { return Promise.resolve(response(nestedTree())); }
		if (url.endsWith('/stock/slot/3')) {
			return Promise.resolve(response({ slot: {}, items: [item] }));
		}
		return Promise.resolve(response({}));
	});
	const admin = await createApp(adminFetch, { isAdmin: true });

	try {
		admin.document.querySelector('[data-slot-id="3"]').click();
		await settleUntil(() => admin.document.querySelector('.stock-table tbody tr'));
		assert.equal(
			[...admin.document.querySelectorAll('.stock-table .row-btn')].some(button => button.title === 'Delete'),
			true,
		);
	} finally {
		admin.dom.window.close();
	}
});

test('search waits for a query and displays matching article and location', async () => {
	const fetch = trackedFetch(url => {
		if (url.endsWith('/tree')) { return Promise.resolve(response(nestedTree())); }
		if (url.endsWith('/stock/slot/3')) {
			return Promise.resolve(response({ slot: {}, items: [] }));
		}
		if (url.includes('/search?q=tea')) {
			return Promise.resolve(response([{
				article: 'Green tea',
				slot_path: 'Kitchen / Pantry / Shelf A',
				quantity: 4,
				ean: '1234567890123',
				slot_id: 3,
			}]));
		}
		return Promise.resolve(response([]));
	});
	const app = await createApp(fetch);

	try {
		const input = app.document.getElementById('lager-search');
		input.value = 'tea';
		input.dispatchEvent(new app.window.Event('input', { bubbles: true }));
		await new Promise(resolve => app.window.setTimeout(resolve, 300));
		await settleUntil(() => app.document.querySelector('.search-result .article'));

		assert.equal(app.document.querySelector('.search-result .article').textContent, 'Green tea');
		assert.match(app.document.querySelector('.search-result .path').textContent, /Kitchen \/ Pantry \/ Shelf A/);
		app.document.querySelector('.search-result').click();
		await settleUntil(() => app.document.querySelector('.stock-empty'));
		assert.equal(app.document.querySelector('[data-slot-id="3"]').classList.contains('selected'), true);
		assert.equal(app.document.getElementById('lager-search-results').classList.contains('hidden'), true);
	} finally {
		app.dom.window.close();
	}
});

test('manual code lookup shows a matching article and encodes the scanned value', async () => {
	const fetch = trackedFetch(url => {
		if (url.endsWith('/tree')) { return Promise.resolve(response(nestedTree())); }
		if (url.endsWith('/stock/slot/3')) { return Promise.resolve(response({ slot: {}, items: [] })); }
		if (url.endsWith('/scan/123%20%26%20456')) {
			return Promise.resolve(response({
				article: '<b>Green tea</b>',
				slot_path: 'Kitchen / Pantry / Shelf A',
				quantity: 4,
				ean: '123 & 456',
				slot_id: 3,
			}));
		}
		return Promise.resolve(response({}));
	});
	const app = await createApp(fetch);

	try {
		app.document.getElementById('lager-scan-btn').click();
		assert.match(app.document.getElementById('lager-scan-status').textContent, /Scanner library not loaded/);
		const input = app.document.getElementById('lager-scan-manual');
		input.value = ' 123 & 456 ';
		app.document.getElementById('lager-scan-manual-btn').click();
		await settleUntil(() => app.document.querySelector('.scan-found'));

		assert.ok(fetch.calls.some(([url]) => url.endsWith('/scan/123%20%26%20456')));
		assert.equal(app.document.querySelector('.scan-found-name').textContent, '<b>Green tea</b>');
		assert.equal(app.document.querySelector('.scan-found-qty span').textContent, '4');
		app.document.querySelector('.scan-result-actions .btn.primary').click();
		await settleUntil(() => app.document.querySelector('.stock-empty'));
		assert.equal(app.document.querySelector('[data-slot-id="3"]').classList.contains('selected'), true);
	} finally {
		app.dom.window.close();
	}
});

test('movement history displays incoming and outgoing entries', async () => {
	const fetch = trackedFetch(url => {
		if (url.endsWith('/tree')) { return Promise.resolve(response([])); }
		if (url.includes('/movement/history?limit=50')) {
			return Promise.resolve(response([
				{
					id: 1,
					type: 'in',
					article: 'Green tea',
					quantity: 4,
					slot_path: 'Kitchen / Pantry / Shelf A',
					user: 'Alex',
					location_name: 'Kitchen',
					cabinet_name: 'Pantry',
					slot_name: 'Shelf A',
					created_at: 1700000000,
					has_image: true,
					updated_at: 1700000000,
				},
				{
					id: 2,
					type: 'out',
					article: 'Oats',
					quantity: 1,
					slot_path: 'Kitchen / Pantry / Shelf A',
					user: 'Sam',
					location_name: 'Kitchen',
					cabinet_name: 'Pantry',
					slot_name: 'Shelf A',
					created_at: 1700000100,
					has_image: false,
				},
			]));
		}
		return Promise.resolve(response({}));
	});
	const app = await createApp(fetch);

	try {
		app.document.getElementById('lager-history-btn').click();
		await settleUntil(() => app.document.querySelectorAll('.history-table tbody tr').length === 2);

		assert.match(app.document.querySelector('.history-table tbody tr:first-child').textContent, /Green tea/);
		assert.match(app.document.querySelector('.history-table tbody tr:first-child').textContent, /Alex/);
		assert.equal(app.document.querySelectorAll('.history-table .type-in').length, 1);
		assert.equal(app.document.querySelectorAll('.history-table .type-out').length, 1);
		app.document.querySelector('.history-table img').click();
		assert.equal(app.document.querySelectorAll('.modal-overlay img').length, 2);
	} finally {
		app.dom.window.close();
	}
});
