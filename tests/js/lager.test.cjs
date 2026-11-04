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
			<button id="lager-tags-btn"></button>
			<button id="lager-shopping-list-btn"></button>
			<button id="lager-scan-btn"></button>
			<button id="lager-scan-close"></button>
			<button id="lager-qr-close"></button>
			<button id="lager-scan-manual-btn"></button>
			<input id="lager-scan-manual">
			<input id="lager-scan-file" type="file">
			<button id="lager-scan-file-btn"></button>
			<div id="lager-scan-status"></div>
			<div class="lager-layout">
				<section class="tree-pane">
					<div class="pane-toolbar">
						<button id="lager-toggle-locations-pane-btn" class="btn sidebar-toggle" type="button" aria-expanded="true">
							<img src="/core/img/actions/toggle-filelist.svg" alt="">
						</button>
					</div>
					<ul id="lager-tree"></ul>
					<div id="lager-tree-empty" class="hidden"></div>
				</section>
				<section class="detail-pane">
					<div class="detail-toolbar">
						<button id="lager-toggle-locations-btn" aria-expanded="false">
							<img src="/core/img/actions/toggle-filelist.svg" alt="">
						</button>
						<button id="lager-add-article-btn" class="btn primary" type="button" disabled>+ Add article</button>
						<span id="lager-add-article-hint" role="status">Select a location.</span>
					</div>
					<div id="lager-detail" class="detail-empty"></div>
				</section>
			</div>
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

async function createApp(fetchHandler, { mobile = false } = {}) {
	const dom = new JSDOM(appMarkup, {
		runScripts: 'outside-only',
		url: 'https://cloud.example.test/apps/kuechenlager/',
	});
	const { window } = dom;
	window.OC = { requestToken: 'request-token' };
	window.matchMedia = query => ({
		matches: mobile && query === '(max-width: 760px)',
		media: query,
		addEventListener() {},
		removeEventListener() {},
	});
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
	await settleUntil(() => fetchHandler.calls.length > 0);
	await new Promise(resolve => setImmediate(resolve));
	return { dom, window, document: window.document };
}

test('location sidebar stays open when selecting an item on narrow screens', async () => {
	const fetch = trackedFetch((url) => {
		if (url.endsWith('/tree')) {
			return Promise.resolve(response([{
				id: 1, name: 'Kitchen', total_qty: 1,
				cabinets: [{ id: 2, name: 'Pantry', total_qty: 1, slots: [{ id: 3, name: 'Shelf', total_qty: 1 }] }],
			}]));
		}
		if (url.endsWith('/stock/cabinet/2')) { return Promise.resolve(response({ cabinet: { id: 2 }, items: [] })); }
		return Promise.resolve(response([]));
	});
	const app = await createApp(fetch, { mobile: true });

	try {
		const layout = app.document.querySelector('.lager-layout');
		const button = app.document.getElementById('lager-toggle-locations-btn');
		const closeButton = app.document.getElementById('lager-toggle-locations-pane-btn');
		const locationChildren = app.document.querySelector('#lager-tree > li > ul');
		const cabinetChildren = app.document.querySelector('#lager-tree > li > ul > li > ul');
		assert.ok(layout);
		assert.equal(button.getAttribute('aria-expanded'), 'false');
		assert.ok(locationChildren.classList.contains('open'));
		assert.ok(cabinetChildren.classList.contains('open'));
		assert.equal(app.document.querySelector('.tree-row .caret'), null);
		button.click();
		assert.equal(button.getAttribute('aria-expanded'), 'true');
		assert.equal(closeButton.getAttribute('aria-expanded'), 'true');
		assert.ok(layout.classList.contains('mobile-sidebar-open'));
		app.document.querySelector('[data-cabinet-id="2"]').click();
		await settleUntil(() => app.document.querySelector('.detail-title')?.textContent === 'Pantry');
		assert.ok(layout.classList.contains('mobile-sidebar-open'));
		assert.equal(button.getAttribute('aria-expanded'), 'true');
		assert.ok(locationChildren.classList.contains('open'));
		assert.ok(cabinetChildren.classList.contains('open'));
		closeButton.click();
		assert.ok(!layout.classList.contains('mobile-sidebar-open'));
		assert.equal(button.getAttribute('aria-expanded'), 'false');
		assert.equal(closeButton.getAttribute('aria-expanded'), 'false');
	} finally {
		app.dom.window.close();
	}
});

