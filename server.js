const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const url = require('url');

const app = express();
const port = process.env.PORT || 3036;
app.use(cors());

// Configure bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up multer for file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); // Destination folder
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname); // Original file name
    }
  })
});

// Parse MySQL connection URL
const connectionString = 'mysql://u5bllw5tghu7gkdl:Njk37F9D90pqJka3JUCF@ba0we8fazujvwl2esalb-mysql.services.clever-cloud.com:3306/ba0we8fazujvwl2esalb';
const dbUrl = new URL(connectionString);

const db = mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.split('/')[1],
  port: dbUrl.port,
});

db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
});

// Function to format date to MySQL DATETIME format
const formatDateToMySQL = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

// API endpoint to upload files
app.post('/api/upload', upload.single('file'), (req, res) => {
  const { file, body } = req;

  if (!file || !body.name || !body.random_number) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { originalname: fileName } = file;
  const { name, random_number } = body;
  const date = formatDateToMySQL(new Date()); // Format the current date to MySQL DATETIME format

  const query = 'INSERT INTO files (name, file, random_number, date) VALUES (?, ?, ?, ?)';
  const values = [name, fileName, random_number, date];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Error saving file data to database' });
    }

    res.status(200).json({
      message: 'File uploaded successfully!',
      random_number: random_number // Include the random number in the response
    });
  });
});

// API endpoint to retrieve all files
app.get('/api/files', (req, res) => {
  const query = 'SELECT * FROM files';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Error fetching file data from database' });
    }

    res.status(200).json(results);
  });
});

// API endpoint to search files by random number
app.get('/api/files/search', (req, res) => {
  const { random_number } = req.query;

  if (!random_number) {
    return res.status(400).json({ error: 'Random number query parameter is required' });
  }

  const query = 'SELECT * FROM files WHERE random_number = ?';
  
  db.query(query, [random_number], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Error fetching file data from database' });
    }

    res.status(200).json(results);
  });
});

// Serve static files (optional, for example purposes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
