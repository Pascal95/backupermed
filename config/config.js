require('dotenv').config();  // Charge les variables d'environnement à partir du fichier .env

module.exports = {
  development: {
    username: process.env.DB_USERNAME || 'upermed',  // Par défaut 'root' si non défini
    password: process.env.DB_PASSWORD || 'hardpassword',    // Par défaut null si non défini
    database: process.env.DB_DATABASE || 'UperMed',
    host: process.env.DB_HOST || '51.178.82.36',
    dialect: 'mysql'
  },
  test: {
    username: process.env.DB_USERNAME || 'upermed',  // Par défaut 'root' si non défini
    password: process.env.DB_PASSWORD || 'hardpassword',    // Par défaut null si non défini
    database: process.env.DB_DATABASE || 'UperMed',
    host: process.env.DB_HOST || '51.178.82.36',
    dialect: 'mysql'
  },
  production: {
    username: process.env.DB_USERNAME || 'upermed',  // Par défaut 'root' si non défini
    password: process.env.DB_PASSWORD || 'hardpassword',    // Par défaut null si non défini
    database: process.env.DB_DATABASE || 'UperMed',
    host: process.env.DB_HOST || '51.178.82.36',
    dialect: 'mysql'
  }
};