test('location sidebar can be collapsed and reopened on desktop', async () => {
	const fetch = trackedFetch(() => Promise.resolve(response([])));
	const app = await createApp(fetch);

	try {
		const layout = app.document.querySelector('.lager-layout');
		const button = app.document.getElementById('lager-toggle-locations-btn');
		const closeButton = app.document.getElementById('lager-toggle-locations-pane-btn');
		button.click();
		assert.ok(layout.classList.contains('sidebar-collapsed'));
		assert.equal(button.getAttribute('aria-expanded'), 'false');
		assert.equal(closeButton.getAttribute('aria-expanded'), 'false');
		button.click();
		assert.ok(!layout.classList.contains('sidebar-collapsed'));
		assert.equal(button.getAttribute('aria-expanded'), 'true');
		assert.equal(closeButton.getAttribute('aria-expanded'), 'true');
		assert.ok(button.querySelector('img').getAttribute('src').endsWith('/core/img/actions/toggle-filelist.svg'));
	} finally {
		app.dom.window.close();
	}
});

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

test('users can create, rename, and delete shared tags from the tag manager', async () => {
	const state = { tags: [], calls: [] };
	const fetch = trackedFetch((url, options) => {
		state.calls.push({ url, options });
		if (url.endsWith('/tags')) { return Promise.resolve(response(state.tags)); }
		if (url.endsWith('/tag') && options.method === 'POST') {
			const body = new URLSearchParams(options.body);
			state.tags.push({ id: 1, name: body.get('name') });
			return Promise.resolve(response(state.tags[0]));
		}
		if (url.endsWith('/tag/1') && options.method === 'PUT') {
			state.tags[0].name = new URLSearchParams(options.body).get('name');
			return Promise.resolve(response(state.tags[0]));
		}
		if (url.endsWith('/tag/1') && options.method === 'DELETE') {
			state.tags = [];
			return Promise.resolve(response({ ok: true }));
		}
		return Promise.resolve(response([]));
	});

	const app = await createApp(fetch);

	try {
		app.document.getElementById('lager-tags-btn').click();
		await settleUntil(() => app.document.querySelector('.tag-manager-list'));
		assert.match(app.document.querySelector('.tag-manager-list').textContent, /No tags created yet/);

		const manager = app.document.querySelector('.modal-overlay:not(.hidden)');
		manager.querySelector('form input').value = 'Vegan';
		manager.querySelector('form button').click();
		await settleUntil(() => manager.querySelector('.tag-manager-row input')?.value === 'Vegan');
		assert.ok(state.calls.some(({ url, options }) => url.endsWith('/tag') && options.method === 'POST'));

		const name = manager.querySelector('.tag-manager-row input');
		name.value = 'Plant-based';
		manager.querySelector('.tag-manager-row button').click();
		await settleUntil(() => manager.querySelector('.tag-manager-row input')?.value === 'Plant-based');
		assert.ok(state.calls.some(({ url, options }) => url.endsWith('/tag/1') && options.method === 'PUT'));

		manager.querySelectorAll('.tag-manager-row button')[1].click();
		await settleUntil(() => manager.querySelector('.tag-manager-list p'));
		assert.ok(state.calls.some(({ url, options }) => url.endsWith('/tag/1') && options.method === 'DELETE'));
	} finally {
		app.dom.window.close();
	}
});

