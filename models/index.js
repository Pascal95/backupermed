const { Sequelize } = require('sequelize');
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
    timezone: 'Etc/GMT-2', // ou 'Europe/Paris'
  },
  timezone: '+02:00',
});

// Initialisez vos modèles ici
const User = setupUserModel(sequelize);
const FicheUser = setupFicheUserModel(sequelize);
const FicheVehicule = setupFicheVehiculeModel(sequelize);
const FichePermis = setupFichePermisModel(sequelize);
const Reservation = setupReservation(sequelize)
const BonTransport = setupBonTransport(sequelize);
const Message = setupMessage(sequelize);
const Jour = setupJour(sequelize);
const Disponibilite = setupDisponibilite(sequelize);


FicheUser.associate({ FichePermis, BonTransport, FicheVehicule, Disponibilite, Message, Reservation });
FichePermis.associate({ FicheUser });
FicheVehicule.associate({ FicheUser });
BonTransport.associate({ FicheUser });
Disponibilite.associate({ FicheUser, Jour });
Message.associate({ FicheUser });
Reservation.associate({ FicheUser });

// Synchronisez tous les modèles avec la base de données
sequelize.sync();

module.exports = {
  sequelize, // l'instance de connexion
  User,
  FicheUser,
  FicheVehicule,
  FichePermis,
  Reservation,
  BonTransport,
  Message,
  Disponibilite,
  Jour
};