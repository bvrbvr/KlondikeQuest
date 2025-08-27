// Simple Express backend to store and serve game results
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'results.json');

app.use(cors());
app.use(express.json());

function ensureDataFile() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
	if (!fs.existsSync(DATA_FILE)) {
		fs.writeFileSync(DATA_FILE, JSON.stringify({ results: [] }, null, 2), 'utf8');
	}
}

function readResults() {
	ensureDataFile();
	try {
		const raw = fs.readFileSync(DATA_FILE, 'utf8');
		return JSON.parse(raw).results || [];
	} catch (e) {
		return [];
	}
}

function writeResults(results) {
	ensureDataFile();
	fs.writeFileSync(DATA_FILE, JSON.stringify({ results }, null, 2), 'utf8');
}

app.get('/api/health', (req, res) => {
	res.json({ status: 'ok' });
});

app.post('/api/results', (req, res) => {
	const { userId, username, time, moves, date } = req.body || {};
	if (typeof time !== 'number' || typeof moves !== 'number') {
		return res.status(400).json({ error: 'Invalid payload' });
	}
	const entry = {
		id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
		userId: userId || null,
		username: username || null,
		time,
		moves,
		date: date || new Date().toISOString()
	};
	const results = readResults();
	results.push(entry);
	writeResults(results);
	res.json({ ok: true, entry });
});

app.get('/api/stats', (req, res) => {
	const results = readResults();
	const totalGames = results.length;
	const bestTime = totalGames ? Math.min(...results.map(r => r.time)) : null;
	const bestMoves = totalGames ? Math.min(...results.map(r => r.moves)) : null;
	const averageTime = totalGames ? Math.round(results.reduce((s, r) => s + r.time, 0) / totalGames) : null;
	const averageMoves = totalGames ? Math.round(results.reduce((s, r) => s + r.moves, 0) / totalGames) : null;
	const last10 = results.slice(-10).reverse();
	res.json({ totalGames, bestTime, bestMoves, averageTime, averageMoves, last10 });
});

app.listen(PORT, () => {
	ensureDataFile();
	console.log(`Results API running on http://localhost:${PORT}`);
});


