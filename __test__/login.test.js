const request = require('supertest');
const app = require('../app');  // Remplace par le chemin de ton fichier app.js
const { User, FicheUser } = require('../models');  // Mock ton modèle User
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { sequelize } = require('../models');

let server;
beforeAll((done) => {
  server = app.listen(0, () => done()); // Laisse le système choisir un port libre
});

afterAll(async () => {
    await sequelize.close();  // Fermer la connexion Sequelize
  });

jest.mock('../models');  // Mock du modèle User

describe('POST /api/users/login', () => {

    beforeEach(() => {
      jest.clearAllMocks();  // Nettoie les mocks avant chaque test
    });
  
    it('should return a token if credentials are valid', async () => {
      // Mocker l'utilisateur dans User
      const mockUser = {
        id: 1,
        email: 'correct@uper.fr',
        password: await bcrypt.hash('Password95!', 10),  // Simuler un mot de passe haché
      };
  
      User.findOne.mockResolvedValue(mockUser);  // Simuler que l'utilisateur existe dans User
  
      // Simuler la correspondance dans FicheUser
      const mockFicheUser = {
        idFiche: 1,
        role: 1,  // Exemple de rôle
      };
      
      FicheUser.findOne.mockResolvedValue(mockFicheUser);  // Simuler que la fiche existe dans FicheUser
  
      // Simuler la validation du mot de passe
      bcrypt.compare = jest.fn().mockResolvedValue(true);
  
      // Faire la requête de test
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'correct@uper.fr',
          password: 'Password95!',
        });
  
      // Vérifier la réponse
      expect(response.status).toBe(200);  // Le statut devrait être 200 OK
      expect(response.body.token).toBeDefined();  // Le token doit être présent dans la réponse
    });
  
    it('should return 401 if email does not exist', async () => {
      // Simuler qu'aucun utilisateur n'est trouvé
      User.findOne.mockResolvedValue(null);
  
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'wrong@test.com',
          password: 'SomePassword123!',
        });
  
      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Email ou mot de passe incorrect");
    });
  
    it('should return 401 if password is incorrect', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: await bcrypt.hash('ValidPassword123!', 10),  // Simuler un mot de passe valide
      };
  
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);  // Simuler que le mot de passe est incorrect
  
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@test.com',
          password: 'WrongPassword!',
        });
  
      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Email ou mot de passe incorrect");
    });
  
    it('should return 500 if there is a server error', async () => {
      User.findOne.mockRejectedValue(new Error('Server error'));  // Simuler une erreur du serveur
  
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'correct@uper.fr',
          password: 'Password95!',
        });
  
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Server error');
    });
  });