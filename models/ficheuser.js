const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class FicheUser extends Model {}
    FicheUser.init({
        idFiche: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
          },
        nom:{
            type: DataTypes.STRING,
            allowNull: false
        },
        prenom:{
            type: DataTypes.STRING,
            allowNull: false
        },
        adresse:{
            type: DataTypes.STRING,
            allowNull: false
        },
        ville:{
            type: DataTypes.STRING,
            allowNull: false
        },
        codepostal:{
            type: DataTypes.STRING,
            allowNull: false
        },
        mailcontact:{
            type: DataTypes.STRING,
            allowNull: false
        },
        telephone:{
            type: DataTypes.STRING,
            allowNull: false
        },
        role:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        idCNX:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        signature:{
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
    // Options du modèle
    sequelize, // instance de connexion
    modelName: 'ficheuser', // nom du modèle
    tableName: 'USR_Fiche', // nom de la table dans la base de données
    timestamps: false // désactive la gestion automatique des timestamps par Sequelize
    })
  return FicheUser;
};