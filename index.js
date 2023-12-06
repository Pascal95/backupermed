const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, FicheUser, FicheVehicule, FichePermis, Reservation, BonTransport} = require('./models');
const crypto = require('crypto');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const cors = require('cors');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Le chemin où les fichiers seront sauvegardés
  },
  filename: function (req, file, cb) {
    // Conserver l'extension d'origine du fichier
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

//CONSTANTE
const __ROLE_SUPERVISEUR__ = 1
const __ROLE_TAXI__ = 3
const __ROLE_MEDECIN__ = 4
const __ROLE_UTILISATEUR__ = 5
const __ROLE_SANSCOMPTE__ = 6 


const upload = multer({ storage: storage });

const app = express();
app.use(cors());
app.use(express.json());

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


//Fonction

//Envoie email
async function sendEmail(recipient, subject, text) {
  let transporter = nodemailer.createTransport({
      host: 'smtp-mail.outlook.com', // Remplacez par l'adresse de votre serveur SMTP
      port: 587,
      secure: false, // true pour 465, false pour les autres ports
      auth: {
          user: 'richardshht@hotmail.fr', // votre adresse email
          pass: '3D2bd6f8' // votre mot de passe email
      }
  });
  try {
    let info = await transporter.sendMail({
      from: '"UperMed" <richardshht@hotmail.fr>', // adresse d'envoi
      to: recipient, // liste des destinataires
      subject: subject, // Sujet
      text: text, // corps du mail en texte brut
      // html: "<b>Hello world?</b>" // corps du mail en HTML (optionnel)
  });

  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email: ", error);
        throw error;
  }

}

const pad = (number) => (number < 10 ? '0' + number : number);
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return `${year}${month}${day}${hour}${minute}${second}`;
};
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
        const dateTime = formatDate(new Date());
        const link = "http://localhost:3000/InscriptionEtape/?info=" + dateTime + newUser.id
        const message = "Bonjour, vous etes en train de vous inscrire sur le site UperMed pour continuer l'inscription veuillez suivre le lien suivant : " + link
        await sendEmail(email,"Inscription", message)
        res.status(201).json({ message: "User created successfully", userId: newUser.id });
    } catch (error) {
        res.status(400).json({ error: error.message });
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
      numSS,
      TransportDispo:0
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



// Endpoint pour récupérer profil utilisateur
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

app.get('/api/users/mesusers', authenticateToken,async (req,res) =>{
  try{
    const listeUser = await FicheUser.findAll({
      where:{
        idFicheMere:req.user.idFiche
      }
    })
    res.status(201).json({listeUser});
  }catch (error){
    res.status(500).json({ error: error.message });
  }

})


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


// Endpoint pour creer une reservation
app.post('/api/reservation/newreservation', authenticateToken, async (req,res) => {

  try{
    const {idClient, idTaxi, AdresseDepart, AdresseArrive, Distance, DureeTrajet, HeureConsult, HeureDepart, AllerRetour, DureeConsult} = req.body

    const newReservation = await Reservation.create({
      idClient, 
      idTaxi, 
      AdresseDepart, 
      AdresseArrive, 
      Distance, 
      DureeTrajet, 
      HeureConsult, 
      HeureDepart, 
      AllerRetour, 
      DureeConsult
    })
    res.status(201).json({ message: "Reservation crée avec succès", idReservation: newReservation.idReservation });
  } catch (error){
    res.status(400).json({ error: error.message });
  }
})

// Endpoint pour voir les reservations
app.get('/api/reservation/resafortaxi', authenticateToken, async (req,res) => {
  if (req.user.role == __ROLE_TAXI__) {
    try{
      const user = await FicheUser.findByPk(req.user.idFiche);
      const maintenant = new Date()
      const reservations = await Reservation.findAll({
        where:{
          idTaxi:user.idFiche,
          HeureConsult: {
            [Op.gt]:maintenant
          }
        }
      })
      res.status(201).json({reservations});
    } catch(error){
      res.status(400).json({ error: error.message });
    }
  } else{
    res.status(400).json({ error: "L'utilisateur n'a pas les droits necessaire" });
  }

})

app.get('/api/reservation/resaforclient', authenticateToken, async (req,res) =>{
  if (req.user.role == __ROLE_UTILISATEUR__) {
    try{
      const user = await FicheUser.findByPk(req.user.idFiche);
      const maintenant = new Date()
      const reservations = await Reservation.findAll({
        where:{
          idClient:user.idFiche,
          HeureConsult: {
            [Op.gt]:maintenant
          }
        }
      })
      res.status(201).json({reservations});
    } catch(error){
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "L'utilisateur n'a pas les droits necessaire" });
  }

})

//Endpoint pour deposer des bons de transport
app.post('/api/bon/bonfromcli',authenticateToken ,upload.single('pdf'), async (req,res) => {
  if(req.user.role == __ROLE_UTILISATEUR__){
    try{
      const file = req.file;
      const filePath = file.path + ".pdf";
      const {dateEmission, drPrescripteur} = req.body
      const idFichePatient = req.user.idFiche
      const bon = await BonTransport.create(
        { 
          idFichePatient:idFichePatient
          ,drPrescripteur:drPrescripteur
          ,dateEmission:dateEmission
          ,ficBon:filePath
        })
      res.status(201).json({ message: "Bon déposé avec succès", idBon: bon.idBon });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }else {
    res.status(400).json({ error: "L'utilisateur n'a pas les droits necessaire" });
  }

})

app.post('/api/bon/bonfrommedecin', authenticateToken, upload.single('pdf'), async (req, res) => {
if(req.user.role == __ROLE_MEDECIN__){
  try{
    const file = req.file;
    const filePath = file.path + ".pdf";
    const {dateEmission, drPrescripteur, idFichePatient} = req.body
    const bon = await BonTransport.create(
      { 
        idFichePatient:idFichePatient
        ,drPrescripteur:drPrescripteur
        ,dateEmission:dateEmission
        ,ficBon:filePath
      })
    res.status(201).json({ message: "Bon déposé avec succès", idBon: bon.idBon });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}else {
  res.status(400).json({ error: "L'utilisateur n'a pas les droits necessaire" });
}
})


app.post('/api/users/addTransport', authenticateToken, async (req,res) =>{
  if(req.user.role == __ROLE_SUPERVISEUR__){
    try{
      const {idFiche, transport} = req.body;
      const Fiche = await FicheUser.increment(
        {TransportDispo:transport},
        {where:{
          idFiche:idFiche
        }})
      res.status(201).json({ message: "Nombre de transport correctement ajouté"});
    }catch(error){
      res.status(400).json({ error: error.message });
    }
  } else{
    res.status(400).json({ error: "Vous ne possédez pas les droits necessaire" });
  }

})





const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

