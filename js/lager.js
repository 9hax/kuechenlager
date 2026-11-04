/**
 * Lager app frontend (vanilla JS, no build step).
 * v1.1 - with EAN, QR/Barcode scan, and code display.
 */
(function () {
	'use strict';

	const API = '/index.php/apps/kuechenlager/api';

	let token = '';
	let searchTimer = null;
	let selectedCabinet = null;
	let selectedSlot = null;

	// html5-qrcode v2.3.8 (lokales Bundle, kein CDN)
	// scanner: Live-Kamera-Scanning (eigene UI mit Kamerawahl)
	// fileDecoder: Foto/Datei-Scanning (eigene Instanz, läuft unabhängig)
	let h5Scanner = null;
	let h5FileDecoder = null;

	// Eingebettete deutsche Uebersetzungen (Fallback, falls die gecachte
	// l10n/de.js-Datei im Browser aelter als dieses JS ist).
	const DE_I18N = {
		"Kitchen inventory": "Küchenlager",
		"Name": "Name",
		"Scan barcode/QR": "Barcode/QR scannen",
		"Scan": "Scannen",
		"Search article or EAN …": "Artikel oder EAN suchen …",
		"History": "Historie",
		"+ Location": "+ Lagerort",
		"Create a location first.": "Lege zuerst einen Lagerort an.",
		"Select a location.": "Wähle einen Lagerort.",
		"Select a cabinet.": "Wähle ein Regal.",
		"Create a cabinet first.": "Lege zuerst ein Regal an.",
		"Select a slot.": "Wähle ein Fach.",
		"Create a slot first.": "Lege zuerst ein Fach an.",
		"Hide locations": "Lagerorte ausblenden",
		"Show locations": "Lagerorte anzeigen",
		"Storage place": "Lagerort",
		"No articles here.": "Hier sind keine Artikel.",
		"No items below minimum stock.": "Keine Artikel unter Mindestbestand.",
		"Select a cabinet or slot.": "Wähle ein Regal oder Fach.",
		"Scan barcode / QR": "Barcode / QR scannen",
		"Starting camera …": "Kamera wird gestartet …",
		"Or load a photo:": "Oder Foto laden:",
		"Choose file …": "Datei auswählen …",
		"Take photo": "Foto aufnehmen",
		"Take a photo with the rear camera": "Foto mit der Rückkamera aufnehmen",
		"Manual:": "Manuell:",
		"EAN / code …": "EAN / Code …",
		"Search": "Suchen",
		"Tip: hold the code about 20–40 cm in front of the camera.": "Tipp: Code ruhig ca. 20–40 cm vor die Kamera halten.",
		"Close": "Schließen",
		"Show code": "Code anzeigen",
		"Based on": "Basiert auf",
		"Donate to the original project here.": "Hier kannst du das ursprüngliche Projekt unterstützen.",
		"Create location": "Lagerort anlegen",
		"Description": "Beschreibung",
		"EAN": "EAN",
		"EAN / Code": "EAN / Code",
		"EAN:": "EAN:",
		"Manufacturer": "Hersteller",
		"Notes": "Notizen",
		"Tags": "Tags",
		"Tag": "Tag",
		"Manage tags": "Tags verwalten",
		"Shopping list": "Einkaufsliste",
		"To buy": "Einzukaufen",
		"Add tag": "Tag hinzufügen",
		"e.g. Vegan": "z. B. Vegan",
		"No tags created yet.": "Noch keine Tags angelegt.",
		"A tag with this name already exists.": "Ein Tag mit diesem Namen existiert bereits.",
		"Tag name is invalid.": "Der Tag-Name ist ungültig.",
		"No more than 20 tags can be assigned to an article.": "Einem Artikel können höchstens 20 Tags zugeordnet werden.",
		"Manufacturer is too long.": "Der Herstellername ist zu lang.",
		"e.g. Cellar": "z. B. Keller",
		"Create cabinet": "Regal anlegen",
		"Create slot": "Fach anlegen",
		"Rename": "Umbenennen",
		"Delete": "Löschen",
		"Really delete location \"{name}\"?": "Lagerort \"{name}\" wirklich löschen?",
		"Really delete cabinet \"{name}\"?": "Regal \"{name}\" wirklich löschen?",
		"Really delete slot \"{name}\"?": "Fach \"{name}\" wirklich löschen?",
		"Cabinet": "Regal",
		"Slot": "Fach",
		"Create {type} in {parent}": "{type} anlegen in {parent}",
		"e.g. Cabinet A": "z. B. Regal A",
		"e.g. Slot 1": "z. B. Fach 1",
		"Rename: {name}": "Umbenennen: {name}",
		"New name": "Neuer Name",
		"+ Add article": "+ Artikel anlegen",
		"Create article in {container}": "Artikel anlegen in {container}",
		"Article": "Artikel",
		"e.g. Screwdriver 6 mm": "z. B. Schraubendreher 6 mm",
		"e.g. 4001234567890": "z. B. 4001234567890",
		"Initial stock": "Anfangsbestand",
		"Minimum stock": "Mindestbestand",
		"Low-stock webhook URL": "Webhook-URL für niedrige Bestände",
		"Send an HTTPS JSON webhook when an item drops below its minimum quantity. Leave blank to disable.": "Sendet einen HTTPS-JSON-Webhook, wenn ein Artikel unter seinen Mindestbestand fällt. Leer lassen, um die Funktion zu deaktivieren.",
		"Could not save webhook settings.": "Webhook-Einstellungen konnten nicht gespeichert werden.",
		"Webhook URL must be a valid HTTPS URL.": "Die Webhook-URL muss eine gültige HTTPS-Adresse sein.",
		"Low stock: %s (%d/%d)": "Niedriger Bestand: %s (%d/%d)",
		"Quantity": "Menge",
		"Show QR/code": "QR/Code anzeigen",
		"Book stock in": "Eingang buchen",
		"Book stock out": "Entnahme buchen",
		"Edit": "Bearbeiten",
		"Delete article?": "Artikel löschen?",
		"Stock in": "Eingang",
		"Stock out": "Entnahme",
		"max": "max.",
		"Note": "Notiz",
		"Edit article": "Artikel bearbeiten",
		"Photo": "Foto",
		"Show photo": "Foto anzeigen",
		"Existing photo": "Bestehendes Foto",
		"No results.": "Keine Treffer.",
		"Stock": "Bestand",
		"Scanner library not loaded – please enter the code manually or load a photo.": "Scanner-Bibliothek nicht geladen – Code bitte manuell eingeben oder Bild-Datei laden.",
		"Camera access required – please allow the camera in the browser prompt.": "Kamerazugriff wird benötigt – bitte in der Browserabfrage die Kamera erlauben.",
		"Scanner could not be initialized: ": "Scanner konnte nicht initialisiert werden: ",
		" – please enter the code manually.": " – Code bitte manuell eingeben.",
		"Camera error: ": "Kamerafehler: ",
		" – please enter the code manually or load a photo.": " – Code bitte manuell eingeben oder Foto laden.",
		"✅ Detected: ": "✅ Erkannt: ",
		"Loading image …": "Bild wird geladen …",
		"Scanning image …": "Bild wird gescannt …",
		"No code found in the image – please use a clear photo of the code.": "Kein Code im Bild gefunden – bitte ein klares Foto des Codes verwenden.",
		"File could not be loaded as an image.": "Datei konnte nicht als Bild geladen werden.",
		"Robust decoding (deskew) …": "Robust-Decodierung (Entzerrung) …",
		"Searching: ": "Suche: ",
		"Location": "Standort",
		"pcs": "Stück",
		"Scan again": "Weiter scannen",
		"Go to article": "Zum Artikel springen",
		"No article found for this code – check the code manually below or create the article.": "Kein Artikel mit diesem Code gefunden – Code unten manuell prüfen oder Artikel anlegen.",
		"Movement history": "Bewegungs-Historie",
		"Loading …": "Lade …",
		"No movements.": "Keine Bewegungen.",
		"Date": "Datum",
		"Type": "Typ",
		"In": "Eingang",
		"Out": "Entnahme",
		"User": "Benutzer",
		"Save": "Speichern",
		"Saved.": "Gespeichert.",
		"Confirm": "Bestätigen",
		"Yes, delete": "Ja, löschen",
		"Deleted.": "Gelöscht.",
		"Error (HTTP {status})": "Fehler (HTTP {status})",
		"A location with this name already exists.": "Ein Lagerort mit diesem Namen existiert bereits.",
		"This article is already in this location.": "Dieser Artikel ist an diesem Lagerort bereits vorhanden.",
		"This article is already in the slot.": "Dieser Artikel liegt im Fach bereits vor.",
		"Stock can only be deleted with a quantity of 0.": "Bestand kann nur mit Menge 0 gelöscht werden.",
		"Movement type must be \"in\" or \"out\".": "Bewegungstyp muss \"in\" oder \"out\" sein.",
		"Quantity must be greater than 0.": "Menge muss größer als 0 sein.",
		"Not enough stock for this withdrawal.": "Nicht genügend Bestand für die Entnahme.",
		"EAN/code is too long (max. 32 characters).": "EAN/Code ist zu lang (max. 32 Zeichen).",
		"%s is invalid.": "%s ist ungültig.",
		"Article is invalid.": "Artikel ist ungültig.",
		"Description is too long.": "Beschreibung ist zu lang.",
		"No article found for this code.": "Kein Artikel mit diesem Code gefunden.",
		"No image uploaded.": "Kein Bild hochgeladen.",
		"Image is too large (max. 10 MB).": "Bild ist zu groß (max. 10 MB).",
		"Image could not be processed.": "Bild konnte nicht verarbeitet werden.",
		"Image is too large (max. 2 MB after compression).": "Bild ist zu groß (max. 2 MB nach Kompression).",
		"Not found.": "Nicht gefunden.",
		"Unexpected error.": "Unerwarteter Fehler.",
		"This EAN/code is already assigned to another article.": "Dieser EAN/Code ist bereits einem anderen Artikel zugeordnet.",
		"Cancel": "Abbrechen",
		"Capture": "Aufnehmen",
		"Camera not supported in this browser. Use file selection instead.": "Kamera wird von diesem Browser nicht unterstützt. Bitte Datei auswählen verwenden.",
	};
	// i18n: Quellstrings sind Englisch. Uebersetzungen (z. B. Deutsch) kommen
	// ueber /apps/kuechenlager/l10n/{lang}.js aus l10n/{lang}.json (window.t).
	function T(text, vars) {
		let out = text;
		try {
			if (typeof window.t === 'function') { out = window.t('kuechenlager', text, vars); }
		} catch (e) { /* ignore */ }
		if (out === text) {
			// Fallback: eingebettetes deutsches Woerterbuch, falls die
			// l10n-Datei fehlt oder im Browser noch aelter gecacht ist.
			let locale = '';
			try { locale = window.OC && window.OC.getLocale ? window.OC.getLocale() : ''; } catch (e2) { /* ignore */ }
			if (/^de/i.test(locale) && Object.prototype.hasOwnProperty.call(DE_I18N, text)) {
				out = DE_I18N[text];
			}
		}
		if (vars && typeof out === 'string') {
			for (const k in vars) { out = out.split('{' + k + '}').join(vars[k]); }
		}
		return out;
	}

	function init() {
		token = (window.OC && window.OC.requestToken) || '';
		if (!token && document.head) {
			// NC >= 28: Request-Token liegt in <head data-requesttoken="...">
			token = document.head.getAttribute('data-requesttoken') || '';
		}
		if (!token) {
			const meta = document.querySelector('meta[name="csrf-token"]');
			if (meta) {
				token = meta.getAttribute('content') || '';
			}
		}
		bind();
		loadTree();
	}

	function bind() {
		document.getElementById('lager-add-article-btn').addEventListener('click', function () {
			if (selectedSlot) { openCreateArticleForm(selectedSlot, 'slot'); }
			else if (selectedCabinet) { openCreateArticleForm(selectedCabinet, 'cabinet'); }
		});
		updateAddArticleState(T('Create a location first.'));

		document.getElementById('lager-add-location-btn').addEventListener('click', function () {
			openFormModal({
				title: T('Create location'),
				fields: [
					{ name: 'name', label: T('Name'), required: true, placeholder: T('e.g. Cellar') },
					{ name: 'description', label: T('Description') },
				],
				file: { label: T('Photo') },
				onSubmit: function (values) {
					return api('POST', '/location', {
						name: values.name,
						description: values.description,
					}).then(function (location) {
						return uploadLocationImage(location.id, values._image);
					}).then(function () {
						return loadTree();
					});
				},
			});
		});

		const searchInput = document.getElementById('lager-search');
		searchInput.addEventListener('input', function () {
			const q = this.value.trim();
			if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; }
			if (q.length < 2) { hideSearchResults(); return; }
			searchTimer = setTimeout(function () { doSearch(q); }, 250);
		});

		document.getElementById('lager-history-btn').addEventListener('click', openHistoryModal);
		document.getElementById('lager-tags-btn').addEventListener('click', openTagManager);
		document.getElementById('lager-shopping-list-btn').addEventListener('click', openShoppingListModal);
		setupLocationSidebar();
		document.getElementById('lager-scan-btn').addEventListener('click', openScanModal);
		document.getElementById('lager-scan-close').addEventListener('click', closeScanModal);
		document.getElementById('lager-qr-close').addEventListener('click', function () {
			document.getElementById('lager-qr-modal').classList.add('hidden');
		});
		document.getElementById('lager-scan-manual-btn').addEventListener('click', function () {
			const code = document.getElementById('lager-scan-manual').value.trim();
			if (code) { lookupCode(code); }
		});
		document.getElementById('lager-scan-manual').addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				const code = this.value.trim();
				if (code) { lookupCode(code); }
			}
		});
		document.getElementById('lager-scan-file').addEventListener('change', function () {
			if (this.files && this.files[0]) { scanImageFile(this.files[0]); this.value = ''; }
		});
		// Safari-Bug: file-Input IN einem Label l&ouml;st die Dateiauswahl doppelt aus und
		// verwirft die Auswahl – daher unsichtbares Input + expliziter Button.
		document.getElementById('lager-scan-file-btn').addEventListener('click', function () {
			document.getElementById('lager-scan-file').click();
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') { closeModals(); hideSearchResults(); }
		});
	}

	function api(method, path, body) {
		const opts = { method: method, headers: { 'RequestToken': token } };
		if (body !== undefined) {
			opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
			const params = new URLSearchParams();
			Object.keys(body).forEach(function(k) {
				if (body[k] !== null && body[k] !== undefined) {
					params.append(k, String(body[k]));
				}
			});
			opts.body = params.toString();
		}
		return fetch(API + path, opts).then(function (res) {
			return res.json().catch(function () { return {}; }).then(function (data) {
				if (!res.ok) {
					throw new Error((data && data.error) || T('Error (HTTP {status})', { status: res.status }));
				}
				return data;
			});
		});
	}

	// Multipart-Upload (Artikelbild); Content-Type bleibt auf Browser-Multipart.
	function apiUpload(path, formData) {
		return fetch(API + path, {
			method: 'POST',
			headers: { 'RequestToken': token },
			body: formData,
		}).then(function (res) {
			return res.json().catch(function () { return {}; }).then(function (data) {
				if (!res.ok) {
					throw new Error((data && data.error) || T('Error (HTTP {status})', { status: res.status }));
				}
				return data;
			});
		});
	}

	// Artikelbild hochladen (ueberschreibt ein bestehendes Bild).
	function uploadItemImage(itemId, file) {
		if (!file || !itemId) { return Promise.resolve(); }
		const fd = new FormData();
		fd.append('file', file);
		return apiUpload('/stock/' + itemId + '/image', fd).catch(function (e) {
			toast(e.message, true);
			throw e;
		});
	}

	function uploadLocationImage(locationId, file) {
		if (!file || !locationId) { return Promise.resolve(); }
		const fd = new FormData();
		fd.append('file', file);
		return apiUpload('/location/' + locationId + '/image', fd).catch(function (e) {
			toast(e.message, true);
			throw e;
		});
	}

	function loadTree() {
		return api('GET', '/tree').then(function (locations) {
			renderTree(locations);
		}).catch(function (e) { toast(e.message, true); });
	}

	function el(tag, cls, text) {
		const node = document.createElement(tag);
		if (cls) node.className = cls;
		if (text !== null && text !== undefined) node.textContent = text;
		return node;
	}

	function renderTree(locations) {
		const tree = document.getElementById('lager-tree');
		const empty = document.getElementById('lager-tree-empty');
		tree.innerHTML = '';
		empty.classList.toggle('hidden', locations.length > 0);
		locations.forEach(function (loc) { tree.appendChild(buildBranch('location', loc)); });
		if (!selectedSlot) {
			updateAddArticleState(locations.length ? T('Select a location.') : T('Create a location first.'));
		}
	}

	function buildBranch(type, node) {
		const li = document.createElement('li');
		const row = el('div', 'tree-row');
		if (type === 'location') { row.dataset.locationId = String(node.id); }
		if (type === 'cabinet') { row.dataset.cabinetId = String(node.id); }
		if (type === 'slot') { row.dataset.slotId = String(node.id); }
		if (type === 'location' && node.has_image) {
			const image = document.createElement('img');
			image.className = 'location-thumb';
			image.src = API + '/location/' + node.id + '/image?v=' + Date.now();
			image.alt = '';
			image.title = T('Show photo');
			image.addEventListener('error', function () { image.remove(); });
			image.addEventListener('click', function (event) {
				event.stopPropagation();
				const overlay = openModal({ title: node.name });
				const photo = document.createElement('img');
				photo.src = image.src;
				photo.alt = '';
				photo.className = 'location-photo-large';
				overlay.querySelector('.modal').appendChild(photo);
			});
			row.appendChild(image);
		}
		const label = el('span', 'tree-label', node.name);
		const badge = el('span', 'badge', String(node.total_qty || 0));
		row.appendChild(label);
		row.appendChild(badge);
		row.appendChild(buildActions(type, node));
		row.addEventListener('click', function (e) {
			if (e.target.closest('.row-btn')) { return; }
			if (type === 'location') { selectLocation(node, row); }
			else if (type === 'cabinet') { selectCabinet(node, row); }
			else { selectSlot(node, row); }
		});
		const children = document.createElement('ul');
		if (type === 'location') {
			(node.cabinets || []).forEach(function (cab) { children.appendChild(buildBranch('cabinet', cab)); });
		} else if (type === 'cabinet') {
			(node.slots || []).forEach(function (slot) { children.appendChild(buildBranch('slot', slot)); });
		}
		li.appendChild(row);
		li.appendChild(children);
		children.classList.add('open');
		return li;
	}

	function buildActions(type, node) {
		const wrap = el('span', 'row-actions');
		if (type === 'location') {
			wrap.appendChild(rowBtn('+', T('Create cabinet'), function () { addChildForm('cabinet', node, function (parent, values) { return api('POST', '/cabinet', { location_id: parent.id, name: values.name, description: values.description }); }); }));
			wrap.appendChild(rowBtn('\u270E', T('Rename'), function () { renaming('location', node); }));
			wrap.appendChild(rowBtn('\u00D7', T('Delete'), function () { confirmAction(T('Really delete location "{name}"?', { name: node.name }), function () { return api('DELETE', '/location/' + node.id); }); }));
		} else if (type === 'cabinet') {
			wrap.appendChild(rowBtn('+', T('Create slot'), function () { addChildForm('slot', node, function (parent, values) { return api('POST', '/slot', { cabinet_id: parent.id, name: values.name, description: values.description }); }); }));
			wrap.appendChild(rowBtn('\u270E', T('Rename'), function () { renaming('cabinet', node); }));
			wrap.appendChild(rowBtn('\u00D7', T('Delete'), function () { confirmAction(T('Really delete cabinet "{name}"?', { name: node.name }), function () { return api('DELETE', '/cabinet/' + node.id); }); }));
		} else if (type === 'slot') {
			wrap.appendChild(rowBtn('\u270E', T('Rename'), function () { renaming('slot', node); }));
			wrap.appendChild(rowBtn('\u00D7', T('Delete'), function () { confirmAction(T('Really delete slot "{name}"?', { name: node.name }), function () { return api('DELETE', '/slot/' + node.id); }); }));
		}
		return wrap;
	}

	function rowBtn(text, title, onClick) {
		const b = el('button', 'row-btn', text);
		b.type = 'button';
		b.title = title;
		b.addEventListener('click', function (e) { e.stopPropagation(); onClick(); });
		return b;
	}

	function addChildForm(childType, parent, submitFn) {
		const names = { cabinet: T('Cabinet'), slot: T('Slot') };
		openFormModal({
			title: T('Create {type} in {parent}', { type: names[childType], parent: parent.name }),
			fields: [
				{ name: 'name', label: T('Name'), required: true, placeholder: childType === 'cabinet' ? T('e.g. Cabinet A') : T('e.g. Slot 1') },
				{ name: 'description', label: T('Description') },
			],
			onSubmit: function (values) {
				return submitFn(parent, values).then(function () {
					return loadTree().then(function () {
						if (childType === 'cabinet') { updateAddArticleState(T('Select a cabinet.')); }
					});
				});
			},
		});
	}

	function renaming(type, node) {
		openFormModal({
			title: T('Rename: {name}', { name: node.name }),
			fields: [
				{ name: 'name', label: T('New name'), required: true, value: node.name },
				{ name: 'description', label: T('Description'), value: node.description || '' },
			],
			file: type === 'location' ? {
				label: T('Photo'),
				existingUrl: node.has_image ? API + '/location/' + node.id + '/image?v=' + Date.now() : null,
			} : null,
			onSubmit: function (values) {
				const path = type === 'location' ? '/location/' : type === 'cabinet' ? '/cabinet/' : '/slot/';
				return api('PUT', path + node.id, {
					name: values.name,
					description: values.description,
				}).then(function () {
					return type === 'location'
						? uploadLocationImage(node.id, values._image)
						: undefined;
				}).then(loadTree);
			},
		});
	}

	function setSelectedRow(row) {
		document.querySelectorAll('.tree-row.selected').forEach(function (r) { r.classList.remove('selected'); });
		if (row) { row.classList.add('selected'); }
	}

	function isMobileLayout() {
		return window.matchMedia
			? window.matchMedia('(max-width: 760px)').matches
			: window.innerWidth <= 760;
	}

	function setupLocationSidebar() {
		const layout = document.querySelector('.lager-layout');
		const buttons = [
			document.getElementById('lager-toggle-locations-btn'),
			document.getElementById('lager-toggle-locations-pane-btn'),
		];
		let isOpen = !isMobileLayout();
		syncLocationSidebarLayout(layout, buttons, isOpen);
		window.addEventListener('resize', function () {
			syncLocationSidebarLayout(layout, buttons, isOpen);
		});
		buttons.forEach(function (button) {
			button.addEventListener('click', function () {
				isOpen = !isOpen;
				syncLocationSidebarLayout(layout, buttons, isOpen);
			});
		});
	}

	function syncLocationSidebarLayout(layout, buttons, isOpen) {
		if (isMobileLayout()) {
			layout.classList.remove('sidebar-collapsed');
			layout.classList.toggle('mobile-sidebar-open', isOpen);
		} else {
			layout.classList.remove('mobile-sidebar-open');
			layout.classList.toggle('sidebar-collapsed', !isOpen);
		}
		const label = T(isOpen ? 'Hide locations' : 'Show locations');
		buttons.forEach(function (button) {
			button.setAttribute('aria-expanded', String(isOpen));
			button.setAttribute('aria-label', label);
			button.title = label;
		});
	}

	function clearSlotDetail() {
		const detail = document.getElementById('lager-detail');
		detail.innerHTML = '';
		detail.classList.add('detail-empty');
	}

	function selectLocation(location, row) {
		selectedCabinet = null;
		selectedSlot = null;
		setSelectedRow(row);
		const detail = document.getElementById('lager-detail');
		detail.dataset.viewKey = 'location:' + location.id;
		detail.innerHTML = '';
		detail.classList.remove('detail-empty');
		const title = el('div', 'detail-title', location.name);
		const desc = el('div', 'detail-desc', location.description || '');
		const items = document.createElement('div');
		items.id = 'lager-location-items';
		detail.appendChild(title);
		detail.appendChild(desc);
		detail.appendChild(items);
		updateAddArticleState((location.cabinets || []).length ? T('Select a cabinet.') : T('Create a cabinet first.'));
		loadLocationDetail(location.id);
	}

	function loadLocationDetail(locationId) {
		const detail = document.getElementById('lager-detail');
		const wrap = document.getElementById('lager-location-items');
		if (!wrap || detail.dataset.viewKey !== 'location:' + locationId) { return Promise.resolve(); }
		return api('GET', '/stock/location/' + locationId).then(function (data) {
			if (detail.dataset.viewKey === 'location:' + locationId) {
				renderStockItems(wrap, data.items, true);
			}
		}).catch(function (error) { toast(error.message, true); });
	}

	function selectCabinet(cabinet, row) {
		selectedCabinet = cabinet;
		selectedSlot = null;
		setSelectedRow(row);
		const detail = document.getElementById('lager-detail');
		detail.dataset.viewKey = 'cabinet:' + cabinet.id;
		detail.innerHTML = '';
		detail.classList.remove('detail-empty');
		const title = el('div', 'detail-title', cabinet.name);
		const desc = el('div', 'detail-desc', cabinet.description || '');
		const items = document.createElement('div');
		items.id = 'lager-cabinet-items';
		detail.appendChild(title);
		detail.appendChild(desc);
		detail.appendChild(items);
		updateAddArticleState('');
		api('GET', '/stock/cabinet/' + cabinet.id).then(function (data) {
			if (detail.dataset.viewKey === 'cabinet:' + cabinet.id) {
				renderStockItems(items, data.items, true);
			}
		}).catch(function (error) { toast(error.message, true); });
	}

	function selectSlot(slot, row) {
		selectedCabinet = null;
		selectedSlot = slot;
		setSelectedRow(row || document.querySelector('[data-slot-id="' + slot.id + '"]'));
		updateAddArticleState('');
		const detail = document.getElementById('lager-detail');
		detail.dataset.viewKey = 'slot:' + slot.id;
		detail.innerHTML = '';
		detail.classList.remove('detail-empty');
		const title = el('div', 'detail-title', slot.name);
		const desc = el('div', 'detail-desc', slot.description || '');
		const tableWrap = document.createElement('div');
		tableWrap.id = 'lager-slot-items';
		detail.appendChild(title);
		detail.appendChild(desc);
		detail.appendChild(tableWrap);
		loadSlotDetail(slot.id);
	}

	function updateAddArticleState(message) {
		const addButton = document.getElementById('lager-add-article-btn');
		const hint = document.getElementById('lager-add-article-hint');
		addButton.disabled = !selectedSlot && !selectedCabinet;
		hint.textContent = message;
	}

	function openCreateArticleForm(container, type) {
		const cabinet = type === 'cabinet' ? container : null;
		const slot = type === 'slot' ? container : null;
		const containerName = slot ? slot.name : cabinet.name;
		openFormModal({
			title: T('Create article in {container}', { container: containerName }),
			fields: [
				{ name: 'article', label: T('Article'), required: true, placeholder: T('e.g. Screwdriver 6 mm') },
				{ name: 'manufacturer', label: T('Manufacturer') },
				{ name: 'notes', label: T('Notes') },
				{ name: 'ean', label: T('EAN / Code'), placeholder: T('e.g. 4001234567890') },
				{ name: 'quantity', label: T('Initial stock'), type: 'number', min: 0, value: '0' },
				{ name: 'minimum_quantity', label: T('Minimum stock'), type: 'number', min: 0, value: '0' },
				{ name: 'tags', label: T('Tags'), placeholder: T('e.g. Vegan') },
			],
			file: { label: T('Photo') },
			onSubmit: function (values) {
				const imgFile = values._image;
				const body = {
					article: values.article,
					manufacturer: values.manufacturer,
					notes: values.notes,
					quantity: parseInt(values.quantity, 10) || 0,
					minimum_quantity: parseInt(values.minimum_quantity, 10) || 0,
					ean: values.ean || null,
					tags: values.tags,
				};
				body[slot ? 'slot_id' : 'cabinet_id'] = container.id;
				return api('POST', '/stock', body).then(function (item) {
					return uploadItemImage(item && item.id ? item.id : null, imgFile);
				}).then(function () {
					return slot ? loadSlotDetail(slot.id) : loadCabinetDetail(cabinet.id);
				});
			},
		});
	}

	function loadSlotDetail(slotId) {
		return api('GET', '/stock/slot/' + slotId).then(function (data) {
			const detail = document.getElementById('lager-detail');
			const wrap = document.getElementById('lager-slot-items');
			if (!wrap || detail.dataset.viewKey !== 'slot:' + slotId) { return; }
			renderStockItems(wrap, data.items, false);
		}).catch(function (e) { toast(e.message, true); });
	}

	function loadCabinetDetail(cabinetId) {
		return api('GET', '/stock/cabinet/' + cabinetId).then(function (data) {
			const detail = document.getElementById('lager-detail');
			const wrap = document.getElementById('lager-cabinet-items');
			if (!wrap || detail.dataset.viewKey !== 'cabinet:' + cabinetId) { return; }
			renderStockItems(wrap, data.items, true);
		}).catch(function (e) { toast(e.message, true); });
	}

	function loadItemContainer(item) {
		const viewKey = document.getElementById('lager-detail').dataset.viewKey || '';
		if (viewKey.indexOf('location:') === 0) { return loadLocationDetail(viewKey.slice(9)); }
		if (viewKey.indexOf('cabinet:') === 0) { return loadCabinetDetail(viewKey.slice(8)); }
		if (viewKey.indexOf('slot:') === 0) { return loadSlotDetail(viewKey.slice(5)); }
		return item.slot_id ? loadSlotDetail(item.slot_id) : loadCabinetDetail(item.cabinet_id);
	}

	function renderStockItems(wrap, items, showStoragePlace) {
		wrap.innerHTML = '';
		if (!items.length) { wrap.appendChild(el('div', 'stock-empty', T('No articles here.'))); return; }
		const table = el('table', 'stock-table');
		const thead = document.createElement('thead');
		const headRow = document.createElement('tr');
		const headers = [T('Article'), T('Manufacturer'), T('EAN'), T('Quantity')];
		if (showStoragePlace) { headers.push(T('Storage place')); }
		headers.push('');
		headers.forEach(function (h) { headRow.appendChild(el('th', null, h)); });
		thead.appendChild(headRow);
		table.appendChild(thead);
		const tbody = document.createElement('tbody');
		items.forEach(function (item) {
				const tr = document.createElement('tr');
				const artTd = document.createElement('td');
				if (item.has_image) {
					const img = document.createElement('img');
					img.className = 'stock-thumb';
					// Cache-Busting: verhindert, dass ein alter 404 aus dem
					// Browser-Cache das Thumbnail unsichtbar macht.
					img.src = API + '/stock/' + item.id + '/image?v=' + (item.updated_at || Date.now());
					img.alt = '';
					img.title = T('Show photo');
					img.style.cursor = 'pointer';
					img.addEventListener('error', function () { img.remove(); });
					img.addEventListener('click', function (ev) { ev.stopPropagation(); showImageModal(item); });
					artTd.appendChild(img);
				}
				artTd.appendChild(document.createTextNode(item.article));
				tr.appendChild(artTd);
				const metadata = [item.notes, (item.tags || []).map(function (tag) { return tag.name; }).join(', ')].filter(Boolean).join(' · ');
				tr.appendChild(el('td', 'stock-manufacturer', item.manufacturer || ''));
				if (metadata) { artTd.appendChild(el('div', 'item-meta', metadata)); }
				tr.appendChild(el('td', 'ean-cell', item.ean || ''));
				tr.appendChild(el('td', 'qty', String(item.quantity)));
				if (showStoragePlace) { tr.appendChild(el('td', null, item.container_path || '')); }
				const actTd = document.createElement('td');
				const qrBtn = el('button', 'row-btn', '\u{1F4F7}');
				qrBtn.type = 'button';
				qrBtn.title = T('Show QR/code');
				qrBtn.addEventListener('click', function () { showCode(item); });
				const inBtn = el('button', 'row-btn', '+');
				inBtn.type = 'button'; inBtn.title = T('Book stock in');
				inBtn.addEventListener('click', function () { movementForm(item, 'in'); });
				const outBtn = el('button', 'row-btn', '\u2212');
				outBtn.type = 'button'; outBtn.title = T('Book stock out');
				outBtn.addEventListener('click', function () { movementForm(item, 'out'); });
				const editBtn = el('button', 'row-btn', '\u270E');
				editBtn.type = 'button'; editBtn.title = T('Edit');
				editBtn.addEventListener('click', function () { stockEditForm(item); });
				actTd.appendChild(qrBtn);
				actTd.appendChild(inBtn);
				actTd.appendChild(outBtn);
				actTd.appendChild(editBtn);
				const delBtn = el('button', 'row-btn', '\u00D7');
				delBtn.type = 'button'; delBtn.title = T('Delete');
				delBtn.addEventListener('click', function () { confirmAction(T('Delete article?'), function () { return api('DELETE', '/stock/' + item.id); }, function () { loadItemContainer(item); loadTree(); }); });
				actTd.appendChild(delBtn);
				tr.appendChild(actTd);
				tbody.appendChild(tr);
			});
		table.appendChild(tbody);
		wrap.appendChild(table);
	}

	function movementForm(item, type) {
		const max = type === 'out' ? item.quantity : null;
		openFormModal({
			title: (type === 'in' ? T('Stock in') : T('Stock out')) + ' \u00B7 ' + item.article,
			fields: [
				{ name: 'quantity', label: T('Quantity') + (max !== null ? ' (' + T('max') + ' ' + max + ')' : ''), type: 'number', min: 1, value: '1', required: true },
				{ name: 'note', label: T('Note') },
			],
			onSubmit: function (values) {
				return api('POST', '/movement', {
					stock_id: item.id, type: type,
					quantity: parseInt(values.quantity, 10), note: values.note,
				}).then(function () { loadItemContainer(item); loadTree(); });
			},
		});
	}

	function stockEditForm(item) {
		openFormModal({
			title: T('Edit article'),
			fields: [
				{ name: 'article', label: T('Article'), required: true, value: item.article },
				{ name: 'manufacturer', label: T('Manufacturer'), value: item.manufacturer || '' },
				{ name: 'notes', label: T('Notes'), value: item.notes || item.description || '' },
				{ name: 'ean', label: T('EAN / Code'), value: item.ean || '' },
				{ name: 'minimum_quantity', label: T('Minimum stock'), type: 'number', min: 0, value: String(item.minimum_quantity || 0) },
				{ name: 'tags', label: T('Tags'), value: (item.tags || []).map(function (tag) { return tag.name; }).join(', ') },
			],
			file: {
				label: T('Photo'),
				existingUrl: item.has_image ? API + '/stock/' + item.id + '/image?v=' + (item.updated_at || Date.now()) : null,
			},
			onSubmit: function (values) {
				const imgFile = values._image;
				return api('PUT', '/stock/' + item.id, {
					article: values.article, manufacturer: values.manufacturer, notes: values.notes,
					ean: values.ean || null, tags: values.tags,
					minimum_quantity: parseInt(values.minimum_quantity, 10) || 0,
				}).then(function () { return uploadItemImage(item.id, imgFile); })
				.then(function () { loadItemContainer(item); });
			},
		});
	}

	// Artikelbild vergroessert anzeigen.
	function showImageModal(item) {
		const overlay = openModal({ title: item.article });
		const modal = overlay.querySelector('.modal');
		const img = document.createElement('img');
		img.src = API + '/stock/' + item.id + '/image?v=' + (item.updated_at || Date.now());
		img.alt = '';
		img.style.maxWidth = '100%';
		img.style.borderRadius = '4px';
		img.style.display = 'block';
		modal.appendChild(img);
	}

	function openTagManager() {
		api('GET', '/tags').then(function (tags) {
			const overlay = openModal({ title: T('Manage tags') });
			const modal = overlay.querySelector('.modal');
			const form = document.createElement('form');
			const name = document.createElement('input');
			name.type = 'text';
			name.required = true;
			name.placeholder = T('e.g. Vegan');
			const add = el('button', 'btn primary', T('Add tag'));
			add.type = 'submit';
			form.appendChild(name);
			form.appendChild(add);
			const error = el('div', 'modal-error');
			const list = el('div', 'tag-manager-list');
			modal.insertBefore(form, modal.querySelector('.modal-buttons'));
			modal.insertBefore(error, modal.querySelector('.modal-buttons'));
			modal.insertBefore(list, modal.querySelector('.modal-buttons'));

			function renderTags(items) {
				list.innerHTML = '';
				if (!items.length) { list.appendChild(el('p', null, T('No tags created yet.'))); }
				items.forEach(function (tag) {
					const row = el('div', 'tag-manager-row');
					const input = document.createElement('input');
					input.type = 'text';
					input.value = tag.name;
					input.setAttribute('aria-label', T('Tag'));
					const save = el('button', 'btn', T('Save'));
					save.type = 'button';
					save.addEventListener('click', function () {
						api('PUT', '/tag/' + tag.id, { name: input.value }).then(refresh).catch(function (e) { error.textContent = e.message; });
					});
					const remove = el('button', 'btn', T('Delete'));
					remove.type = 'button';
					remove.addEventListener('click', function () {
						api('DELETE', '/tag/' + tag.id).then(refresh).catch(function (e) { error.textContent = e.message; });
					});
					row.appendChild(input);
					row.appendChild(save);
					row.appendChild(remove);
					list.appendChild(row);
				});
			}
			function refresh() {
				return api('GET', '/tags').then(renderTags);
			}
			renderTags(tags);
			form.addEventListener('submit', function (event) {
				event.preventDefault();
				add.disabled = true;
				error.textContent = '';
				api('POST', '/tag', { name: name.value }).then(function () {
					name.value = '';
					return refresh();
				}).catch(function (e) {
					error.textContent = e.message;
				}).finally(function () { add.disabled = false; });
			});
		}).catch(function (e) { toast(e.message, true); });
	}

	// === Search ===
	function doSearch(q) {
		const box = document.getElementById('lager-search-results');
		api('GET', '/search?q=' + encodeURIComponent(q)).then(function (items) {
			box.innerHTML = '';
			if (!items.length) { box.appendChild(el('div', 'search-result', T('No results.'))); }
			else { items.forEach(function (item) {
				const div = el('div', 'search-result');
				const a = el('div', 'article', item.article);
				const p = el('div', 'path', item.slot_path + ' \u00B7 ' + T('Stock') + ': ' + item.quantity + (item.ean ? ' \u00B7 ' + item.ean : ''));
				const metadata = [item.manufacturer, item.notes, (item.tags || []).map(function (tag) { return tag.name; }).join(', ')].filter(Boolean).join(' · ');
				div.appendChild(a);
				if (metadata) { div.appendChild(el('div', 'metadata', metadata)); }
				div.appendChild(p);
				div.addEventListener('click', function () {
					hideSearchResults();
					api('GET', '/tree').then(function (locations) {
						const found = item.slot_id === null ? null : findSlot(locations, item.slot_id);
						const cabinet = found ? { location: found.loc, cabinet: found.cab } : findCabinet(locations, item.cabinet_id);
						renderTree(locations);
						if (found) { selectSlot(found.slot); }
						else if (cabinet) {
							selectCabinet(cabinet.cabinet, document.querySelector('[data-cabinet-id="' + cabinet.cabinet.id + '"]'));
						}
					});
				});
				box.appendChild(div);
			}); }
			box.classList.remove('hidden');
		}).catch(function () {});
	}
	function hideSearchResults() { const b = document.getElementById('lager-search-results'); b.classList.add('hidden'); b.innerHTML = ''; }
	function findSlot(locations, slotId) {
		for (const loc of locations) {
			for (const cab of (loc.cabinets || [])) {
				for (const slot of (cab.slots || [])) {
					if (slot.id === slotId) {
						return { loc, cab, slot };
					}
				}
			}
		}
		return null;
	}
	function findCabinet(locations, cabinetId) {
		for (const loc of locations) {
			for (const cabinet of (loc.cabinets || [])) {
				if (Number(cabinet.id) === Number(cabinetId)) { return { location: loc, cabinet: cabinet }; }
			}
		}
		return null;
	}

	// === Scan (Barcode/QR via camera) ===
	function openScanModal() {
		const modal = document.getElementById('lager-scan-modal');
		modal.classList.remove('hidden');
		document.getElementById('lager-scan-result').classList.add('hidden');
		document.getElementById('lager-scan-manual').value = '';
		startCamera();
	}

	function closeScanModal() {
		document.getElementById('lager-scan-modal').classList.add('hidden');
		stopCamera();
	}

	var barcodeDetector = null;
	var detectorFailed = false;

	function getDetector() {
		if (detectorFailed) { return null; }
		if (barcodeDetector) { return barcodeDetector; }
		if (!('BarcodeDetector' in window)) { detectorFailed = true; return null; }
		try {
			var supported = (typeof BarcodeDetector.getSupportedFormats === 'function') ? BarcodeDetector.getSupportedFormats() : [];
			var wanted = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'];
			var formats = supported.length
				? wanted.filter(function (f) { return supported.indexOf(f) !== -1; })
				: wanted;
			barcodeDetector = new BarcodeDetector(formats.length ? { formats: formats } : undefined);
		} catch (e) {
			try { barcodeDetector = new BarcodeDetector(); } catch (e2) { detectorFailed = true; return null; }
		}
		return barcodeDetector;
	}

	// === Live-Scanning via html5-qrcode (v2.3.8, lokales Bundle) ===
	// Der Scanner rendert seine eigene UI in #html5-qrcode-region: Video, Scan-Box,
	// Kamera-Auswahl (vorne/hinten) und Start/Stop. Formate bewusst klein gehalten
	// (QR, EAN-13, EAN-8) für maximale Erkennungs-Leistung pro Frame.
	function getH5Formats() {
		var F = window.Html5QrcodeSupportedFormats;
		if (!F) { return [0, 9, 10]; } // QR_CODE, EAN_13, EAN_8
		return [F.QR_CODE, F.EAN_13, F.EAN_8];
	}

	function h5ScannerState() {
		if (!h5Scanner) { return 0; } // UNKNOWN
		try { return h5Scanner.getState(); } catch (e) { return 0; }
	}

	function startCamera() {
		var status = document.getElementById('lager-scan-status');
		// Vorherige Session sauber beenden
		stopCamera();

		status.textContent = T('Starting camera \u2026');
		if (typeof window.Html5QrcodeScanner !== 'function') {
			status.textContent = T('Scanner library not loaded \u2013 please enter the code manually or load a photo.');
			return;
		}
		// Erst die Browser-Kamerapermission prüfen: dann erscheint die native
		// Abfrage (falls noch nie erlaubt) genau EINMAL und wird danach pro
		// Domain gespeichert. Solange das nicht der Fall ist, zeigt
		// html5-qrcode seinen eigenen "Request Camera Permissions"-Button.
		ensureCameraPermission().then(function (granted) {
			if (granted) {
				markCameraPermissionGranted();
				// Kurze Pause: gerade freigegebene Kamera wird zuverlässig
				// erneut erlangt (Android/Chrome scheitern sonst teils)
				setTimeout(function () { startScanner(status); }, 300);
			} else {
				status.textContent = T('Camera access required \u2013 please allow the camera in the browser prompt.');
				startScanner(status);
			}
		});
	}

	function startScanner(status) {
		var scanTypes = window.Html5QrcodeScanType ? [window.Html5QrcodeScanType.SCAN_TYPE_CAMERA] : undefined;
		try {
			h5Scanner = new window.Html5QrcodeScanner('html5-qrcode-region', {
				formatsToSupport: getH5Formats(),
				fps: 10,
				qrbox: { width: 260, height: 170 },
				rememberLastUsedCamera: true,
				supportedScanTypes: scanTypes
			}, false);
		} catch (e) {
			h5Scanner = null;
			status.textContent = T('Scanner could not be initialized: ') + (e && e.message ? e.message : e) + T(' \u2013 please enter the code manually.');
			return;
		}
		// onScanSuccess: Code gefunden -> stoppen + Artikel nachschlagen.
		h5Scanner.render(
			function (decodedText) {
				if (!decodedText) { return; }
				reportCode(decodedText, status, 'html5-qrcode');
			},
			function (err) {
				// 'No code found' pro Frame ist normal \u2013 nur als Log, Status bleibt ungestört.
				console.log('[Lager] scan error:', err);
			}
		).catch(function (err) {
			status.textContent = T('Camera error: ') + (err && err.message ? err.message : err) + T(' \u2013 please enter the code manually or load a photo.');
		});
		// Bei mehreren Kameras (noch keine genutzt): hintere Kamera automatisch
		// w\u00e4hlen und starten. Einzelkamera bzw. zuletzt genutzte Kamera
		// startet html5-qrcode von selbst \u2013 dann bricht der Timer ab.
		autoStartRearCamera();
	}

	// Fragt den Browser vor dem Scannerstart nach der Kamerapermission.
	// Ohne erteilte Permission erscheint die native (vertraute) Abfrage
	// einmalig; danach ist sie f\u00fcr die Domain gespeichert und
	// html5-qrcode zeigt keinen eigenen Permissions-Button mehr an.
	function ensureCameraPermission() {
		return new Promise(function (resolve) {
			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				resolve(false);
				return;
			}
			navigator.mediaDevices.getUserMedia({ video: true }).then(function (stream) {
				stream.getTracks().forEach(function (t) { t.stop(); });
				resolve(true);
			}).catch(function () {
				resolve(false);
			});
		});
	}

	// Synchronisiert das interne html5-qrcode-Flag (localStorage
	// HTML5_QRCODE_DATA), damit dessen eigene Permission-Logik (Label-Check
	// via enumerateDevices) \u00fcbersprungen wird und direkt die
	// Kameraauswahl mit Autostart erfolgt. Zuletzt genutzte Kamera bleibt erhalten.
	function markCameraPermissionGranted() {
		try {
			var key = 'HTML5_QRCODE_DATA';
			var data = { hasPermission: true, lastUsedCameraId: null };
			var raw = localStorage.getItem(key);
			if (raw) {
				var parsed = JSON.parse(raw);
				if (parsed && parsed.lastUsedCameraId) {
					data.lastUsedCameraId = parsed.lastUsedCameraId;
				}
			}
			localStorage.setItem(key, JSON.stringify(data));
		} catch (e) { /* unkritisch (z. B. privater Modus) */ }
	}

	// W\u00e4hlt im Kamera-Dropdown der html5-qrcode-UI die hintere Kamera aus
	// und l\u00f6st den Start aus \u2013 nur solange der Scanner noch nicht l\u00e4uft.
	function autoStartRearCamera() {
		var tries = 0;
		var timer = setInterval(function () {
			tries++;
			if (tries > 60) { clearInterval(timer); return; }
			if (h5ScannerState() === 2) { clearInterval(timer); return; }
			var region = document.getElementById('html5-qrcode-region');
			if (!region) { return; }
			var sel = region.querySelector('#html5-qrcode-select-camera');
			if (!sel || sel.options.length < 2 || sel.disabled) { return; }
			clearInterval(timer);
			var idx = 0;
			for (var i = 0; i < sel.options.length; i++) {
				var label = sel.options[i].label || sel.options[i].text || '';
				if (/hinter|back|rear|umgebung|environment/i.test(label)) { idx = i; break; }
			}
			sel.selectedIndex = idx;
			var startBtn = region.querySelector('#html5-qrcode-button-camera-start');
			if (startBtn && !startBtn.disabled) { startBtn.click(); }
		}, 500);
	}


	var zxingReader = null;
	var zxingHints = null;
	var zxingChecked = false;

	function getZxingReader() {
		if (zxingReader) { return zxingReader; }
		if (zxingChecked || typeof window.ZXING_LAGER === 'undefined') { return null; }
		try {
			var Z = window.ZXING_LAGER;
			var hints = new Map();
			hints.set(Z.DecodeHintType.TRY_HARDER, true);
			// Kein CODE_39: liest ohne Prüfsumme/Abgrenzung gern EAN/QR-Bilder falsch
			hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [
				Z.BarcodeFormat.QR_CODE,
				Z.BarcodeFormat.EAN_13,
				Z.BarcodeFormat.EAN_8,
				Z.BarcodeFormat.CODE_128,
				Z.BarcodeFormat.UPC_A,
				Z.BarcodeFormat.UPC_E,
			]);
			zxingReader = new Z.MultiFormatReader(hints);
			zxingHints = hints;
		} catch (e) {
			zxingReader = null;
		}
		zxingChecked = true;
		return zxingReader;
	}

	function sourceDims(source) {
		var w = source.videoWidth || source.naturalWidth || source.width;
		var h = source.videoHeight || source.naturalHeight || source.height;
		return (w && h) ? { w: w, h: h } : null;
	}

	function isPlausibleCode(text, format) {
		var t = (text || '').trim();
		if (!t) { return false; }
		var f = (format || '').toLowerCase();
		if (f === 'code_39' || f === 'code_93') { return t.length >= 4; }
		if (f === 'qr_code') { return true; }
		// 1-D-Barcode: 1–3 Zeichen sind fast immer Fehlesungen
		return t.length >= 4;
	}

	function formatLabel(format) {
		var f = (format || '').toLowerCase();
		var map = { ean_13: 'EAN-13', ean_8: 'EAN-8', code_128: 'Code 128', upc_a: 'UPC-A', upc_e: 'UPC-E', qr_code: 'QR-Code', code_39: 'Code 39' };
		return map[f] || format || '';
	}

	function decodeCanvasOnce(canvas) {
		var Z = window.ZXING_LAGER;
		try {
			// Jede neue LuminanceSource wechselt automatisch die Polariität (normal/invertiert).
			var ls = new Z.HTMLCanvasElementLuminanceSource(canvas);
			var result = zxingReader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(ls)), zxingHints);
			var text = (result.getText() || '').trim();
			if (!text) { return null; }
			return { text: text, format: result.getBarcodeFormat ? result.getBarcodeFormat() : '' };
		} catch (e) {
			return null;
		}
	}

	// Findet die dunkle Region im Bild (der Code) und liefert eine Crop-Box in Quell-Koordinaten.
	function findDarkRegion(source) {
		var dims = sourceDims(source);
		if (!dims) { return null; }
		try {
			var sw = 120;
			var sh = Math.max(8, Math.round(sw * dims.h / dims.w));
			var small = document.createElement('canvas');
			small.width = sw;
			small.height = sh;
			var sctx = small.getContext('2d', { willReadFrequently: true });
			sctx.drawImage(source, 0, 0, sw, sh);
			var data = sctx.getImageData(0, 0, sw, sh).data;
			var n = sw * sh;
			var sum = 0;
			for (var i = 0; i < n; i++) {
				sum += (data[i*4] + data[i*4+1] + data[i*4+2]) / 3;
			}
			var avg = sum / n;
			var thresh = Math.min(120, avg - 35);
			if (thresh < 40) { thresh = 40; }
			var x0 = sw, y0 = sh, x1 = -1, y1 = -1;
			for (var y = 0; y < sh; y++) {
				for (var x = 0; x < sw; x++) {
					var l = (data[(y*sw+x)*4] + data[(y*sw+x)*4+1] + data[(y*sw+x)*4+2]) / 3;
					if (l < thresh) {
						if (x < x0) { x0 = x; }
						if (x > x1) { x1 = x; }
						if (y < y0) { y0 = y; }
						if (y > y1) { y1 = y; }
					}
				}
			}
			if (x1 < 0 || y1 < 0) { return null; }
			var w = x1 - x0 + 1;
			var h = y1 - y0 + 1;
			var padX = Math.max(4, Math.round(w * 0.3));
			var padY = Math.max(4, Math.round(h * 0.3));
			x0 = Math.max(0, x0 - padX);
			y0 = Math.max(0, y0 - padY);
			x1 = Math.min(sw - 1, x1 + padX);
			y1 = Math.min(sh - 1, y1 + padY);
			w = x1 - x0 + 1;
			h = y1 - y0 + 1;
			if (w < 12 || h < 12) { return null; }
			// Fast das ganze Bild dunkel (z. B. dunkler Tisch) – Crop bringt nichts
			if (w > sw * 0.95 && h > sh * 0.95) { return null; }
			return {
				sx: x0 / sw * dims.w,
				sy: y0 / sh * dims.h,
				sw: w / sw * dims.w,
				sh: h / sh * dims.h
			};
		} catch (e) {
			return null;
		}
	}

	function decodeWithZxing(source) {
		if (!getZxingReader()) { return null; }
		var dims = sourceDims(source);
		if (!dims) { return null; }
		var scale = Math.min(1, 1200 / Math.max(dims.w, dims.h));
		var cw = Math.max(1, Math.floor(dims.w * scale));
		var ch = Math.max(1, Math.floor(dims.h * scale));
		function drawRegion(sx, sy, sw, sh) {
			var canvas = document.createElement('canvas');
			canvas.width = cw;
			canvas.height = ch;
			// willReadFrequently: CPU-backeertes Canvas – ohne den Hint liest Safari getImageData
			// teils leer/schwarzes aus (bekanntes WebKit-Problem bei Video-Rahmen).
			var ctx = canvas.getContext('2d', { willReadFrequently: true });
			ctx.drawImage(source, sx, sy, sw, sh, 0, 0, cw, ch);
			return canvas;
		}
		function drawRotated(deg) {
			var canvas = document.createElement('canvas');
			var swap = (deg === 90 || deg === 270);
			canvas.width = swap ? ch : cw;
			canvas.height = swap ? cw : ch;
			var ctx = canvas.getContext('2d', { willReadFrequently: true });
			ctx.translate(canvas.width / 2, canvas.height / 2);
			ctx.rotate(deg * Math.PI / 180);
			ctx.drawImage(source, -dims.w * scale / 2, -dims.h * scale / 2, dims.w * scale, dims.h * scale);
			return canvas;
		}
		function attempt(canvas) {
			var r = decodeCanvasOnce(canvas);
			if (r && isPlausibleCode(r.text, r.format)) { return r.text; }
			return null;
		}
		// 1) Vollbild – beide Polariitäten
		var full = drawRegion(0, 0, dims.w, dims.h);
		var code = attempt(full);
		if (code) { return code; }
		code = attempt(full); // Polariität wechselt automatisch
		if (code) { return code; }
		// 1b) Vollbild rotiert (90°/270°) – Code steht „senkrecht“ im Bild (z. B. Tablet im Hochformat)
		// ZXings 1-D-Decoder findet EAN/UPC/Code-128 nur mit horizontalen Balken; QR würde
		// die Drehung selbst erkennen, 1-D-Codes brauchen diese extra Versuche.
		var r90 = drawRotated(90);
		code = attempt(r90);
		if (code) { return code; }
		code = attempt(r90); // Polariität wechselt automatisch
		if (code) { return code; }
		var r270 = drawRotated(270);
		code = attempt(r270);
		if (code) { return code; }
		code = attempt(r270);
		if (code) { return code; }
		// 2) Automatik-Crop: dunkle Region (der Code) finden und vergrößern – egal wo im Bild
		var region = findDarkRegion(source);
		if (region) {
			var cropped = drawRegion(region.sx, region.sy, region.sw, region.sh);
			code = attempt(cropped);
			if (code) { return code; }
			code = attempt(cropped); // Polariität wechselt automatisch
			if (code) { return code; }
		}
		// 3) Zentrum 60 % vergrößert
		code = attempt(drawRegion(dims.w * 0.2, dims.h * 0.2, dims.w * 0.6, dims.h * 0.6));
		if (code) { return code; }
		// 4) Zentrum 30 % vergrößert
		code = attempt(drawRegion(dims.w * 0.35, dims.h * 0.35, dims.w * 0.3, dims.h * 0.3));
		if (code) { return code; }
		// 5) 1-D-Helligkeitsprofil (Spalten-/Zeilenmittel) – die Methode echter Scanner-Chips,
		//    deutlich robuster gegen Unschärfe, Rauschen und leichte Perspektive
		return decodeOneDProfile(source);
	}

	// 1-D-Profil-Decodierung: Die mittlere Helligkeit pro Spalte (bzw. Zeile) der dunklen
	//    Region wird zu einem sauberen 1-D-Profil gemittelt und damit entzerrt. Danach
	//    erkennt der ZXing-1D-Decoder EAN/UPC/Code-128 auch aus realen Kamerabildern.
	function decodeOneDProfile(source) {
		var dims = sourceDims(source);
		if (!dims) { return null; }
		var region = findDarkRegion(source);
		// 1) Profil aus der Code-Region
		if (region) {
			var scale = Math.min(1, 1600 / Math.max(dims.w, dims.h));
			var rw = Math.max(16, Math.floor(region.sw * scale));
			var rh = Math.max(16, Math.floor(region.sh * scale));
			var canvas = document.createElement('canvas');
			canvas.width = rw;
			canvas.height = rh;
			var ctx = canvas.getContext('2d', { willReadFrequently: true });
			ctx.drawImage(source, region.sx, region.sy, region.sw, region.sh, 0, 0, rw, rh);
			try {
				var data = ctx.getImageData(0, 0, rw, rh).data;
				var code = profileDecode(data, rw, rh, 'rows');
				if (code) { return code; }
				return profileDecode(data, rw, rh, 'cols');
			} catch (e) { return null; }
		}
		// 2) Notnagel: Profil über das gesamte Bild (falls die Regionserkennung danebengriff)
		var scale2 = Math.min(1, 1600 / Math.max(dims.w, dims.h));
		var fw = Math.max(1, Math.floor(dims.w * scale2));
		var fh = Math.max(1, Math.floor(dims.h * scale2));
		var canvas2 = document.createElement('canvas');
		canvas2.width = fw;
		canvas2.height = fh;
		var ctx2 = canvas2.getContext('2d', { willReadFrequently: true });
		ctx2.drawImage(source, 0, 0, dims.w, dims.h, 0, 0, fw, fh);
		try {
			var data2 = ctx2.getImageData(0, 0, fw, fh).data;
			var code2 = profileDecode(data2, fw, fh, 'rows');
			if (code2) { return code2; }
			return profileDecode(data2, fw, fh, 'cols');
		} catch (e) { return null; }
	}

	function profileDecode(data, w, h, mode) {
		var margin = mode === 'rows' ? Math.floor(h * 0.2) : Math.floor(w * 0.2);
		var len = mode === 'rows' ? w : h;
		var span = (mode === 'rows' ? h : w) - 2 * margin;
		if (span < 4 || len < 16) { return null; }
		var profile = new Uint8Array(len);
		for (var i = 0; i < len; i++) {
			var sum = 0;
			for (var j = margin; j < margin + span; j++) {
				var idx = mode === 'rows' ? (j * w + i) : (i * w + j);
				sum += (data[idx * 4] + data[idx * 4 + 1] + data[idx * 4 + 2]) / 3;
			}
			profile[i] = Math.round(sum / span);
		}
		// Profil in ein kleines Canvas mit weißem Rand (Quiet Zone) schreiben
		var quiet = Math.max(30, Math.floor(len * 0.08));
		var rows = 9;
		var pw = len + 2 * quiet;
		var canvas = document.createElement('canvas');
		canvas.width = pw;
		canvas.height = rows;
		var ctx = canvas.getContext('2d', { willReadFrequently: true });
		var img = ctx.createImageData(pw, rows);
		for (var y = 0; y < rows; y++) {
			for (var x = 0; x < pw; x++) {
				var p = (x >= quiet && x < quiet + len) ? profile[x - quiet] : 255;
				var o = (y * pw + x) * 4;
				img.data[o] = p;
				img.data[o + 1] = p;
				img.data[o + 2] = p;
				img.data[o + 3] = 255;
			}
		}
		ctx.putImageData(img, 0, 0);
		// Beide Polaritäten
		var r = decodeCanvasOnce(canvas);
		if (r && isPlausibleCode(r.text, r.format)) { return r.text; }
		r = decodeCanvasOnce(canvas);
		if (r && isPlausibleCode(r.text, r.format)) { return r.text; }
		return null;
	}

	// === Robust QR-Pipeline ===
	// Für schwierige Kamerabilder (PERSPEKTIVE, schräge/dunkle Beleuchtung, leichte
	// Unschärfe): Helligkeits-Normalisierung -> Finder-Erkennung -> Homographie (Entzerrung)
	// -> Modul-Sampling -> Dekodierung (ZXing + jsQR). Läuft nach dem ZXing-Fast-Path.
	var robustReader = null;

	function getRobustReader() {
		var Z = window.ZXING_LAGER;
		if (!Z) { return null; }
		if (!robustReader) {
			try {
				var hints = new Map();
				hints.set(Z.DecodeHintType.TRY_HARDER, true);
				hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.QR_CODE]);
				robustReader = new Z.MultiFormatReader(hints);
			} catch (e) { robustReader = null; }
		}
		return robustReader;
	}

	function rZX(lum, w, h) {
		var Z = window.ZXING_LAGER;
		var reader = getRobustReader();
		if (!reader) { return null; }
		try {
			var res = reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.LuminanceSource(w, h, lum))), null);
			if (res) { return res.getText(); }
		} catch (e) { /* kein Code */ }
		return null;
	}

	function rJSQR(rgba, w, h) {
		try {
			if (typeof window.jsQR === 'function') {
				var res = window.jsQR(rgba, w, h);
				if (res && res.data) { return res.data; }
			}
		} catch (e) { /* kein Code */ }
		return null;
	}

	function rGray(data, w, h) {
		var g = new Float32Array(w * h);
		for (var i = 0; i < w * h; i++) {
			g[i] = (data[i*4] * 299 + data[i*4+1] * 587 + data[i*4+2] * 114) / 1000;
		}
		return g;
	}

	function rBoxBlur(src, w, h, r) {
		var tmp = new Float32Array(w * h), o = new Float32Array(w * h);
		var i, x, y, acc;
		for (y = 0; y < h; y++) {
			acc = 0;
			for (x = -r; x <= r; x++) { acc += src[y * w + Math.min(w - 1, Math.max(0, x))]; }
			for (x = 0; x < w; x++) {
				tmp[y * w + x] = acc / (2 * r + 1);
				acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
			}
		}
		for (x = 0; x < w; x++) {
			acc = 0;
			for (y = -r; y <= r; y++) { acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]; }
			for (y = 0; y < h; y++) {
				o[y * w + x] = acc / (2 * r + 1);
				acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r)];
			}
		}
		return o;
	}

	function rNormalize(gray, w, h, blurR) {
		// Radius muss genug Module überspannen, damit das Fenster immer Helle enthält
		// (sonst normalisieren dunkle Flächen zu Weiß).
		var bg = rBoxBlur(gray, w, h, blurR);
		var out = new Float32Array(w * h);
		for (var i = 0; i < w * h; i++) { out[i] = Math.min(255, gray[i] * 255 / Math.max(bg[i], 8)); }
		return out;
	}

	function rOtsu(arr) {
		var hist = new Uint32Array(256);
		var i, t;
		for (i = 0; i < arr.length; i++) { hist[Math.min(255, Math.max(0, Math.round(arr[i] + 0.5)))]++; }
		var n = arr.length, sum = 0;
		for (t = 0; t < 256; t++) { sum += t * hist[t]; }
		var sumB = 0, wB = 0, maxVar = 0, thr = 127;
		for (t = 0; t < 256; t++) {
			wB += hist[t]; if (!wB) { continue; }
			var wF = n - wB; if (!wF) { break; }
			sumB += t * hist[t];
			var mB = sumB / wB, mF = (sum - sumB) / wF;
			var v = wB * wF * (mB - mF) * (mB - mF);
			if (v > maxVar) { maxVar = v; thr = t; }
		}
		return thr;
	}

	function rDetectFinders(gray, w, h) {
		var t = rOtsu(gray);
		var bin = new Uint8Array(w * h);
		var i;
		for (i = 0; i < w * h; i++) { bin[i] = gray[i] < t ? 1 : 0; }
		var cands = [];
		function scanLine(pix, n, row, isRow) {
			var i = 0;
			while (i < n) {
				if (pix[i] !== 1) { i++; continue; }
				var start = i;
				var runs = [0, 0, 0, 0, 0];
				var r = 0;
				while (r < 5 && i < n) {
					while (i < n && pix[i] === (r % 2 === 0 ? 1 : 0)) { runs[r]++; i++; }
					if (i >= n && runs[r] === 0) { break; }
					r++;
				}
				if (r === 5) {
					var m = runs[2] / 3;
					if (m >= 2.5) {
						var ok = true;
						for (var j = 0; j < 5; j++) {
							var kk = [1, 1, 3, 1, 1][j];
							if (Math.abs(runs[j] - kk * m) > m * 0.7) { ok = false; break; }
						}
						if (ok) {
							var center = i - runs[4] - runs[3] - runs[2] / 2;
							var size = runs[0] + runs[1] + runs[2] + runs[3] + runs[4];
							cands.push(isRow ? { x: center, y: row, size: size } : { x: row, y: center, size: size });
							continue; // Treffer: i steht hinter dem Muster
						}
					}
				}
				// Fehlschlag: NUR die erste dunkle Run überspringen – sonst würde ein
				// Nachbar-Objekt (z. B. der Etiketten-Rahmen) den echten Musterstart fressen.
				i = start + runs[0];
			}
		}
		var y, x;
		for (y = 0; y < h; y++) { scanLine(bin.subarray(y * w, (y + 1) * w), w, y, true); }
		for (x = 0; x < w; x++) {
			var p = new Uint8Array(h);
			for (y = 0; y < h; y++) { p[y] = bin[y * w + x]; }
			scanLine(p, h, x, false);
		}
		var clusters = [];
		for (i = 0; i < cands.length; i++) {
			var c = cands[i];
			var best = null, bd = 1e9;
			for (var cl2 = 0; cl2 < clusters.length; cl2++) {
				var cl = clusters[cl2];
				var dd = Math.hypot(c.x - cl.x, c.y - cl.y);
				if (dd < bd) { bd = dd; best = cl; }
			}
			if (best && bd < Math.max(24, w * 0.03)) {
				best.n++;
				best.x = (best.x * (best.n - 1) + c.x) / best.n;
				best.y = (best.y * (best.n - 1) + c.y) / best.n;
				best.size = (best.size * (best.n - 1) + c.size) / best.n;
			} else {
				clusters.push({ x: c.x, y: c.y, size: c.size, n: 1 });
			}
		}
		var verified = [];
		for (var ci = 0; ci < clusters.length; ci++) {
			var q = clusters[ci];
			var cx = Math.round(q.x), cy = Math.round(q.y);
			if (cx < 0 || cy < 0 || cx >= w || cy >= h) { continue; }
			var mm = q.size / 7;
			var dark = 0, nn = 0;
			for (var dy2 = -3.5; dy2 <= 3.5; dy2 += 0.5) {
				var py = Math.min(h - 1, Math.max(0, Math.round(cy + dy2 * mm)));
				nn++; if (gray[py * w + cx] < 127.5) { dark++; }
			}
			if (dark / nn > 0.25 && dark / nn < 0.75) { verified.push(q); }
		}
		verified.sort(function (a, b) { return b.n - a.n; });
		return verified.slice(0, 8);
	}

	function rRefineFinder(gray, w, h, cx0, cy0, m0) {
		function sample(x, y) {
			var ix = Math.round(x), iy = Math.round(y);
			if (ix < 0 || iy < 0 || ix >= w || iy >= h) { return 255; }
			return gray[iy * w + ix];
		}
		function score(cx, cy, m) {
			var s = 0, gx, gy, k, v;
			for (gy = 0; gy < 7; gy++) {
				for (gx = 0; gx < 7; gx++) {
					var ring = Math.max(Math.abs(gx - 3), Math.abs(gy - 3));
					var darkM = ring === 3 || ring === 0;
					v = sample(cx + (gx - 3) * m, cy + (gy - 3) * m);
					s += darkM ? (255 - v) : v;
				}
			}
			for (k = -4; k <= 4; k++) {
				s += 0.5 * sample(cx + k * m, cy - 4 * m) + 0.5 * sample(cx + k * m, cy + 4 * m);
				s += 0.5 * sample(cx - 4 * m, cy + k * m) + 0.5 * sample(cx + 4 * m, cy + k * m);
			}
			return s / 89;
		}
		var best = { x: cx0, y: cy0, m: m0, s: -1 };
		var m, cy, cx, s;
		for (m = m0 - 6; m <= m0 + 6; m += 0.5) {
			for (cy = cy0 - 25; cy <= cy0 + 25; cy += 2) {
				for (cx = cx0 - 25; cx <= cx0 + 25; cx += 2) {
					s = score(cx, cy, m);
					if (s > best.s) { best = { x: cx, y: cy, m: m, s: s }; }
				}
			}
		}
		for (m = best.m - 1; m <= best.m + 1; m += 0.25) {
			for (cy = best.y - 2; cy <= best.y + 2; cy += 0.5) {
				for (cx = best.x - 2; cx <= best.x + 2; cx += 0.5) {
					s = score(cx, cy, m);
					if (s > best.s) { best = { x: cx, y: cy, m: m, s: s }; }
				}
			}
		}
		return best;
	}

	function rSolveHomography(srcPts, dstPts) {
		var A = [], b = [];
		var i, c, r, piv, f;
		for (i = 0; i < 4; i++) {
			var x1 = dstPts[i].x, y1 = dstPts[i].y, x2 = srcPts[i].x, y2 = srcPts[i].y;
			A.push([x1, y1, 1, 0, 0, 0, -x2 * x1, -x2 * y1]); b.push(x2);
			A.push([0, 0, 0, x1, y1, 1, -y2 * x1, -y2 * y1]); b.push(y2);
		}
		var M = [];
		for (i = 0; i < 8; i++) { M.push(A[i].concat([b[i]])); }
		for (c = 0; c < 8; c++) {
			piv = c;
			for (r = c + 1; r < 8; r++) { if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) { piv = r; } }
			var tmpRow = M[c]; M[c] = M[piv]; M[piv] = tmpRow;
			for (r = 0; r < 8; r++) {
				if (r === c) { continue; }
				f = M[r][c] / M[c][c];
				for (i = c; i < 9; i++) { M[r][i] -= f * M[c][i]; }
			}
		}
		return M.map(function (row, idx) { return row[8] / row[idx]; });
	}

	var R_PPM = 16, R_MARGIN = 4;

	function rRobustQR(data, w, h) {
		var i;
		var gray = rGray(data, w, h);
		var norm = rNormalize(gray, w, h, Math.max(16, Math.round(w / 10)));
		// 1) Normalisiertes Vollbild (neue Binarisierung – bringt bei Schatten/Schräglicht oft den Treffer)
		var tN = rOtsu(norm);
		var binN = new Uint8Array(w * h);
		for (i = 0; i < w * h; i++) { binN[i] = norm[i] < tN ? 1 : 0; }
		var lumN = new Uint8ClampedArray(w * h);
		for (i = 0; i < w * h; i++) { lumN[i] = binN[i] ? 0 : 255; }
		var text = rZX(lumN, w, h);
		if (text) { return text; }
		var rgbaN = new Uint8ClampedArray(w * h * 4);
		for (i = 0; i < w * h; i++) {
			rgbaN[i*4] = rgbaN[i*4+1] = rgbaN[i*4+2] = lumN[i]; rgbaN[i*4+3] = 255;
		}
		text = rJSQR(rgbaN, w, h);
		if (text) { return text; }
		// 2) Finder-Muster erkennen
		var cands = rDetectFinders(norm, w, h);
		if (cands.length < 3) { return null; }
		var refined = [];
		for (i = 0; i < cands.length; i++) {
			var f = rRefineFinder(norm, w, h, cands[i].x, cands[i].y, cands[i].size / 7);
			if (f.s > 130) { refined.push(f); }
		}
		if (refined.length < 3) { return null; }
		function dist(p, q2) { return Math.hypot(p.x - q2.x, p.y - q2.y); }
		// 3) Gültige Finder-Dreiecke: längste Seite ≈ √2 × kurze Seiten (Perspektive-tolerant)
		var tris = [];
		for (var a = 0; a < refined.length; a++) {
			for (var b2 = a + 1; b2 < refined.length; b2++) {
				for (var c3 = b2 + 1; c3 < refined.length; c3++) {
					var p = refined[a], q = refined[b2], r = refined[c3];
					var s1 = dist(p, q), s2 = dist(p, r), s3 = dist(q, r);
					var mn = Math.min(s1, s2, s3), mx = Math.max(s1, s2, s3);
					var mid = s1 + s2 + s3 - mn - mx;
					if (mid > 0 && mx / mid >= 1.25 && mx / mid <= 1.60 && mx / mn >= 1.25 && mx / mn <= 1.60) {
						tris.push({ pts: [p, q, r], score: p.s + q.s + r.s });
					}
				}
			}
		}
		if (!tris.length) {
			tris.push({ pts: refined.slice(0, 3), score: 0 });
		}
		tris.sort(function (x, y) { return y.score - x.score; });
		var topTris = tris.slice(0, 4);

		function mkSrcAt(hh) {
			var h0 = hh[0], h1 = hh[1], h2 = hh[2], h3 = hh[3], h4 = hh[4], h5 = hh[5], h6 = hh[6], h7 = hh[7];
			return function (x, y) {
				var denom = h6 * x + h7 * y + 1;
				var sx = (h0 * x + h1 * y + h2) / denom;
				var sy = (h3 * x + h4 * y + h5) / denom;
				if (sx < 0 || sy < 0 || sx >= w - 1 || sy >= h - 1) { return 255; }
				var x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
				var i00 = y0 * w + x0;
				return norm[i00] * (1 - fx) * (1 - fy) + norm[i00 + 1] * fx * (1 - fy) +
					norm[i00 + w] * (1 - fx) * fy + norm[i00 + w + 1] * fx * fy;
			};
		}
		// 1-D-Modulgrößen-Suche (Phasen-ankern am TL-Zentrum = off – tötet die 0.5-Modul-Ambiguität)
		function rScaleTiming(srcAt, S) {
			var off = (3.5 + R_MARGIN) * R_PPM;
			var best = null;
			for (var s = 0.90; s <= 1.10001; s += 0.004) {
				var m = R_PPM * s;
				var varSum = 0;
				for (var r = 0; r < S; r++) {
					for (var c = 0; c < S; c++) {
						var xb = off + (c - 3) * m, yb = off + (r - 3) * m;
						var sum = 0, sum2 = 0;
						for (var j = -1; j <= 1; j++) {
							for (var ii = -1; ii <= 1; ii++) {
								var v = srcAt(xb + ii * 0.15 * m, yb + j * 0.15 * m);
								sum += v; sum2 += v * v;
							}
						}
						varSum += Math.max(0, sum2 / 9 - sum * sum / 81);
					}
				}
				var timing = 0, tn = 0;
				for (var c2 = 8; c2 < S - 8; c2++) {
					var vv = srcAt(off + (c2 - 3) * m, off + 3 * m);
					timing += ((c2 - 8) % 2 === 0) ? (255 - vv) : vv; tn++;
				}
				for (var r2 = 8; r2 < S - 8; r2++) {
					var vv2 = srcAt(off + 3 * m, off + (r2 - 3) * m);
					timing += ((r2 - 8) % 2 === 0) ? (255 - vv2) : vv2; tn++;
				}
				timing /= (tn * 255);
				var total = varSum - timing * 3.0 * tn * 255;
				if (!best || total < best.total) { best = { s: s, total: total, timing: timing }; }
			}
			return best;
		}
		// BR-Ecke: Position mit minimaler Gesamt-Intra-Modul-Varianz (subsampelt)
		function rBrSearch(TL, TR, BL, S) {
			var off = (3.5 + R_MARGIN) * R_PPM, Q = (S + R_MARGIN * 2) * R_PPM;
			var tl = { x: off, y: off }, tr = { x: Q - off, y: off };
			var brt = { x: Q - off, y: Q - off }, bl = { x: off, y: Q - off };
			var BR0 = { x: TR.x + BL.x - TL.x, y: TR.y + BL.y - TL.y };
			function varScoreForBR(br) {
				var src = mkSrcAt(rSolveHomography([TL, TR, br, BL], [tl, tr, brt, bl]));
				var total = 0;
				for (var r = 0; r < S; r += 2) {
					for (var c = 0; c < S; c += 2) {
						var xb = off + (c - 3) * R_PPM, yb = off + (r - 3) * R_PPM;
						var sum = 0, sum2 = 0;
						for (var j = -1; j <= 1; j++) {
							for (var ii = -1; ii <= 1; ii++) {
								var v = src(xb + ii * 0.15 * R_PPM, yb + j * 0.15 * R_PPM);
								sum += v; sum2 += v * v;
							}
						}
						total += Math.max(0, sum2 / 9 - sum * sum / 81);
					}
				}
				return total;
			}
			var bestBR = { br: BR0, sc: varScoreForBR(BR0) };
			var side = Math.hypot(TL.x - TR.x, TL.y - TR.y);
			var range = Math.max(24, side * 0.25);
			var dy, dx;
			for (dy = -range; dy <= range; dy += range / 4) {
				for (dx = -range; dx <= range; dx += range / 4) {
					var br = { x: BR0.x + dx, y: BR0.y + dy };
					var sc = varScoreForBR(br);
					if (sc < bestBR.sc) { bestBR = { br: br, sc: sc }; }
				}
			}
			var fb = bestBR.br;
			for (dy = -range / 4; dy <= range / 4; dy += range / 16) {
				for (dx = -range / 4; dx <= range / 4; dx += range / 16) {
					var br2 = { x: fb.x + dx, y: fb.y + dy };
					var sc2 = varScoreForBR(br2);
					if (sc2 < bestBR.sc) { bestBR = { br: br2, sc: sc2 }; }
				}
			}
			return bestBR.br;
		}

		for (var ti = 0; ti < topTris.length; ti++) {
			var pts = topTris[ti].pts;
			var p1 = pts[0], p2 = pts[1], p3 = pts[2];
			var d12 = dist(p1, p2), d13 = dist(p1, p3), d23 = dist(p2, p3);
			var longest = Math.max(d12, d13, d23);
			var TL, A, B;
			if (longest === d23) { TL = p1; A = p2; B = p3; }
			else if (longest === d13) { TL = p2; A = p1; B = p3; }
			else { TL = p3; A = p1; B = p2; }
			// Versions-Schätzung aus den Finder-Abständen (= S-7 Module)
			var e1 = dist(TL, A) / ((TL.m + A.m) / 2);
			var e2 = dist(TL, B) / ((TL.m + B.m) / 2);
			var estS = Math.round((e1 + e2) / 2) + 7;
			var Slist = [21, 25, 29, 33].sort(function (x, y) {
				return Math.abs(x - estS) - Math.abs(y - estS);
			}).slice(0, 2);
			var asg1 = { TR: A.y <= B.y ? A : B, BL: A.y <= B.y ? B : A };
			var asg2 = { TR: A.y <= B.y ? B : A, BL: A.y <= B.y ? A : B };
			var asgs = [asg1, asg2];
			for (var ai = 0; ai < 2; ai++) {
				var asg = asgs[ai];
				for (var si = 0; si < Slist.length; si++) {
					var S = Slist[si];
					var off = (3.5 + R_MARGIN) * R_PPM, Q = (S + R_MARGIN * 2) * R_PPM;
					var tl = { x: off, y: off }, tr = { x: Q - off, y: off };
					var brt = { x: Q - off, y: Q - off }, bl = { x: off, y: Q - off };
					var BR0 = { x: asg.TR.x + asg.BL.x - TL.x, y: asg.TR.y + asg.BL.y - TL.y };
					var hh0 = rSolveHomography([TL, asg.TR, BR0, asg.BL], [tl, tr, brt, bl]);
					var q0 = rScaleTiming(mkSrcAt(hh0), S);
					if (q0.timing < 0.70) { continue; } // Geometrie nicht plausibel – schnell überspringen
					var BR = rBrSearch(TL, asg.TR, asg.BL, S);
					var hh = rSolveHomography([TL, asg.TR, BR, asg.BL], [tl, tr, brt, bl]);
					var srcAt = mkSrcAt(hh);
					var q = rScaleTiming(srcAt, S);
					if (q.timing < 0.70) { continue; }
					var m = R_PPM * q.s;
					// Zeilen-Phasen-Feinabstimmung (Perspektive-Drift in den unteren Zeilen)
					var rowPhase = [];
					for (var r = 0; r < S; r++) {
						var yb = off + (r - 3) * m;
						var bp = 0, bs = 1e18;
						for (var ph = -0.3; ph <= 0.31; ph += 0.05) {
							var vsum = 0;
							for (var c = 0; c < S; c++) {
								var xb = off + (c - 3) * m + ph * m;
								var sum = 0, sum2 = 0;
								for (var j = -1; j <= 1; j++) {
									for (var ii = -1; ii <= 1; ii++) {
										var v = srcAt(xb + ii * 0.15 * m, yb + j * 0.15 * m);
										sum += v; sum2 += v * v;
									}
								}
								vsum += Math.max(0, sum2 / 9 - sum * sum / 81);
							}
							if (vsum < bs) { bs = vsum; bp = ph; }
						}
						rowPhase.push(bp);
					}
					var vals = [];
					for (r = 0; r < S; r++) {
						for (c = 0; c < S; c++) {
							var xb2 = off + (c - 3) * m + rowPhase[r] * m;
							var yb2 = off + (r - 3) * m;
							var vs = [];
							for (j = -1; j <= 1; j++) {
								for (ii = -1; ii <= 1; ii++) {
									vs.push(srcAt(xb2 + ii * 0.15 * m, yb2 + j * 0.15 * m));
								}
							}
							vs.sort(function (x, y) { return x - y; });
							vals.push(vs[4]);
						}
				}
					var tM = rOtsu(vals);
					var binM = vals.map(function (v) { return v < tM ? 1 : 0; });
					// Mit 4-Modul-Quiet-Zone rendern (ZXing braucht sie)
					var quiet = 4, sc2 = 10;
					var RQ = (S + quiet * 2) * sc2;
					var binRQ = new Uint8Array(RQ * RQ);
					for (r = 0; r < S; r++) {
						for (c = 0; c < S; c++) {
							var v2 = binM[r * S + c] ? 0 : 255;
							for (var dy3 = 0; dy3 < sc2; dy3++) {
								for (var dx3 = 0; dx3 < sc2; dx3++) {
									binRQ[((quiet + r) * sc2 + dy3) * RQ + (quiet + c) * sc2 + dx3] = v2 === 255 ? 0 : 1;
								}
							}
						}
				}
					var lumRQ = new Uint8ClampedArray(RQ * RQ);
					for (i = 0; i < RQ * RQ; i++) { lumRQ[i] = binRQ[i] ? 0 : 255; }
					text = rZX(lumRQ, RQ, RQ);
					if (text) { return text; }
					var rgbaRQ = new Uint8ClampedArray(RQ * RQ * 4);
					for (i = 0; i < RQ * RQ; i++) {
						rgbaRQ[i*4] = rgbaRQ[i*4+1] = rgbaRQ[i*4+2] = lumRQ[i]; rgbaRQ[i*4+3] = 255;
					}
					text = rJSQR(rgbaRQ, RQ, RQ);
					if (text) { return text; }
				}
			}
		}
		return null;
	}

	function robustDecode(source) {
		var dims = sourceDims(source);
		if (!dims) { return null; }
		try {
			var scale = Math.min(1, 800 / Math.max(dims.w, dims.h));
			var cw = Math.max(1, Math.floor(dims.w * scale));
			var ch = Math.max(1, Math.floor(dims.h * scale));
			var canvas = document.createElement('canvas');
			canvas.width = cw;
			canvas.height = ch;
			var ctx = canvas.getContext('2d', { willReadFrequently: true });
			ctx.drawImage(source, 0, 0, cw, ch);
			var data = ctx.getImageData(0, 0, cw, ch).data;
			return rRobustQR(data, cw, ch);
		} catch (e) {
			console.warn('[Lager] Robust-Pipeline-Fehler:', e);
			return null;
		}
	}

	function reportCode(code, status, format) {
		console.log('[Lager] ERKANNT (' + (format || '?') + '):', code);
		status.textContent = T('\u2705 Detected: ') + code + (format ? ' (' + format + ')' : '');
		stopCamera();
		lookupCode(code);
	}

	function handleDetectedCodes(codes, status) {
		for (var i = 0; i < codes.length; i++) {
			var code = (codes[i].rawValue || '').trim();
			var fmt = codes[i].format || '';
			if (isPlausibleCode(code, fmt)) {
				reportCode(code, status, formatLabel(fmt));
				return true;
			}
		}
		return false;
	}

	function scanImageFile(file) {
		var status = document.getElementById('lager-scan-status');
		status.textContent = T('Loading image \u2026');

		// 1. Versuch: html5-qrcode (ZXing mit geräteunabhängigem Decodier-Setup)
		var dec = getFileDecoder();
		if (dec && typeof dec.scanFile === 'function') {
			status.textContent = T('Scanning image \u2026');
			dec.scanFile(file, false).then(function (text) {
				if (text && text.trim()) {
					reportCode(text.trim(), status, 'html5-qrcode');
				} else {
					legacyImageScan(file, status);
				}
			}).catch(function () {
				// Kein Code via html5-qrcode – eigene Pipelines als Fallback
				legacyImageScan(file, status);
			});
			return;
		}
		legacyImageScan(file, status);
	}

	function legacyImageScan(file, status) {
		var url = URL.createObjectURL(file);
		var img = new Image();
		img.onload = function () {
			var handled = false;
			function notFound() {
				if (!handled) {
					status.textContent = T('No code found in the image \u2013 please use a clear photo of the code.');
				}
			}
			function tryRobust() {
				if (handled) { return; }
				status.textContent = T('Robust decoding (deskew) \u2026');
				var code = robustDecode(img);
				if (code) { handled = true; reportCode(code, status, 'Robust-QR'); } else { notFound(); }
			}
			function tryZxing() {
				if (handled) { return; }
				var code = decodeWithZxing(img);
				if (code) { handled = true; reportCode(code, status, 'ZXing'); } else { tryRobust(); }
			}
			var det = getDetector();
			if (det) {
				det.detect(img).then(function (codes) {
					if (!handleDetectedCodes(codes, status)) { tryZxing(); }
				}).catch(tryZxing);
			} else {
				tryZxing();
			}
			// Revokieren erst verzögert: Safari verliert das decodierte Bild teils,
			// wenn der Object-URL-Handle weg ist, während noch dekodiert wird.
			setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
		};
		img.onerror = function () {
			status.textContent = T('File could not be loaded as an image.');
			URL.revokeObjectURL(url);
		};
		img.src = url;
	}

	function stopCamera() {
		// html5-qrcode: Scanner stoppen (wenn aktiv) und Region räumen
		if (h5Scanner) {
			var st = h5ScannerState();
			// Html5QrcodeScannerState: SCANNING=2, PAUSED=3
			if (st === 2 || st === 3) {
				try { h5Scanner.stop().catch(function () {}); } catch (e) { /* ignore */ }
			}
			try { h5Scanner.clear().catch(function () {}); } catch (e) { /* ignore */ }
			h5Scanner = null;
		}
		var region = document.getElementById('html5-qrcode-region');
		if (region) { region.innerHTML = ''; }
	}

	// === Datei-Scanning via html5-qrcode (eigene Instanz, kein Konflikt mit Kamera) ===
	function getFileDecoder() {
		if (h5FileDecoder) { return h5FileDecoder; }
		if (typeof window.Html5Qrcode !== 'function') { return null; }
		try {
			h5FileDecoder = new window.Html5Qrcode('html5-file-decode', {
				formatsToSupport: getH5Formats()
			}, false);
		} catch (e) {
			h5FileDecoder = null;
		}
		return h5FileDecoder;
	}

	function lookupCode(code) {
		const resultDiv = document.getElementById('lager-scan-result');
		resultDiv.classList.remove('hidden');
		resultDiv.classList.remove('success', 'error');
		resultDiv.classList.add('busy');
		resultDiv.innerHTML = '';
		resultDiv.appendChild(el('div', 'scan-busy', T('Searching: ') + escapeHtml(code) + ' \u2026'));
		api('GET', '/scan/' + encodeURIComponent(code)).then(function (item) {
			resultDiv.innerHTML = '';
			resultDiv.classList.remove('busy');
			resultDiv.classList.add('success');
			const found = el('div', 'scan-found');
			found.innerHTML =
				'<div class="scan-found-code">' + escapeHtml(code) + '</div>' +
				'<div class="scan-found-name">' + escapeHtml(item.article) + '</div>' +
				'<div class="scan-found-meta">' + T('Location') + ': <strong>' + escapeHtml(item.slot_path) + '</strong></div>' +
				'<div class="scan-found-qty">' + T('Stock') + ': <span>' + item.quantity + '</span> ' + T('pcs') + '</div>' +
				(item.ean ? '<div class="scan-found-ean">EAN: ' + escapeHtml(item.ean) + '</div>' : '');
			const actions = el('div', 'scan-result-actions');
			const againBtn = el('button', 'btn', T('Scan again'));
			againBtn.type = 'button';
			againBtn.addEventListener('click', function () {
				resultDiv.classList.add('hidden');
				startCamera();
			});
			const gotoBtn = el('button', 'btn primary', T('Go to article'));
			gotoBtn.type = 'button';
			gotoBtn.addEventListener('click', function () {
				closeScanModal();
				api('GET', '/tree').then(function (locations) {
					const foundSlot = item.slot_id === null ? null : findSlot(locations, item.slot_id);
					const cabinet = foundSlot
						? { location: foundSlot.loc, cabinet: foundSlot.cab }
						: findCabinet(locations, item.cabinet_id);
					renderTree(locations);
					if (foundSlot) { selectSlot(foundSlot.slot); }
					else if (cabinet) {
						selectCabinet(cabinet.cabinet, document.querySelector('[data-cabinet-id="' + cabinet.cabinet.id + '"]'));
					}
				});
			});
			actions.appendChild(againBtn);
			actions.appendChild(gotoBtn);
			found.appendChild(actions);
			resultDiv.appendChild(found);
		}).catch(function () {
			resultDiv.innerHTML = '';
			resultDiv.classList.remove('busy');
			resultDiv.classList.add('error');
			resultDiv.appendChild(el('div', 'scan-found-code', code));
			resultDiv.appendChild(el('div', 'scan-notfound', T('No article found for this code \u2013 check the code manually below or create the article.')));
		});
	}

	function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

	// === QR / Code Display ===
	function showCode(item) {
		const modal = document.getElementById('lager-qr-modal');
		const content = document.getElementById('lager-qr-content');
		modal.classList.remove('hidden');
		content.innerHTML = '';
		const code = item.ean || item.article;
		// Generate QR code on canvas
		const canvas = document.createElement('canvas');
		canvas.width = 320; canvas.height = 320;
		canvas.style.width = '320px'; canvas.style.height = '320px';
		content.appendChild(canvas);
		drawQR(canvas, code);
		const label = el('div', 'qr-label', code);
		content.appendChild(label);
		if (item.ean) {
			const eanLabel = el('div', 'qr-ean', T('EAN:') + ' ' + item.ean);
			content.appendChild(eanLabel);
		}
		const artLabel = el('div', 'qr-article', item.article);
		content.appendChild(artLabel);
	}

	// Minimal QR code generator (byte mode, error correction level M)
		// Real QR code generation using qrcode-generator library
	function drawQR(canvas, text) {
		var ctx = canvas.getContext('2d');
		var size = canvas.width;
		// Generate QR code
		var qr = qrcode(0, 'M'); // type number 0 (auto), error correction M
		qr.addData(text);
		qr.make();
		var modules = qr.getModuleCount();
		var cellSize = Math.floor(size / (modules + 4)); // +4 for quiet zone
		var offset = Math.floor((size - modules * cellSize) / 2);

		// White background
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, size, size);

		// Black modules
		ctx.fillStyle = '#000';
		for (var row = 0; row < modules; row++) {
			for (var col = 0; col < modules; col++) {
				if (qr.isDark(row, col)) {
					ctx.fillRect(
						offset + col * cellSize,
						offset + row * cellSize,
						cellSize,
						cellSize
					);
				}
			}
		}
	}

