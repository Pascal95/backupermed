const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();
const setupUserModel = require('./users');
const setupFicheUserModel = require ('./ficheuser')
const setupFicheVehiculeModel = require ('./fichevehicule')
const setupFichePermisModel = require ('./fichepermis')
const setupReservation = require ('./reservation')
const setupBonTransport = require ('./BonTransport')
const setupMessage = require ('./Message')
const setupDisponibilite = require ('./Disponibilite')
const setupJour = require ('./Jour')


// Créez une nouvelle instance de Sequelize pour se connecter à votre base de données
const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  dialectOptions: {
    charset: 'utf8mb4',  // Assurez-vous d'utiliser utf8mb4
    timezone: 'Etc/GMT-2',
  },
  timezone: '+02:00',
});

// Initialisez vos modèles ici
const models = {
  User: setupUserModel(sequelize, DataTypes),
  FicheUser: setupFicheUserModel(sequelize, DataTypes),
  FicheVehicule: setupFicheVehiculeModel(sequelize, DataTypes),
  FichePermis: setupFichePermisModel(sequelize, DataTypes),
  Reservation: setupReservation(sequelize, DataTypes),
  BonTransport: setupBonTransport(sequelize, DataTypes),
  Message: setupMessage(sequelize, DataTypes),
  Jour: setupJour(sequelize, DataTypes),
  Disponibilite: setupDisponibilite(sequelize, DataTypes),
};

Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

// Synchronisez tous les modèles avec la base de données
sequelize.sync();

module.exports = {
  sequelize,
  ...models,
};