<?php
// Simple JSON-file backed API for Stickadoodle
// Actions: create, load, save, list

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	echo json_encode(['ok' => true]);
	exit;
}

$action = null;
$input = null;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
	$action = isset($_GET['action']) ? $_GET['action'] : null;
} else {
	$raw = file_get_contents('php://input');
	$input = json_decode($raw, true);
	$action = isset($input['action']) ? $input['action'] : null;
}

$storageDir = __DIR__ . '/data';
if (!is_dir($storageDir)) {
	mkdir($storageDir, 0777, true);
}

function respond($data, $status = 200) {
	http_response_code($status);
	echo json_encode($data);
	exit;
}

function sanitize_id($id) {
	return preg_replace('/[^a-zA-Z0-9_-]/', '', $id);
}

function new_id() {
	return 'b_' . base_convert((int)(microtime(true) * 1000), 10, 36) . '_' . substr(bin2hex(random_bytes(4)), 0, 6);
}

switch ($action) {
	case 'create':
		$data = isset($input['data']) ? $input['data'] : null;
		$id = new_id();
		$file = $storageDir . '/' . $id . '.json';
		if ($data === null) {
			$data = [
				'meta' => [ 'title' => 'Stickadoodle', 'teamName' => '' ],
				'columns' => [ 'todo' => [], 'inprogress' => [], 'done' => [] ]
			];
		}
		file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
		respond(['ok' => true, 'id' => $id, 'data' => $data]);
		break;
	case 'load':
		$id = isset($_GET['id']) ? sanitize_id($_GET['id']) : null;
		if (!$id) respond(['ok' => false, 'error' => 'Missing id'], 400);
		$file = $storageDir . '/' . $id . '.json';
		if (!file_exists($file)) respond(['ok' => false, 'error' => 'Not found'], 404);
		$json = file_get_contents($file);
		$data = json_decode($json, true);
		respond(['ok' => true, 'id' => $id, 'data' => $data]);
		break;
	case 'save':
		$id = isset($input['id']) ? sanitize_id($input['id']) : null;
		$data = isset($input['data']) ? $input['data'] : null;
		if (!$id || $data === null) respond(['ok' => false, 'error' => 'Missing id or data'], 400);
		$file = $storageDir . '/' . $id . '.json';
		file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
		respond(['ok' => true]);
		break;
	case 'list':
		$boards = [];
		foreach (glob($storageDir . '/*.json') as $file) {
			$id = basename($file, '.json');
			$json = @file_get_contents($file);
			$data = $json ? json_decode($json, true) : null;
			$title = isset($data['meta']['title']) ? $data['meta']['title'] : 'Untitled';
			$team = isset($data['meta']['teamName']) ? $data['meta']['teamName'] : '';
			$updatedAt = filemtime($file);
			$boards[] = [
				'id' => $id,
				'title' => $title,
				'teamName' => $team,
				'updatedAt' => $updatedAt
			];
		}
		usort($boards, function($a, $b) { return $b['updatedAt'] - $a['updatedAt']; });
		respond(['ok' => true, 'boards' => $boards]);
		break;
	default:
		respond(['ok' => false, 'error' => 'Unknown action'], 400);
} 