test('shopping list shows items below minimum with the quantity needed and storage location', async () => {
	const fetch = trackedFetch((url) => {
		if (url.endsWith('/stock/shopping-list')) {
			return Promise.resolve(response([{
				id: 8,
				article: 'Oats',
				quantity: 1,
				minimum_quantity: 4,
				needed_quantity: 3,
				slot_path: 'Kitchen / Pantry',
			}]));
		}
		return Promise.resolve(response([]));
	});
	const app = await createApp(fetch);

	try {
		app.document.getElementById('lager-shopping-list-btn').click();
		await settleUntil(() => app.document.querySelector('.shopping-list-table'));
		const modal = app.document.querySelector('.modal-overlay:not(.hidden)');
		assert.match(modal.textContent, /Shopping list/);
		assert.match(modal.textContent, /Oats/);
		assert.match(modal.textContent, /Kitchen \/ Pantry/);
		const cells = [...modal.querySelectorAll('tbody tr:first-child td')].map(cell => cell.textContent);
		assert.deepEqual(cells, ['Oats', '1', '4', '3', 'Kitchen / Pantry']);
		assert.ok(fetch.calls.some(([url]) => url.endsWith('/stock/shopping-list')));
	} finally {
		app.dom.window.close();
	}
});

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

	assert.equal(frontend.T('Warehouse'), 'kuechenlager:Warehouse');
});

test('translation helper falls back to German and interpolates variables', () => {
	const frontend = loadFrontend({
		window: {
			OC: {
				getLocale: () => 'de_DE',
			},
		},
	});

	assert.equal(frontend.T('Kitchen inventory'), 'Küchenlager');
	assert.equal(frontend.T('Error (HTTP {status})', { status: 503 }), 'Fehler (HTTP 503)');
});

test('embedded German fallback matches the German JSON catalog', () => {
	const catalog = JSON.parse(
		fs.readFileSync(path.join(root, 'l10n/de.json'), 'utf8'),
	).translations;
	const embedded = loadFrontend().DE_I18N;

	assert.deepEqual(JSON.parse(JSON.stringify(embedded)), catalog);
});

test('German Nextcloud JavaScript catalog matches the German JSON catalog', () => {
	const catalog = JSON.parse(
		fs.readFileSync(path.join(root, 'l10n/de.json'), 'utf8'),
	).translations;
	let registered;
	vm.runInNewContext(
		fs.readFileSync(path.join(root, 'l10n/de.js'), 'utf8'),
		{ OC: { L10N: { register: (_app, translations) => { registered = translations; } } } },
	);

	assert.deepEqual(JSON.parse(JSON.stringify(registered)), catalog);
});

test('locale JavaScript catalogs do not repeat translation keys', () => {
	for (const file of ['l10n/de.js', 'l10n/en.js']) {
		const source = fs.readFileSync(path.join(root, file), 'utf8');
		const keys = [...source.matchAll(/^\s*"([^"]+)"\s*:/gm)].map(match => match[1]);
		assert.equal(new Set(keys).size, keys.length, file);
	}
});

test('literal frontend translation keys exist in the German catalog', () => {
	const catalog = JSON.parse(
		fs.readFileSync(path.join(root, 'l10n/de.json'), 'utf8'),
	).translations;
	const sources = [
		fs.readFileSync(path.join(root, 'js/lager.js'), 'utf8'),
		fs.readFileSync(path.join(root, 'templates/main.php'), 'utf8'),
		fs.readFileSync(path.join(root, 'templates/settings/admin.php'), 'utf8'),
	];
	const decode = value => JSON.parse(`"${value.replace(/"/g, '\\"').replace(/\\'/g, "'")}"`);
	const keys = sources.flatMap(source => [
		...source.matchAll(/\bT\(\s*'([^']+)'/g),
		...source.matchAll(/\$l->t\(\s*'([^']+)'/g),
	].map(match => decode(match[1])));
	const missing = [...new Set(keys)].filter(key => !Object.hasOwn(catalog, key));

	assert.deepEqual(missing, []);
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
	assert.equal(requests[0][0], '/index.php/apps/kuechenlager/api/tree');
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

	assert.equal(requests[0][0], '/index.php/apps/kuechenlager/api/stock/4/image');
	assert.equal(requests[0][1].method, 'POST');
	assert.equal(requests[0][1].headers.RequestToken, '');
	assert.equal(requests[0][1].headers['Content-Type'], undefined);
	assert.equal(requests[0][1].body, formData);
});