// === Shopping list ===
	function openShoppingListModal() {
		const overlay = openModal({ title: T('Shopping list') });
		const modal = overlay.querySelector('.modal');
		modal.classList.add('shopping-list-modal');
		const content = el('div', 'shopping-list-content', T('Loading \u2026'));
		modal.insertBefore(content, modal.querySelector('.modal-buttons'));
		api('GET', '/stock/shopping-list').then(function (items) {
			content.innerHTML = '';
			if (!items.length) {
				content.appendChild(el('div', 'stock-empty', T('No items below minimum stock.')));
				return;
			}
			const table = el('table', 'stock-table shopping-list-table');
			const thead = document.createElement('thead');
			const header = document.createElement('tr');
			[T('Article'), T('Quantity'), T('Minimum stock'), T('To buy'), T('Storage place')].forEach(function (label) {
				header.appendChild(el('th', null, label));
			});
			thead.appendChild(header);
			table.appendChild(thead);
			const tbody = document.createElement('tbody');
			items.forEach(function (item) {
				const row = document.createElement('tr');
				row.appendChild(el('td', null, item.article));
				row.appendChild(el('td', 'qty', String(item.quantity)));
				row.appendChild(el('td', 'qty', String(item.minimum_quantity)));
				row.appendChild(el('td', 'qty', String(item.needed_quantity)));
				row.appendChild(el('td', null, item.slot_path));
				tbody.appendChild(row);
			});
			table.appendChild(tbody);
			content.appendChild(table);
		}).catch(function (error) {
			content.textContent = error.message;
		});
	}

