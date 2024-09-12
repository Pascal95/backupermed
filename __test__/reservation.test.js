// __tests__/reservation.test.js

const request = require('supertest');
const app = require('../app');  // Remplace par ton fichier app.js
const { Reservation, FicheUser } = require('../models');  // Mock des modèles
const { authenticateToken } = require('../middlewares/auth');
let server;
beforeAll((done) => {
  server = app.listen(0, () => done()); // Laisse le système choisir un port libre
});

afterAll((done) => {
  server.close(done);
});
jest.mock('../models');  // Mock des modèles
jest.mock('../middlewares/auth');  // Mock du middleware d'authentification

describe('POST /api/reservation/newreservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();  // Nettoie les mocks avant chaque test
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { idFiche: 1, role: 'user' };  // Simule un utilisateur authentifié
      next();
    });
  });

  it('should create a new reservation and return 201', async () => {
    // Mock pour FicheUser
    const mockUser = {
      idFiche: 1,
      nom: 'Test',
      prenom: 'User'
    };
    FicheUser.findByPk.mockResolvedValue(mockUser);

    // Mock pour la création de réservation
    Reservation.create.mockResolvedValue({ idReservation: 1 });

    const response = await request(server)
      .post('/api/reservation/newreservation')
      .set('Authorization', 'Bearer validtoken')
      .send({
        AdresseDepart: 'Address 1',
        AdresseArrive: 'Address 2',
        Distance: 10,
        DureeTrajet: '00:30:00',
        HeureConsult: '2023-09-10T10:00:00',
        HeureDepart: '2023-09-10T09:30:00',
        AllerRetour: 0,
        DureeConsult: 1,
        idFicheUser: 1,
        pecPMR: 0
      });

    expect(response.status).toBe(201);
    expect(response.body.idReservation).toBeDefined();
  });

  it('should return 404 if user is not found', async () => {
    FicheUser.findByPk.mockResolvedValue(null);  // Simule que l'utilisateur n'existe pas

    const response = await request(server)
      .post('/api/reservation/newreservation')
      .set('Authorization', 'Bearer validtoken')
      .send({
        AdresseDepart: 'Address 1',
        AdresseArrive: 'Address 2',
        Distance: 10,
        DureeTrajet: '00:30:00',
        HeureConsult: '2023-09-10T10:00:00',
        HeureDepart: '2023-09-10T09:30:00',
        AllerRetour: 0,
        DureeConsult: 1,
        idFicheUser: 999,  // Utilisateur inexistant
        pecPMR: 0
      });

    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe("USER_NOT_FOUND");
  });

  it('should return 500 if there is a server error', async () => {
    FicheUser.findByPk.mockRejectedValue(new Error('Server error'));  // Simule une erreur serveur

    const response = await request(server)
      .post('/api/reservation/newreservation')
      .set('Authorization', 'Bearer validtoken')
      .send({
        AdresseDepart: 'Address 1',
        AdresseArrive: 'Address 2',
        Distance: 10,
        DureeTrajet: '00:30:00',
        HeureConsult: '2023-09-10T10:00:00',
        HeureDepart: '2023-09-10T09:30:00',
        AllerRetour: 0,
        DureeConsult: 1,
        idFicheUser: 1,
        pecPMR: 0
      });

    expect(response.status).toBe(500);
    expect(response.body.errorCode).toBe("SERVER_ERROR");
  });
});