test('admin settings save the low-stock webhook with the Nextcloud request token', async () => {
	const requests = [];
	const dom = new JSDOM(`<!doctype html><form id="kuechenlager-webhook-settings" data-save-url="/settings/webhook">
		<input name="webhook_url" value="https://shopping.example.test/hooks">
		<button type="submit"></button>
		<span id="kuechenlager-webhook-status" data-saved="Saved." data-error="Could not save webhook settings."></span>
	</form>`);
	dom.window.OC = { requestToken: 'admin-token' };
	dom.window.fetch = async (...args) => {
		requests.push(args);
		return { ok: true, json: async () => ({ ok: true }) };
	};
	vm.runInNewContext(fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8'), {
		document: dom.window.document,
		fetch: dom.window.fetch,
		FormData: dom.window.FormData,
		URLSearchParams: dom.window.URLSearchParams,
		OC: dom.window.OC,
	});

	try {
		dom.window.document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
		await new Promise(resolve => setImmediate(resolve));
		await new Promise(resolve => setImmediate(resolve));

		assert.equal(requests[0][0], '/settings/webhook');
		assert.equal(requests[0][1].headers.RequestToken, 'admin-token');
		assert.equal(new URLSearchParams(requests[0][1].body).get('webhook_url'), 'https://shopping.example.test/hooks');
		assert.equal(dom.window.document.getElementById('kuechenlager-webhook-status').textContent, 'Saved.');
	} finally {
		dom.window.close();
	}
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
			url === '/index.php/apps/kuechenlager/api/location' &&
			options.method === 'POST' &&
			options.headers.RequestToken === 'request-token',
		));
		assert.equal(app.document.getElementById('lager-tree-empty').classList.contains('hidden'), true);
		assert.equal(app.document.querySelector('.tree-label').textContent, 'Kitchen');
	} finally {
		app.dom.window.close();
	}
});

test('location photos are shown in the tree and in the location edit form', async () => {
	const location = {
		id: 17,
		name: 'Pantry',
		description: 'Dry food',
		has_image: true,
		total_qty: 0,
		cabinets: [],
	};
	const fetch = trackedFetch((url) => {
		if (url.endsWith('/tree')) { return Promise.resolve(response([location])); }
		return Promise.resolve(response({}));
	});
	const app = await createApp(fetch);

	try {
		const thumbnail = app.document.querySelector('.location-thumb');
		assert.ok(thumbnail);
		assert.match(thumbnail.src, /\/location\/17\/image\?v=/);
		thumbnail.click();
		assert.equal(app.document.querySelector('.modal img.location-photo-large').src, thumbnail.src);
		app.document.querySelector('.modal-overlay').remove();

		app.document.querySelector('button[title="Rename"]').click();
		assert.equal(app.document.querySelectorAll('.modal-overlay input[type="file"]').length, 2);
		assert.ok(app.document.querySelector('.lager-file-preview').src.includes('/location/17/image'));
	} finally {
		app.dom.window.close();
	}
});

test('a title-only article can be added with no barcode, scanner, or photo', async () => {
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
				manufacturer: body.get('manufacturer'),
				notes: body.get('notes'),
				quantity: Number(body.get('quantity')),
				ean: body.get('ean'),
				tags: body.get('tags').split(',').map(name => name.trim()).filter(Boolean).map(name => ({ name })),
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
		const addButton = app.document.getElementById('lager-add-article-btn');
		assert.equal(addButton.disabled, false);
		addButton.click();
		const eanInput = app.document.querySelector('.modal-overlay input[placeholder*="4001234567890"]');
		assert.ok(eanInput);
		assert.equal(eanInput.required, false);
		assert.equal(eanInput.closest('.field').querySelector('label').textContent, 'EAN / Code');
		submitForm(app.window, ['Oats']);
		await settleUntil(() => app.document.querySelector('.stock-table tbody tr'));

		const createCall = state.calls.find(({ url, options }) =>
			url.endsWith('/stock') && options.method === 'POST',
		);
		assert.ok(createCall);
		assert.match(createCall.options.body, /article=Oats/);
		assert.equal(new URLSearchParams(createCall.options.body).has('ean'), false);
		assert.equal(state.items[0].ean, null);
		assert.ok(!state.calls.some(({ url }) => url.endsWith('/image')));
		assert.match(app.document.querySelector('.stock-table tbody tr').textContent, /Oats/);
	} finally {
		app.dom.window.close();
	}
});

