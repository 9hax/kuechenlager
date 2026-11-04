(function () {
	'use strict';

	const form = document.getElementById('kuechenlager-webhook-settings');
	if (!form) {
		return;
	}

	form.addEventListener('submit', function (event) {
		event.preventDefault();
		const status = document.getElementById('kuechenlager-webhook-status');
		const button = form.querySelector('button[type="submit"]');
		const body = new URLSearchParams(new FormData(form));
		button.disabled = true;
		status.textContent = '';

		fetch(form.dataset.saveUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'RequestToken': OC.requestToken,
			},
			body: body.toString(),
		}).then(function (response) {
			return response.json().then(function (data) {
				if (!response.ok) {
					throw new Error(data.error || status.dataset.error);
				}
				status.textContent = status.dataset.saved;
			});
		}).catch(function (error) {
			status.textContent = error.message || status.dataset.error;
		}).finally(function () {
			button.disabled = false;
		});
	});
})();
