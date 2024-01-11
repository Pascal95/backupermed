const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class Message extends Model {}
    Message.init({
        idMessage: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        idFiche:{
            type: DataTypes.INTEGER,
            allowNull: true
        },
        Objet: {
            type: DataTypes.STRING,
            allowNull: true
        },
        Message: {
            type: DataTypes.STRING,
            allowNull: true
        },
    },{
        // Options du modèle
        sequelize, // instance de connexion
        modelName: 'Message', // nom du modèle
        tableName: 'Message', // nom de la table dans la base de données
        timestamps: false // désactive la gestion automatique des timestamps par Sequelize
    })
    return Message;
}