test('add-article button stays visible and explains the next selection step', async () => {
	const app = await createApp(trackedFetch(url =>
		url.endsWith('/tree') ? Promise.resolve(response([])) : Promise.resolve(response({})),
	));

	try {
		const addButton = app.document.getElementById('lager-add-article-btn');
		const hint = app.document.getElementById('lager-add-article-hint');
		assert.ok(addButton);
		assert.equal(addButton.disabled, true);
		assert.equal(hint.textContent, 'Create a location first.');
	} finally {
		app.dom.window.close();
	}
});

test('location overview stays read-only and cabinet selection allows cabinet or slot storage', async () => {
	const locations = nestedTree();
	const fetch = trackedFetch((url, options) => {
		if (url.endsWith('/tree')) { return Promise.resolve(response(locations)); }
		return Promise.resolve(response({}));
	});
	const app = await createApp(fetch);

	try {
		const addButton = app.document.getElementById('lager-add-article-btn');
		const hint = app.document.getElementById('lager-add-article-hint');
		app.document.querySelector('#lager-tree > li > .tree-row').click();
		assert.equal(addButton.disabled, true);
		assert.equal(hint.textContent, 'Select a cabinet.');
		app.document.querySelector('#lager-tree > li > ul > li > .tree-row').click();
		assert.equal(addButton.disabled, false);
		assert.equal(hint.textContent, '');
		app.document.querySelector('[data-slot-id="3"]').click();
		assert.equal(addButton.disabled, false);
		assert.equal(hint.textContent, '');
		assert.equal(app.document.querySelectorAll('#lager-add-article-btn').length, 1);
		assert.equal(
			[...app.document.querySelectorAll('button')].filter(button => button.textContent.trim() === '+ Add article').length,
			1,
		);
		assert.equal(app.document.querySelector('#lager-detail .btn.primary'), null);
	} finally {
		app.dom.window.close();
	}
});

test('a cabinet without slots still allows articles to be stored directly', async () => {
	const locations = nestedTree();
	locations[0].cabinets[0].slots = [];
	const app = await createApp(trackedFetch(url =>
		url.endsWith('/tree') ? Promise.resolve(response(locations)) : Promise.resolve(response({})),
	));

	try {
		const hint = app.document.getElementById('lager-add-article-hint');
		app.document.querySelector('#lager-tree > li > .tree-row').click();
		app.document.querySelector('#lager-tree > li > ul > li > .tree-row').click();
		assert.equal(hint.textContent, '');
		assert.equal(app.document.getElementById('lager-add-article-btn').disabled, false);
	} finally {
		app.dom.window.close();
	}
});

test('selecting a location shows all articles in its cabinets and slots', async () => {
	const items = [
		{ id: 8, article: 'Oats', quantity: 2, cabinet_id: 2, slot_id: 3, container_path: 'Pantry / Shelf A', tags: [] },
		{ id: 9, article: 'Tea', quantity: 1, cabinet_id: 4, slot_id: null, container_path: 'Cupboard', tags: [] },
	];
	const calls = [];
	const app = await createApp(trackedFetch((url, options) => {
		calls.push({ url, options });
		if (url.endsWith('/tree')) { return Promise.resolve(response(nestedTree())); }
		if (url.endsWith('/stock/location/1')) { return Promise.resolve(response({ location: { id: 1, name: 'Kitchen' }, items })); }
		return Promise.resolve(response({}));
	}));

	try {
		app.document.querySelector('#lager-tree > li > .tree-row').click();
		await settleUntil(() => app.document.querySelectorAll('#lager-detail tbody tr').length === 2);

		assert.ok(calls.some(({ url }) => url.endsWith('/stock/location/1')));
		assert.match(app.document.getElementById('lager-detail').textContent, /Kitchen/);
		assert.match(app.document.getElementById('lager-detail').textContent, /Pantry \/ Shelf A/);
		assert.match(app.document.getElementById('lager-detail').textContent, /Cupboard/);
		assert.equal(app.document.getElementById('lager-add-article-btn').disabled, true);
		assert.equal(app.document.getElementById('lager-add-article-hint').textContent, 'Select a cabinet.');
	} finally {
		app.dom.window.close();
	}
});

