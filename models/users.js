const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {}

  User.init({
    // Le modèle "User" avec ses champs définis ici
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: "Must be a valid email address",
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true
    },
    datecreation: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    derniereconnexion: {
      type: DataTypes.DATE
    },
    resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    USR_KEY: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    // Options du modèle
    sequelize, // instance de connexion
    modelName: 'User', // nom du modèle
    tableName: 'CNX_Utilisateur', // nom de la table dans la base de données
    timestamps: false // désactive la gestion automatique des timestamps par Sequelize
  });

  return User;
};