const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class FicheVehicule extends Model {}
  FicheVehicule.init({
        idVehicule: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
          },
        Marque:{
            type: DataTypes.STRING,
            allowNull: false
        },
        Modele:{
            type: DataTypes.STRING,
            allowNull: false
        },
        Annee:{
            type: DataTypes.STRING,
            allowNull: false
        },
        numImmatriculation:{
            type: DataTypes.STRING,
            allowNull: false
        },
        numSerie:{
            type: DataTypes.STRING,
            allowNull: true
        },
        ficVehicule:{
            type: DataTypes.STRING,
            allowNull: true
        },
        idFiche:{
            type: DataTypes.INTEGER,
            allowNull: false
        },

    },{
        // Options du modèle
        sequelize, // instance de connexion
        modelName: 'FicheVehicule', // nom du modèle
        tableName: 'Vehicule', // nom de la table dans la base de données
        timestamps: false // désactive la gestion automatique des timestamps par Sequelize
    })
    FicheVehicule.associate = (models) => {
        FicheVehicule.belongsTo(models.FicheUser, {
            foreignKey: 'idFiche',
            as: 'utilisateur'
        });
    };
    return FicheVehicule;
}