test('location overview refreshes after a stock movement', async () => {
	let quantity = 1;
	let hasItem = true;
	const calls = [];
	const app = await createApp(trackedFetch((url, options) => {
		calls.push({ url, options });
		if (url.endsWith('/tree')) { return Promise.resolve(response(nestedTree())); }
		if (url.endsWith('/stock/location/1')) {
			return Promise.resolve(response({
				location: { id: 1, name: 'Kitchen' },
				items: hasItem ? [{ id: 8, article: 'Tea', quantity, cabinet_id: 2, slot_id: null, container_path: 'Pantry', tags: [] }] : [],
			}));
		}
		if (url.endsWith('/movement') && options.method === 'POST') {
			quantity = 0;
			return Promise.resolve(response({ ok: true }));
		}
		if (url.endsWith('/stock/8') && options.method === 'DELETE') {
			hasItem = false;
			return Promise.resolve(response({ ok: true }));
		}
		return Promise.resolve(response({}));
	}));

	try {
		app.document.querySelector('#lager-tree > li > .tree-row').click();
		await settleUntil(() => app.document.querySelector('#lager-detail tbody tr'));
		app.document.querySelector('#lager-detail button[title="Book stock out"]').click();
		submitForm(app.window, ['1', '']);
		await settleUntil(() => app.document.querySelector('#lager-detail .qty')?.textContent === '0');

		assert.equal(app.document.querySelector('#lager-detail .qty').textContent, '0');
		assert.equal(calls.filter(({ url }) => url.endsWith('/stock/location/1')).length, 2);

		app.document.querySelector('#lager-detail button[title="Delete"]').click();
		app.document.querySelector('.modal-overlay .btn.primary').click();
		await settleUntil(() => app.document.querySelector('.stock-empty'));

		assert.ok(calls.some(({ url, options }) => url.endsWith('/stock/8') && options.method === 'DELETE'));
		assert.equal(calls.filter(({ url }) => url.endsWith('/stock/location/1')).length, 3);
	} finally {
		app.dom.window.close();
	}
});

test('selecting a cabinet shows its articles and allows cabinet-level entry', async () => {
	const calls = [];
	const app = await createApp(trackedFetch((url, options) => {
		calls.push({ url, options });
		if (url.endsWith('/tree')) { return Promise.resolve(response(nestedTree())); }
		if (url.endsWith('/stock/cabinet/2')) {
			return Promise.resolve(response({
				cabinet: { id: 2, name: 'Pantry' },
				items: [],
			}));
		}
		if (url.endsWith('/stock') && options.method === 'POST') {
			return Promise.resolve(response({ id: 8, article: 'Tea', quantity: 2, cabinet_id: 2, slot_id: null }));
		}
		return Promise.resolve(response({}));
	}));

	try {
		app.document.querySelector('#lager-tree > li > ul > li > .tree-row').click();
		await settleUntil(() => app.document.querySelector('.stock-empty'));

		assert.ok(calls.some(({ url }) => url.endsWith('/stock/cabinet/2')));
		assert.equal(app.document.getElementById('lager-add-article-btn').disabled, false);
		app.document.getElementById('lager-add-article-btn').click();
		assert.match(app.document.querySelector('.modal-overlay h2').textContent, /Pantry/);
		assert.equal(app.document.querySelector('.modal-overlay input[placeholder="e.g. 4001234567890"]').required, false);
		submitForm(app.window, ['Tea', '', '', '', '2']);
		await settleUntil(() => calls.some(({ url, options }) => url.endsWith('/stock') && options.method === 'POST'));

		const createCall = calls.find(({ url, options }) => url.endsWith('/stock') && options.method === 'POST');
		const body = new URLSearchParams(createCall.options.body);
		assert.equal(body.get('cabinet_id'), '2');
		assert.equal(body.has('slot_id'), false);
	} finally {
		app.dom.window.close();
	}
});

