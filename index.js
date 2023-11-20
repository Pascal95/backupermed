const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, FicheUser, FicheVehicule, FichePermis } = require('./models');
const crypto = require('crypto');
const { Op } = require('sequelize');

const app = express();

app.use(express.json());

// Endpoint pour l'inscription
app.post('/api/users/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            email,
            password: hashedPassword,
            datecreation: new Date(),
        });
        res.status(201).json({ message: "User created successfully", userId: newUser.id });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Endpoint pour la connexion
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        
        await user.update({ derniereconnexion: new Date() });
        const fiche = await FicheUser.findOne({where: {idCNX: user.id}})
        const token = jwt.sign({ idFiche: fiche.idFiche }, 'secretKey', { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Middleware pour authentifier le token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, 'secretKey', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Endpoint pour récupérer le profil utilisateur
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const user = await FicheUser.findByPk(req.user.idFiche);
        res.json({ 
          nom: user.nom, 
          prenom: user.prenom, 
          adresse: user.adresse, 
          ville: user.ville, 
          codepostal: user.codepostal,
          mailcontact: user.mailcontact,
          telephone: user.telephone,
          role: user.role
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Demande MDP oublié
app.post('/api/users/forgot-password', async (req, res) => {
    const { email } = req.body;
    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(20).toString('hex');
    // Définir une date d'expiration pour le token
    const resetExpires = Date.now() + 3600000; // 1 heure à partir de maintenant
  
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(400).json({ message: "No account with that email address exists." });
      }
  
      // Mettez à jour l'utilisateur avec le token de réinitialisation et la date d'expiration
      await user.update({
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      });
  
      // Envoyer l'email
      const resetUrl = `http://yourfrontend.com/reset-password?token=${resetToken}`;
      // Ici, intégrez une bibliothèque d'envoi d'emails comme nodemailer pour envoyer l'email
  
      res.json({ message: "An e-mail has been sent to " + email + " with further instructions. link: "+ resetUrl });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
// MDP oublié
  app.post('/api/users/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: {
            [Op.gt]: Date.now() // Sequelize Op.gt pour vérifier que la date d'expiration est dans le futur
          }
        }
      });
  
      if (!user) {
        return res.status(400).json({ message: "Password reset token is invalid or has expired." });
      }
  
      // Hash du nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // Mettre à jour le mot de passe de l'utilisateur
      await user.update({
        password: hashedPassword,
        resetPasswordToken: null, // Effacez le token de réinitialisation
        resetPasswordExpires: null // Effacez la date d'expiration du token
      });
  
      // Envoyer une confirmation de la réinitialisation du mot de passe
      // Ici, intégrez une bibliothèque d'envoi d'emails comme nodemailer pour envoyer l'email de confirmation
  
      res.json({ message: "Your password has been updated." });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

app.post('/api/users/ficheuser', async (req,res) => {
  try {
    const {nom, prenom, adresse, ville, codepostal, mailcontact, telephone, role, idCNX, signature, idFicheMere, numSS} = req.body;
    const newFiche = await FicheUser.create({
      nom,
      prenom, 
      adresse, 
      ville, 
      codepostal, 
      mailcontact, 
      telephone, 
      role, 
      idCNX, 
      signature,
      idFicheMere,
      numSS
    })
    res.status(201).json({ message: "Fiche utilisateur crée avec succès", ficheId: newFiche.idFiche });
  } catch (error) {
    res.status(400).json({ error: error.message });
}});


app.post('/api/users/fichevehicule', async (req,res) => {
  try {
    const {Marque, Modele, Annee, numImmatriculation, numSerie, ficVehicule, idFiche} = req.body;

    const newFicheVehicule = await FicheVehicule.create({
      Marque, Modele, Annee, numImmatriculation, numSerie, ficVehicule, idFiche
    })
    res.status(201).json({ message: "Fiche vehicule crée avec succès", ficheVehiculeId: newFicheVehicule.idVehicule });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
})

app.post('/api/users/fichepermis', async (req,res) =>{
  try {
    const {numPermis, dateDel, dateExpi, ficPermis, idFiche} = req.body;
    const newFichePermis = await FichePermis.create({
      numPermis, dateDel, dateExpi, ficPermis, idFiche
    })
    res.status(201).json({ message: "Fiche permis crée avec succès", fichePermisId: newFichePermis.idVehicule });
  } catch (error){
    res.status(400).json({ error: error.message });
  }
})

app.post('/api/reservation/newreservation', authenticateToken, async (req,res) => {
  
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

