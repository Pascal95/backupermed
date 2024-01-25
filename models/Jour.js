const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class Jour extends Model {}
    Jour.init({
        idJour: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nomJour: {
            type: DataTypes.STRING,
            allowNull: false
        }
    },{
        // Options du modèle
        sequelize, // instance de connexion
        modelName: 'Jour', // nom du modèle
        tableName: 'Jour', // nom de la table dans la base de données
        timestamps: false // désactive la gestion automatique des timestamps par Sequelize
    },
    )
    Jour.associate = (models) => {
        Jour.hasMany(models.Jour, { foreignKey: 'idJour' });
    };
    return Jour;
}