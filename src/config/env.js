require('dotenv').config({ path: './.env' });

module.exports = {
  PORT: process.env.PORT,
  DB_URI: process.env.DB_URI,
}
