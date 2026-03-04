const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'applications.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация базы данных SQLite и таблицы заявок
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      player_name TEXT NOT NULL,
      contact TEXT NOT NULL,
      experience_level TEXT,
      character_idea TEXT,
      preferred_time TEXT NOT NULL,
      systems TEXT,
      comments TEXT
    )`
  );
});

app.get('/api/applications', (req, res) => {
  db.all(
    'SELECT id, created_at as createdAt, player_name as playerName, contact, experience_level as experienceLevel, character_idea as characterIdea, preferred_time as preferredTime, systems, comments FROM applications ORDER BY created_at DESC',
    (err, rows) => {
      if (err) {
        console.error('DB read error:', err);
        return res
          .status(500)
          .json({ error: 'Не удалось прочитать заявки из базы данных' });
      }

      const applications = rows.map((row) => ({
        ...row,
        systems: row.systems ? JSON.parse(row.systems) : [],
      }));

      res.json(applications);
    }
  );
});

app.post('/api/applications', (req, res) => {
  const {
    playerName,
    contact,
    experienceLevel,
    characterIdea,
    preferredTime,
    systems,
    comments,
  } = req.body || {};

  if (!playerName || !contact || !preferredTime) {
    return res
      .status(400)
      .json({ error: 'Поля Имя, Контакты и Время игры обязательны' });
  }

  const createdAt = new Date().toISOString();
  const systemsJson = JSON.stringify(Array.isArray(systems) ? systems : []);

  db.run(
    `INSERT INTO applications (created_at, player_name, contact, experience_level, character_idea, preferred_time, systems, comments)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      createdAt,
      playerName,
      contact,
      experienceLevel || 'newbie',
      characterIdea || '',
      preferredTime,
      systemsJson,
      comments || '',
    ],
    function (err) {
      if (err) {
        console.error('DB insert error:', err);
        return res
          .status(500)
          .json({ error: 'Не удалось сохранить заявку в базе данных' });
      }

      const application = {
        id: this.lastID,
        createdAt,
        playerName,
        contact,
        experienceLevel: experienceLevel || 'newbie',
        characterIdea: characterIdea || '',
        preferredTime,
        systems: JSON.parse(systemsJson),
        comments: comments || '',
      };

      res.status(201).json(application);
    }
  );
});

app.listen(PORT, () => {
  console.log(`DND application app listening on http://localhost:${PORT}`);
});

