const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class BonTransport extends Model {}
  BonTransport.init({
    idBon: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    drPrescripteur: {
        type: DataTypes.STRING,
        allowNull: true
    },
    dateEmission: {
        type: DataTypes.DATE,
        allowNull: true
    },
    ficBon: {
        type: DataTypes.STRING,
        allowNull: false
    },

    },{
    // Options du modèle
    sequelize, // instance de connexion
    modelName: 'BonTransport', // nom du modèle
    tableName: 'BonTransport', // nom de la table dans la base de données
    timestamps: false // désactive la gestion automatique des timestamps par Sequelize
})
return BonTransport;
}