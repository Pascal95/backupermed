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
            allowNull: true
        },
        signature:{
            type: DataTypes.STRING,
            allowNull: true
        },
        idFicheMere:{
            type: DataTypes.INTEGER,
            allowNull: true
        },
        numSS:{
            type: DataTypes.STRING,
            allowNull: true
        },
        TransportDispo:{
            type: DataTypes.INTEGER,
            allowNull:true
        },
        Valide: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
    }, {
    // Options du modèle
    sequelize, // instance de connexion
    modelName: 'ficheuser', // nom du modèle
    tableName: 'USR_Fiche', // nom de la table dans la base de données
    timestamps: false // désactive la gestion automatique des timestamps par Sequelize
    })
    FicheUser.associate = (models) => {
        FicheUser.hasMany(models.BonTransport, {
          foreignKey: 'idFichePatient',
          as: 'bonsTransport'
        });
        FicheUser.hasOne(models.FichePermis, {
            foreignKey: 'idFiche',
            as: 'permis'
        });
        FicheUser.hasOne(models.FicheVehicule, {
            foreignKey: 'idFiche',
            as: 'vehicule'
        });
      };
      
  return FicheUser;
};