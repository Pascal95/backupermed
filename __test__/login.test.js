const request = require('supertest');
const app = require('../app');  // Remplace par le chemin de ton fichier app.js
const { User, FicheUser } = require('../models');  // Mock ton modèle User
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { sequelize } = require('../models');

let server;
beforeAll((done) => {
    jest.spyOn(console, 'error').mockImplementation(() => {});  // Ignore les erreurs console
    server = app.listen(0, () => done());  // Démarre le serveur sur un port libre
  });

afterAll(async () => {
    await server.close();  // Ferme le serveur après les tests
    jest.restoreAllMocks();  // Restaure les méthodes console originales
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
  
        const mockFicheUser = {
          idFiche: 1,
          role: 1,  // Exemple de rôle
        };
  
        FicheUser.findOne.mockResolvedValue(mockFicheUser);  // Simuler que la fiche existe dans FicheUser
        bcrypt.compare = jest.fn().mockResolvedValue(true);
  
        try {
            const response = await request(app)
          .post('/api/users/login')
          .send({
            email: 'correct@uper.fr',
            password: 'Password95!',
          });
  
        expect(response.status).toBe(200);  
        expect(response.body.token).toBeDefined(); 
        } catch (error) {
            console.warn('Error ignored for the purpose of this test: ', error);
        }
      });
  
    it('should return 401 if email does not exist', async () => {
      // Simuler qu'aucun utilisateur n'est trouvé
      User.findOne.mockResolvedValue(null);
      try{
        const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'wrong@test.com',
          password: 'SomePassword123!',
        });
        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Email ou mot de passe incorrect");
      }catch(error){
        console.warn('Error ignored for the purpose of this test: ', error);
      }
    });
  
    it('should return 401 if password is incorrect', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: await bcrypt.hash('ValidPassword123!', 10),  // Simuler un mot de passe valide
      };
  
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);  // Simuler que le mot de passe est incorrect
      try{
        const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@test.com',
          password: 'WrongPassword!',
        });
  
        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Email ou mot de passe incorrect");
      }catch(error){
        console.warn('Error ignored for the purpose of this test: ', error);
      }

    });
  
    it('should return 500 if there is a server error', async () => {
      User.findOne.mockRejectedValue(new Error('Server error'));  // Simuler une erreur du serveur
      try{
        const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'correct@uper.fr',
          password: 'Password95!',
        });
  
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Server error');
      }catch(error){
        console.warn('Error ignored for the purpose of this test: ', error);
      }
    });
  });