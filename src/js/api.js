const API = (() => {
	const BASE = './php/api.php';

	async function request(method, params = {}) {
		const url = new URL(BASE, window.location.origin);
		if (method === 'GET') {
			Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
			const res = await fetch(url.toString(), { method: 'GET' });
			return res.json();
		}
		const res = await fetch(url.toString(), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(params)
		});
		return res.json();
	}

	async function createBoard(initialData) {
		return request('POST', { action: 'create', data: initialData });
	}

	async function loadBoard(id) {
		return request('GET', { action: 'load', id });
	}

	async function saveBoard(id, data) {
		return request('POST', { action: 'save', id, data });
	}

	async function listBoards() {
		return request('GET', { action: 'list' });
	}

	return { createBoard, loadBoard, saveBoard, listBoards };
})(); 