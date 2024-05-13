const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Reservation extends Model {}
  Reservation.init({
        idReservation: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        idClient:{
            type: DataTypes.INTEGER,
            allowNull: true
        },
        idTaxi:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        AdresseDepart:{
            type: DataTypes.STRING,
            allowNull: false
        },
        AdresseArrive:{
            type: DataTypes.STRING,
            allowNull: false
        },
        Distance:{
            type: DataTypes.FLOAT,
            allowNull: false
        },
        DureeTrajet:{
            type: DataTypes.TIME,
            allowNull: false
        },
        HeureConsult:{
            type: DataTypes.DATE,
            allowNull: false
        },
        HeureDepart:{
            type: DataTypes.DATE,
            allowNull: false
        },
        AllerRetour:{
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        DureeConsult:{
            type: DataTypes.TIME,
            allowNull: true
        },
        pecPMR:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        Etat:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        bonTransportPath:{
            type: DataTypes.STRING,
            allowNull: true
        },
    },{
        // Options du modèle
        sequelize, // instance de connexion
        modelName: 'Reservation', // nom du modèle
        tableName: 'Reservation', // nom de la table dans la base de données
        timestamps: false // désactive la gestion automatique des timestamps par Sequelize
    })
    Reservation.associate = (models) => {
        Reservation.belongsTo(
            models.FicheUser, { 
                foreignKey: 'idTaxi', as: 'Taxi' 
            }
        );
        Reservation.belongsTo(
            models.FicheUser, { 
                foreignKey: 'idClient', as: 'Client' 
            }
        );
    }
    return Reservation;
}