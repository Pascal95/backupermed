const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class Disponibilite extends Model {}
    Disponibilite.init({
        idDisponibilite: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        idJour: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Jour', // nom de la table
                key: 'idJour'
            }
        },
        idTaxi:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        HeureDebutMatin: {
            type: DataTypes.TIME,
            allowNull: true
        },
        HeureFinMatin: {
            type: DataTypes.TIME,
            allowNull: true
        },
        HeureDebutApresMidi: {
            type: DataTypes.TIME,
            allowNull: true
        },
        HeureFinApresMidi: {
            type: DataTypes.TIME,
            allowNull: true
        },
    },{
        // Options du modèle
        sequelize, // instance de connexion
        modelName: 'Disponibilite', // nom du modèle
        tableName: 'Disponibilite', // nom de la table dans la base de données
        timestamps: false // désactive la gestion automatique des timestamps par Sequelize
    },
    )
    Disponibilite.associate = function(models) {
        // Assurez-vous que 'FicheUser' et 'Jour' sont correctement définis dans 'models'
        Disponibilite.belongsTo(models.FicheUser, {
            foreignKey: 'idTaxi',
            as: 'ficheuser'
        });
        Disponibilite.belongsTo(models.Jour, {
            foreignKey: 'idJour'
            // Pas besoin de 'as' si vous n'utilisez pas d'alias spécifique
        });
    };
    return Disponibilite;
}