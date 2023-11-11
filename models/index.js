const { Sequelize } = require('sequelize');
const setupUserModel = require('./users');

// Créez une nouvelle instance de Sequelize pour se connecter à votre base de données
const sequelize = new Sequelize('UperMed', 'richard', 'richard', {
  host: '162.19.75.199',
  dialect: 'mysql', // ou 'mysql', 'sqlite', 'mariadb', 'mssql'
});

// Initialisez vos modèles ici
const User = setupUserModel(sequelize);

// Synchronisez tous les modèles avec la base de données
sequelize.sync();

module.exports = {
  sequelize, // l'instance de connexion
  User // le modèle exporté
};