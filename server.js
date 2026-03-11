const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.warn(
    'DATABASE_URL не задан. Установите переменную окружения для подключения к Supabase Postgres.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function initDb() {
  // включаем расширение для UUID (в Supabase обычно уже доступно)
  await pool.query('create extension if not exists "pgcrypto";');

  await pool.query(`
    create table if not exists campaigns (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      name text not null,
      description text,
      is_active boolean not null default true
    );
  `);

  await pool.query(`
    create table if not exists applications (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      campaign_id uuid references campaigns(id) on delete set null,
      player_name text not null,
      contact text not null,
      experience_level text not null default 'newbie',
      character_idea text,
      preferred_time text not null,
      systems text[],
      comment_for_dm text,
      status text not null default 'new',
      dm_notes text
    );
  `);
}

initDb().catch((err) => {
  console.error('DB init error:', err);
});

app.get('/api/applications', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `select
         id,
         created_at as "createdAt",
         player_name as "playerName",
         contact,
         experience_level as "experienceLevel",
         character_idea as "characterIdea",
         preferred_time as "preferredTime",
         systems,
         comment_for_dm as comments,
         status,
         dm_notes as "dmNotes"
       from applications
       order by created_at desc`
    );

    const applications = rows.map((row) => ({
      ...row,
      systems: Array.isArray(row.systems) ? row.systems : [],
    }));

    res.json(applications);
  } catch (err) {
    console.error('DB read error:', err);
    res
      .status(500)
      .json({ error: 'Не удалось прочитать заявки из базы данных' });
  }
});

app.post('/api/applications', async (req, res) => {
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

  const systemsArray = Array.isArray(systems) ? systems : [];

  try {
    const result = await pool.query(
      `insert into applications
         (player_name, contact, experience_level, character_idea, preferred_time, systems, comment_for_dm)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning
         id,
         created_at as "createdAt",
         player_name as "playerName",
         contact,
         experience_level as "experienceLevel",
         character_idea as "characterIdea",
         preferred_time as "preferredTime",
         systems,
         comment_for_dm as comments,
         status,
         dm_notes as "dmNotes"`,
      [
        playerName,
        contact,
        experienceLevel || 'newbie',
        characterIdea || '',
        preferredTime,
        systemsArray,
        comments || '',
      ]
    );

    const row = result.rows[0];
    const application = {
      ...row,
      systems: Array.isArray(row.systems) ? row.systems : [],
    };

    res.status(201).json(application);
  } catch (err) {
    console.error('DB insert error:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      table: err.table,
    });
    res.status(500).json({
      error: 'Не удалось сохранить заявку в базе данных',
      dbError: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

app.listen(PORT, () => {
  console.log(`DND application app listening on http://localhost:${PORT}`);
});

