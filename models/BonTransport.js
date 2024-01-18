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
    idFichePatient: {
        type: DataTypes.INTEGER,
        allowNull: true
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
    Valide: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    },{
    // Options du modèle
    sequelize, // instance de connexion
    modelName: 'BonTransport', // nom du modèle
    tableName: 'BonTransport', // nom de la table dans la base de données
    timestamps: false // désactive la gestion automatique des timestamps par Sequelize
    });
  // Association avec FicheUser
  BonTransport.associate = function(models) {
    BonTransport.belongsTo(models.FicheUser, {
      foreignKey: 'idFichePatient',
      as: 'ficheuser' // Assurez-vous que cet alias est utilisé dans vos requêtes
    });
  };
return BonTransport;
}