// === History ===
	function openHistoryModal() {
		const modal = openModal({ title: T('Movement history') });
		const content = el('div', 'history-content');
		const m = modal.querySelector('.modal');
		m.insertBefore(content, m.querySelector('.modal-buttons'));
		content.textContent = T('Loading \u2026');
		api('GET', '/movement/history?limit=50').then(function (items) {
			content.innerHTML = '';
			if (!items.length) { content.appendChild(el('div', 'stock-empty', T('No movements.'))); return; }
			const table = el('table', 'stock-table history-table');
			const thead = document.createElement('thead');
			const hr = document.createElement('tr');
			[T('Date'), T('Type'), T('Article'), T('Quantity'), T('Location'), T('User')].forEach(function (h) { hr.appendChild(el('th', null, h)); });
			thead.appendChild(hr);
			table.appendChild(thead);
			const tbody = document.createElement('tbody');
			items.forEach(function (item) {
				const tr = document.createElement('tr');
				tr.appendChild(el('td', null, new Date(item.created_at * 1000).toLocaleString('de-DE')));
				const typeTd = el('td', item.type === 'in' ? 'type-in' : 'type-out', item.type === 'in' ? '+ ' + T('In') : '\u2212 ' + T('Out'));
				tr.appendChild(typeTd);
				const artTd = document.createElement('td');
				if (item.has_image) {
					const img = document.createElement('img');
					img.className = 'stock-thumb';
					// Cache-Busting (wie in der Fach-Ansicht)
					img.src = API + '/stock/' + item.id + '/image?v=' + (item.updated_at || Date.now());
					img.alt = '';
					img.title = T('Show photo');
					img.style.cursor = 'pointer';
					img.addEventListener('error', function () { img.remove(); });
					img.addEventListener('click', function (ev) { ev.stopPropagation(); showImageModal(item); });
					artTd.appendChild(img);
				}
				artTd.appendChild(document.createTextNode(item.article));
				tr.appendChild(artTd);
				tr.appendChild(el('td', 'qty', String(item.quantity)));
				tr.appendChild(el('td', null, item.location_name + ' / ' + item.cabinet_name + ' / ' + item.slot_name));
				tr.appendChild(el('td', null, item.user || ''));
				tbody.appendChild(tr);
			});
			table.appendChild(tbody);
			content.appendChild(table);
		}).catch(function (e) { content.textContent = e.message; });
	}

	// === Foto per Kamera aufnehmen (getUserMedia, Rueckkamera) ===
	function openPhotoCapture(onFile) {
		const app = document.getElementById('app-content');
		const overlay = el('div', 'modal-overlay');
		const modal = el('div', 'modal');
		modal.appendChild(el('h2', null, T('Take photo')));
		const status = el('div', 'scan-status', T('Starting camera \u2026'));
		const video = document.createElement('video');
		video.autoplay = true;
		video.muted = true;
		video.playsInline = true;
		video.setAttribute('playsinline', '');
		video.className = 'lager-capture-video';
		const buttons = el('div', 'modal-buttons');
		modal.appendChild(status);
		modal.appendChild(video);
		modal.appendChild(buttons);
		overlay.appendChild(modal);
		let stream = null;
		function close() {
			if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
			if (document.body.contains(overlay)) { overlay.remove(); }
		}
		const cancelBtn = el('button', 'btn', T('Cancel'));
		cancelBtn.type = 'button';
		cancelBtn.addEventListener('click', close);
		buttons.appendChild(cancelBtn);
		const snapBtn = el('button', 'btn primary', '\u{1F4F8} ' + T('Capture'));
		snapBtn.type = 'button';
		buttons.insertBefore(snapBtn, cancelBtn);
		overlay.addEventListener('click', function (e) { if (e.target === overlay) { close(); } });
		app.appendChild(overlay);

		if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
			status.textContent = T('Camera not supported in this browser. Use file selection instead.');
			return;
		}
		navigator.mediaDevices.getUserMedia({
			video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
			audio: false
		}).then(function (s) {
			stream = s;
			video.srcObject = s;
			status.classList.add('hidden');
		}).catch(function (err) {
			status.textContent = T('Camera error: ') + (err && err.message ? err.message : err);
		});

		snapBtn.addEventListener('click', function () {
			if (!video.videoWidth) { return; }
			const canvas = document.createElement('canvas');
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			canvas.getContext('2d').drawImage(video, 0, 0);
			canvas.toBlob(function (blob) {
				if (!blob) { return; }
				close();
				onFile(new File([blob], 'foto-' + Date.now() + '.jpg', { type: 'image/jpeg' }));
			}, 'image/jpeg', 0.92);
		});
	}

	// === Modal helpers ===
	function openModal(opts) {
		const overlay = el('div', 'modal-overlay');
		const modal = el('div', 'modal');
		modal.appendChild(el('h2', null, opts.title));
		const buttons = el('div', 'modal-buttons');
		const closeBtn = el('button', 'btn', T('Close'));
		closeBtn.type = 'button';
		closeBtn.addEventListener('click', function () { overlay.remove(); });
		buttons.appendChild(closeBtn);
		modal.appendChild(buttons);
		overlay.appendChild(modal);
		overlay.addEventListener('click', function (e) { if (e.target === overlay) { overlay.remove(); } });
		document.getElementById('app-content').appendChild(overlay);
		return overlay;
	}

	function openFormModal(opts) {
		const overlay = openModal({ title: opts.title });
		const modal = overlay.querySelector('.modal');
		const form = document.createElement('form');
		const errorDiv = el('div', 'modal-error');
		const inputs = {};
		(opts.fields || []).forEach(function (f) {
			const field = el('div', 'field');
			const label = el('label', null, f.label);
			const input = document.createElement('input');
			input.type = f.type === 'number' ? 'number' : 'text';
			if (f.required) { input.required = true; }
			if (f.min !== undefined) { input.min = String(f.min); }
			if (f.value !== undefined) { input.value = f.value; }
			if (f.placeholder) { input.placeholder = f.placeholder; }
			inputs[f.name] = input;
			field.appendChild(label);
			field.appendChild(input);
			form.appendChild(field);
		});
		if (opts.file) {
			const imgField = el('div', 'field');
			const imgLabel = el('label', null, opts.file.label);
			const row = el('div', 'lager-file-row');
			// Versteckte Inputs: Kamera (Rueckseite) und Datei
			const camInput = document.createElement('input');
			camInput.type = 'file';
			camInput.accept = 'image/*';
			camInput.setAttribute('capture', 'environment');
			camInput.className = 'lager-file-input-hidden';
			const fileInput = document.createElement('input');
			fileInput.type = 'file';
			fileInput.accept = 'image/*';
			fileInput.className = 'lager-file-input-hidden';
			// Shim: Submit-Logik liest .files[0]
			const imageState = { files: [] };
			inputs._image = imageState;
			const preview = el('img', 'lager-file-preview hidden');
			const nameSpan = el('span', 'lager-file-name');
			// Bestehendes Foto des Artikels direkt im Formular anzeigen,
			// damit ersichtlich ist, dass ein Foto gespeichert ist.
			if (opts.file.existingUrl) {
				preview.src = opts.file.existingUrl;
				preview.classList.remove('hidden');
				nameSpan.textContent = T('Existing photo');
			}
			function setSelectedFile(f) {
				if (imageState.files[0] && imageState.files[0]._url) { URL.revokeObjectURL(imageState.files[0]._url); }
				if (f) {
					f._url = URL.createObjectURL(f);
					imageState.files = [f];
					preview.src = f._url;
					preview.classList.remove('hidden');
					nameSpan.textContent = f.name || T('Photo');
				} else {
					imageState.files = [];
					preview.classList.add('hidden');
					nameSpan.textContent = '';
				}
			}
			function setImage(srcInput) {
				setSelectedFile(srcInput.files && srcInput.files[0]);
			}
			camInput.addEventListener('change', function () { setImage(camInput); });
			fileInput.addEventListener('change', function () { setImage(fileInput); });
			const camBtn = el('button', 'btn', '\u{1F4F7} ' + T('Take photo'));
			camBtn.type = 'button';
			camBtn.title = T('Take a photo with the rear camera');
			camBtn.addEventListener('click', function () {
				// Echte Kamera via getUserMedia; nur wenn das nicht geht
				// (z.B. kein getUserMedia), Fallback auf capture-Input/Dateiauswahl.
				openPhotoCapture(function (file) { setSelectedFile(file); }, function () { camInput.click(); });
			});
			const fileBtn = el('button', 'btn', '\u{1F4C1} ' + T('Choose file \u2026'));
			fileBtn.type = 'button';
			fileBtn.addEventListener('click', function () { fileInput.click(); });
			row.appendChild(camBtn);
			row.appendChild(fileBtn);
			row.appendChild(camInput);
			row.appendChild(fileInput);
			imgField.appendChild(imgLabel);
			imgField.appendChild(row);
			imgField.appendChild(preview);
			imgField.appendChild(nameSpan);
			form.appendChild(imgField);
		}
		form.appendChild(errorDiv);
		modal.insertBefore(form, modal.querySelector('.modal-buttons'));
		const submitBtn = el('button', 'btn primary', T('Save'));
		submitBtn.type = 'button';
		modal.querySelector('.modal-buttons').insertBefore(submitBtn, modal.querySelector('.modal-buttons').firstChild);
		submitBtn.addEventListener('click', function () { form.requestSubmit(); });
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			const values = {};
			(Object.keys(inputs)).forEach(function (k) {
				if (k === '_image') { values[k] = inputs[k].files && inputs[k].files[0]; return; }
				values[k] = inputs[k].value;
			});
			submitBtn.disabled = true;
			errorDiv.textContent = '';
			Promise.resolve()
				.then(function () { return opts.onSubmit(values); })
				.then(function () { overlay.remove(); toast(T('Saved.')); })
				.catch(function (err) { errorDiv.textContent = err.message || T('Unexpected error.'); submitBtn.disabled = false; });
		});
	}

	function confirmAction(message, actionFn, onDone) {
		const overlay = openModal({ title: T('Confirm') });
		const modal = overlay.querySelector('.modal');
		const p = el('p', null, message);
		modal.appendChild(p);
		const buttons = modal.querySelector('.modal-buttons');
		const yes = el('button', 'btn primary', T('Yes, delete'));
		yes.type = 'button';
		yes.addEventListener('click', function () {
			yes.disabled = true;
			Promise.resolve().then(function () { return actionFn(); })
				.then(function () {
					overlay.remove();
					toast(T('Deleted.'));
					if (onDone) {
						loadTree();
						return onDone();
					}
					selectedCabinet = null;
					selectedSlot = null;
					clearSlotDetail();
					updateAddArticleState(T('Select a location.'));
					return loadTree();
				})
				.catch(function (err) { overlay.remove(); toast(err.message, true); });
		});
		buttons.insertBefore(yes, buttons.firstChild);
	}

	function toast(message, isError) {
		let node = document.getElementById('lager-toast');
		if (!node) { node = document.createElement('div'); node.id = 'lager-toast'; document.body.appendChild(node); }
		node.textContent = message;
		node.classList.toggle('error', Boolean(isError));
		node.classList.remove('hidden');
		if (node._timer) { clearTimeout(node._timer); }
		node._timer = setTimeout(function () { node.classList.add('hidden'); }, 3500);
	}

	function closeModals() { document.querySelectorAll('.modal-overlay').forEach(function (o) { o.remove(); }); }

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
