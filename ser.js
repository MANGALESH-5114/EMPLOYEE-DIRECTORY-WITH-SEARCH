const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Hardcoded users for demo login
const users = [
  { username: 'admin', password: 'admin123' },
  { username: 'user', password: 'user123' }
];

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid username or password' });
  }
});

// Setup SQLite DB
const db = new sqlite3.Database('./employees.db', err => {
  if (err) {
    console.error('DB connection error:', err.message);
  } else {
    console.log('Connected to SQLite DB.');
  }
});

// Create employees table if not exists
db.run(`CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL
)`);

// Get employees with optional search
app.get('/employees', (req, res) => {
  const search = req.query.search;
  let sql = 'SELECT * FROM employees';
  let params = [];

  if (search) {
    sql += ' WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(department) LIKE ?';
    const s = `%${search.toLowerCase()}%`;
    params = [s, s, s];
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add employee
app.post('/employees', (req, res) => {
  const { name, email, department } = req.body;
  if (!name || !email || !department) {
    return res.status(400).json({ error: 'Name, email, and department are required.' });
  }
  const sql = 'INSERT INTO employees (name, email, department) VALUES (?, ?, ?)';
  db.run(sql, [name, email, department], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email must be unique.' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, message: 'Employee added successfully.' });
  });
});

// Delete employee by id
app.delete('/employees/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM employees WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Employee not found.' });
    res.json({ message: 'Employee deleted successfully.' });
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
