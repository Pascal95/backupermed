const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class FichePermis extends Model {}
    FichePermis.init({
        idPermis: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        numPermis:{
            type: DataTypes.STRING,
            allowNull: false
        },
        dateDel:{
            type: DataTypes.DATE,
            allowNull: false
        },
        dateExpi:{
            type: DataTypes.DATE,
            allowNull: false
        },
        ficPermis:{
            type: DataTypes.STRING,
            allowNull: true
        },
        idFiche:{
            type: DataTypes.INTEGER,
            allowNull: false
        }
        },{
        // Options du modèle
        sequelize, // instance de connexion
        modelName: 'FichePermis', // nom du modèle
        tableName: 'PermisTaxi', // nom de la table dans la base de données
        timestamps: false // désactive la gestion automatique des timestamps par Sequelize
        })
        FichePermis.associate = (models) => {
            FichePermis.belongsTo(models.FicheUser, {
                foreignKey: 'idFiche',
                as: 'permis'
            });
        };
    return FichePermis;
}