test('new articles accept and submit a minimum quantity', async () => {
	const calls = [];
	const app = await createApp(trackedFetch((url, options) => {
		calls.push({ url, options });
		if (url.endsWith('/tree')) { return Promise.resolve(response(nestedTree())); }
		if (url.endsWith('/stock/cabinet/2')) {
			return Promise.resolve(response({ cabinet: { id: 2, name: 'Pantry' }, items: [] }));
		}
		if (url.endsWith('/stock') && options.method === 'POST') {
			return Promise.resolve(response({ id: 8, article: 'Tea', quantity: 1, minimum_quantity: 3 }));
		}
		return Promise.resolve(response({}));
	}));

	try {
		app.document.querySelector('[data-cabinet-id="2"]').click();
		await settleUntil(() => app.document.querySelector('.stock-empty'));
		app.document.getElementById('lager-add-article-btn').click();
		submitForm(app.window, ['Tea', '', '', '', '1', '3']);
		await settleUntil(() => calls.some(({ url, options }) => url.endsWith('/stock') && options.method === 'POST'));

		const createCall = calls.find(({ url, options }) => url.endsWith('/stock') && options.method === 'POST');
		assert.equal(new URLSearchParams(createCall.options.body).get('minimum_quantity'), '3');
	} finally {
		app.dom.window.close();
	}
});

test('deleting the selected location disables article creation again', async () => {
	let locations = nestedTree();
	const fetch = trackedFetch((url, options) => {
		if (url.endsWith('/tree')) { return Promise.resolve(response(locations)); }
		if (url.endsWith('/location/1') && options.method === 'DELETE') {
			locations = [];
			return Promise.resolve(response({ ok: true }));
		}
		return Promise.resolve(response({}));
	});
	const app = await createApp(fetch);

	try {
		app.document.querySelector('[data-slot-id="3"]').click();
		await settleUntil(() => app.document.querySelector('.stock-empty'));
		app.document.querySelector('#lager-tree .row-actions button[title="Delete"]').click();
		app.document.querySelector('.modal-overlay .btn.primary').click();
		await settleUntil(() => app.document.querySelector('#lager-tree-empty').classList.contains('hidden') === false);

		assert.equal(app.document.getElementById('lager-add-article-btn').disabled, true);
		assert.equal(app.document.getElementById('lager-add-article-hint').textContent, 'Create a location first.');
	} finally {
		app.dom.window.close();
	}
});

test('deleting the selected cabinet disables article creation again', async () => {
	let locations = nestedTree();
	const fetch = trackedFetch((url, options) => {
		if (url.endsWith('/tree')) { return Promise.resolve(response(locations)); }
		if (url.endsWith('/cabinet/2') && options.method === 'DELETE') {
			locations = [{ ...locations[0], cabinets: [] }];
			return Promise.resolve(response({ ok: true }));
		}
		return Promise.resolve(response({}));
	});
	const app = await createApp(fetch);

	try {
		app.document.querySelector('[data-cabinet-id="2"]').click();
		await settleUntil(() => app.document.querySelector('.stock-empty'));
		app.document.querySelector('[data-cabinet-id="2"] .row-actions button[title="Delete"]').click();
		app.document.querySelector('.modal-overlay .btn.primary').click();
		await settleUntil(() => app.document.querySelector('[data-cabinet-id="2"]') === null);

		assert.equal(app.document.getElementById('lager-add-article-btn').disabled, true);
		assert.equal(app.document.getElementById('lager-add-article-hint').textContent, 'Select a location.');
	} finally {
		app.dom.window.close();
	}
});

test('all users can delete location branches and articles', async () => {
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
	const app = await createApp(fetch);

	try {
		assert.equal(
			[...app.document.querySelectorAll('#lager-tree .row-btn')].filter(button => button.title === 'Delete').length,
			3,
		);
		app.document.querySelector('[data-slot-id="3"]').click();
		await settleUntil(() => app.document.querySelector('.stock-table tbody tr'));
		assert.equal(
			[...app.document.querySelectorAll('.stock-table .row-btn')].some(button => button.title === 'Delete'),
			true,
		);
	} finally {
		app.dom.window.close();
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
				manufacturer: 'Local farm',
				notes: 'Loose leaf',
				tags: [{ id: 2, name: 'Organic' }],
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
		assert.match(app.document.querySelector('.search-result .metadata').textContent, /Local farm/);
		assert.match(app.document.querySelector('.search-result .metadata').textContent, /Loose leaf/);
		assert.match(app.document.querySelector('.search-result .metadata').textContent, /Organic/);
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
