require('dotenv').config();
const db = require('mysql');

const pool = db.createPool({
  host: process.env.DBHOST,
  user: process.env.DBUSER,
  password: process.env.DBPASS,
  database: process.env.DBNAME,
  port: process.env.DBPORT,
  connectionLimit: 10,
}); 

module.exports = pool;