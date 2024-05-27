const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, FicheUser, FicheVehicule, FichePermis, Reservation, BonTransport, Message, Disponibilite, Jour} = require('./models');
const crypto = require('crypto');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { sequelize } = require('./models');
require('dotenv').config();
const moment = require('moment');
const fs = require('fs-extra');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const archiver = require('archiver');


// Configuration de storage Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      // Détermination du dossier de base en fonction de la présence d'une clé ou du type de fichier
      let baseFolder = 'uploads';
      let specificFolder = req.body.key || 'default';  // Utilisation de 'default' si aucune clé n'est spécifiée

      // Logique spéciale pour 'BonTransport'
      if (file.fieldname === 'BonTransport' && !req.body.key) {
          specificFolder = 'BonTransport';
      }

      const uploadPath = path.join(__dirname, baseFolder, specificFolder);

      // Assure la création du dossier s'il n'existe pas
      fs.ensureDir(uploadPath)
          .then(() => cb(null, uploadPath))
          .catch(err => cb(err));
  },
  filename: function (req, file, cb) {
      const timestamp = Date.now();
      const fileExt = path.extname(file.originalname);
      let prefix = 'file';

      // Nom de fichier spécifique pour 'BonTransport'
      if (file.fieldname === 'BonTransport') {
          const idReservation = req.body.idReservation; // Assurez-vous que cet ID est passé dans le corps de la requête
          prefix = `bon_transport_${timestamp}_${idReservation}`;
      } else {
          prefix = `${file.fieldname}-${timestamp}`;
      }

      const filename = `${prefix}${fileExt}`;
      cb(null, filename);
  }
});


const fileFilter = (req, file, cb) => {
  // Accepter uniquement certains types de fichiers, y compris les PDF
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const isAccepted = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

  if (isAccepted) {
      cb(null, true);
  } else {
      cb(new Error('Unallowed file type'), false);
  }
};


const limits = {
  fileSize: 1024 * 1024 * 5 // 5 MB limit
};

// Middleware Multer pour gérer l'upload des fichiers
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits
});
// const storage = multer.memoryStorage(); // ou multer.diskStorage({ destination: 'chemin/vers/dossier/des/uploads', })



//CONSTANTE
const __ROLE_SUPERVISEUR__ = 1
const __ROLE_TAXI__ = 3
const __ROLE_MEDECIN__ = 4
const __ROLE_UTILISATEUR__ = 5
const __ROLE_SANSCOMPTE__ = 6 

const __ETAT_CONFIRME__ = 1
const __ETAT_ENATTENTE__ = 2
const __ETAT_ANNULE__ = 3




const app = express();
app.use(cors());
app.use(express.json());



// Middleware pour authentifier le token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.AUTH_TOKEN, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
  });
}

function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return next(); // Continue sans vérifier le token
  }

  jwt.verify(token, process.env.AUTH_TOKEN, (err, user) => {
    if (err) {
      console.log('Token invalid:', err.message);
      return res.sendStatus(403); // Token invalide
    }

    req.user = user;
    next();
  });
}

//Fonction

function genererChaineAlphanumeriqueAleatoire(longueur) {
  const caracteresPossibles = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let resultat = '';
  for (let i = 0; i < longueur; i++) {
      const indexAleatoire = Math.floor(Math.random() * caracteresPossibles.length);
      resultat += caracteresPossibles[indexAleatoire];
  }
  return resultat;
}

//Envoie email
async function sendEmail(recipient, replacements) {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD // ou votre mot de passe d'application si l'authentification à deux facteurs est activée
    }
  });

  fs.readFile("./email/template.html", 'utf8', async (err, htmlContent) => {
    if (err) {
        console.error("Erreur lors de la lecture du fichier HTML :", err);
        return;
    }

    // Remplacement des placeholders par les valeurs réelles
    let customizedHtmlContent = htmlContent
        .replace(/\[OBJET\]/g, replacements.objet)
        .replace(/\[MESSAGE\]/g, replacements.message)
        .replace(/\[NOM\]/g, replacements.nom);

    try {
        let info = await transporter.sendMail({
            from: '"UperMed" <'+process.env.MAIL_USER+'>',
            to: recipient,
            subject: replacements.objet,
            html: customizedHtmlContent
        });

        console.log("Email envoyé avec succès :", info.messageId);
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email :", error);
    }
  });

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

app.post('/api/test/email', async (req, res) => {
  const { email, objet, message, nom } = req.body;

  const replacements = {
      objet,
      message,
      nom
  };

  await sendEmail(email, replacements);

  res.json({ message: "Email envoyé avec succès" });
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
      const token = jwt.sign({ idFiche: fiche.idFiche, role: fiche.role }, process.env.AUTH_TOKEN, { expiresIn: '1h' });
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
        const link = process.env.URL + "/InscriptionEtape/" + dateTime + newUser.id
        const message = "Vous etes en train de vous inscrire sur le site UperMed pour continuer l'inscription veuillez suivre le lien suivant : " + link
        const objet = "Inscription UperMed"
        const nom = ""
        const replacements = {
          objet,
          message,
          nom
      };
        await sendEmail(email,replacements)
        res.status(201).json({ message: "User created successfully", userId: newUser.id });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/users/ficheuser',optionalAuthenticateToken, async (req, res) => {
  try {
    const { nom, prenom, adresse, ville, codepostal, mailcontact, telephone, role, idCNX, signature, numSS } = req.body;
    let idFicheMere = 0;
    // Définir la valeur de Valide en fonction du rôle
    const valide = role === __ROLE_UTILISATEUR__ || role === __ROLE_SANSCOMPTE__;
// true si le rôle est __ROLE_UTILISATEUR__, sinon false
    if(req.user){
      idFicheMere = req.user.idFiche
    }
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
      TransportDispo: 0,
      Valide: valide // Utiliser la valeur définie ci-dessus
    });

    res.status(201).json({ message: "Fiche utilisateur crée avec succès", ficheId: newFiche.idFiche });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/users/ficheuser/:id', authenticateToken, async (req, res) => {
  const idFicheUser = req.params.id; // Récupérer l'ID de la FicheUser depuis l'URL
  const { nom, prenom, adresse, ville, codepostal, mailcontact, telephone, role, idCNX, signature, idFicheMere, numSS, TransportDispo, Valide } = req.body;

  try {
    // Recherche la fiche user par son ID
    const ficheUser = await FicheUser.findByPk(idFicheUser);

    // Si la fiche n'existe pas, renvoie une erreur 404
    if (!ficheUser) {
      return res.status(404).json({ error: "Fiche utilisateur non trouvée." });
    }

    // Met à jour la fiche avec les données reçues
    await FicheUser.update({
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
      TransportDispo,
      Valide
    }, {
      where: { idFiche: idFicheUser }
    });

    // Renvoie une réponse de succès
    res.json({ message: "Fiche utilisateur mise à jour avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de la mise à jour de la fiche utilisateur." });
  }
});



app.post('/api/users/fichevehicule', upload.single('carteGrise'), async (req, res) => {
  try {
    const { Marque, Modele, Annee, numImmatriculation, numSerie, idFiche } = req.body;

    // Chemin du fichier téléchargé pour la carte grise
    let cheminCarteGrise = "";
    if (req.file) {
      cheminCarteGrise = req.file.path;
    }

    const newFicheVehicule = await FicheVehicule.create({
      Marque, Modele, Annee, numImmatriculation, numSerie, ficVehicule: cheminCarteGrise, idFiche
    });
    await Message.create({
      idFiche: idFiche,
      Objet: "Profile en cours d'analyse",
      Message: `Nos équipes reviendront vers vous des que votre profile sera validé. Merci de votre patience.`
    });
    res.status(201).json({ message: "Fiche vehicule crée avec succès", ficheVehiculeId: newFicheVehicule.idVehicule });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


app.post('/api/users/fichepermis', upload.single('permis'), async (req, res) => {
  try {
      const { numPermis, dateDel, dateExpi, idFiche } = req.body;

      // Chemin du fichier téléchargé pour le permis
      let cheminFicPermis = "";
      if (req.file) {  // Utilisez req.file au lieu de req.file['permis']
          cheminFicPermis = req.file.path;  // Accédez directement à req.file.path
      }

      const newFichePermis = await FichePermis.create({
          numPermis, dateDel, dateExpi, ficPermis: cheminFicPermis, idFiche
      });

      res.status(201).json({ message: "Fiche permis crée avec succès", fichePermisId: newFichePermis.idVehicule });
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});

app.put('/api/users/fichepermis/:idFichePermis', upload.single('permis'), async (req, res) => {
  try {
    const { idFichePermis } = req.params;
    const { numPermis, dateDel, dateExpi, idFiche } = req.body;

    let cheminFicPermis = "";
    if (req.file) {
      cheminFicPermis = req.file.path;
    }

    const fichePermis = await FichePermis.findByPk(idFichePermis);
    if (!fichePermis) {
      return res.status(404).json({ message: "Fiche permis introuvable." });
    }

    await fichePermis.update({
      numPermis, 
      dateDel, 
      dateExpi, 
      ficPermis: cheminFicPermis, 
      idFiche
    });

    res.status(200).json({ message: "Fiche permis modifiée avec succès", fichePermisId: fichePermis.idPermis });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/users/fichevehicule/:idFicheVehicule', upload.single('carteGrise'), async (req, res) => {
  try {
    const { idFicheVehicule } = req.params;
    const { Marque, Modele, Annee, numImmatriculation, numSerie, idFiche } = req.body;

    let cheminCarteGrise = "";
    if (req.file) {
      cheminCarteGrise = req.file.path;
    }

    const ficheVehicule = await FicheVehicule.findByPk(idFicheVehicule);
    if (!ficheVehicule) {
      return res.status(404).json({ message: "Fiche véhicule introuvable." });
    }

    await ficheVehicule.update({
      Marque, 
      Modele, 
      Annee, 
      numImmatriculation, 
      numSerie, 
      ficVehicule: cheminCarteGrise, 
      idFiche
    });

    res.status(200).json({ message: "Fiche véhicule modifiée avec succès", ficheVehiculeId: ficheVehicule.idVehicule });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});



app.get('/api/users/taxinonvalide', authenticateToken, async (req, res) => {
  try {
    let condition = {};
    // Si l'utilisateur est un taxi, limitez la recherche à son propre ID
    if (req.user.role === __ROLE_TAXI__) { // Remplacez __ROLE_TAXI__ par la valeur correcte pour le rôle taxi
      condition = "USR_FICHE.idFiche = " + req.user.idFiche;
    } else if (req.user.role === __ROLE_SUPERVISEUR__) { // Remplacez __ROLE_SUPERVISEUR__ par la valeur correcte pour le rôle superviseur
      // Si l'utilisateur est un superviseur, recherchez tous les utilisateurs non validés
      condition = "USR_Fiche.Valide = 2";
    }

    const result = await sequelize.query(`
      SELECT 
        USR_Fiche.idFiche, 
        USR_Fiche.nom, 
        USR_Fiche.prenom, 
        USR_Fiche.adresse, 
        USR_Fiche.ville, 
        USR_Fiche.codepostal, 
        USR_Fiche.mailcontact, 
        USR_Fiche.telephone, 
        PermisTaxi.idPermis, 
        PermisTaxi.numPermis, 
        PermisTaxi.dateExpi, 
        PermisTaxi.dateDel, 
        Vehicule.idVehicule, 
        Vehicule.Marque, 
        Vehicule.Modele, 
        Vehicule.Annee, 
        Vehicule.numImmatriculation, 
        Vehicule.numSerie, 
        Vehicule.pecPMR,
        CNX_Utilisateur.USR_KEY
      FROM USR_Fiche 
      INNER JOIN PermisTaxi ON USR_Fiche.idFiche = PermisTaxi.idFiche
      INNER JOIN Vehicule ON USR_Fiche.idFiche = Vehicule.idFiche
      INNER JOIN CNX_Utilisateur ON USR_Fiche.idCNX = CNX_Utilisateur.id
      WHERE 
        `+ condition, {
      type: sequelize.QueryTypes.SELECT
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.post('/api/users/valideuser', authenticateToken, async (req,res) =>{

  try{
    const {idFiche} = req.body;
    const user = await FicheUser.findByPk(idFiche);
    await user.update({Valide: 3});
    const objet = "Validation de votre compte"
    const message = "Votre compte a été validé avec succès"
    const nom = user.prenom + " " + user.nom
    const replacements = {
      objet,
      message,
      nom
    };
    await sendEmail(user.mailcontact,replacements)
    await Message.create({
      idFiche: idFiche,
      Objet: 'Validation de compte',
      Message: `Votre compte a été validé avec succès.`
    });
    res.status(201).json({ message: "User validé avec succès"});
  }catch (error){
    res.status(500).json({ error: error.message });
  }
})

app.post('/api/users/refuseuser', authenticateToken, async (req,res) =>{
  try{
    const {idFiche, message} = req.body;
    const user = await FicheUser.findByPk(idFiche);
    const objet = "Validation de votre compte"
    const nom = user.prenom + " " + user.nom
    const replacements = {
      objet,
      message,
      nom
    };
    await sendEmail(user.mailcontact,replacements)

    await Message.create({
      idFiche: idFiche,
      Objet: 'Refus de compte',
      Message: message
    });
    res.status(201).json({ message: "User refusé avec succès"});
  }catch (error){
    res.status(500).json({ error: error.message });
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
          role: user.role,
          Valide: user.Valide
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/mesusers', authenticateToken, async (req, res) => {
  try {
    let conditions = {}; // Conditions de recherche initiales

    // Si l'utilisateur est un superviseur, ajustez les conditions pour exclure les superviseurs des résultats
    if (req.user.role === __ROLE_SUPERVISEUR__) {
      conditions = {
        role: { [Op.ne]: __ROLE_SUPERVISEUR__ } // 'Op.ne' signifie 'not equal'
      };
    } else {
      // Pour un utilisateur normal, cherchez ses utilisateurs liés et lui-même
      conditions = {
        [Op.or]: [
          { idFicheMere: req.user.idFiche },
          { idFiche: req.user.idFiche }
        ]
      };
    }

    const listeUser = await FicheUser.findAll({
      where: conditions
    });

    res.status(200).json({
      listeUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/taxis', authenticateToken, async (req, res) => {
  try {
    const taxis = await FicheUser.findAll({
      where: { role: __ROLE_TAXI__ }
    });

    res.status(200).json({
      taxis
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


// Endpoint pour creer une reservation
app.post('/api/reservation/newreservation', authenticateToken, async (req, res) => {
  try {
    const { AdresseDepart, AdresseArrive, Distance, DureeTrajet, HeureConsult, HeureDepart, AllerRetour, DureeConsult, idFicheUser, pecPMR } = req.body;
    const idClient = idFicheUser;
    const user = await FicheUser.findByPk(idClient);
    let idTaxi = 0;
    let Etat = __ETAT_ENATTENTE__;
    if (!user) {
      return res.status(404).json({ errorCode: "USER_NOT_FOUND" });
    }

    // Ajout de 2 heures à HeureConsult et HeureDepart pour le fuseau horaire
    //const adjustedHeureConsult = moment(HeureConsult).add(2, 'hours').toISOString();
    //const adjustedHeureDepart = moment(HeureDepart).add(2, 'hours').toISOString();

    // Création de la réservation initiale
    const newReservation = await Reservation.create({
      idClient,
      idTaxi,
      AdresseDepart,
      AdresseArrive,
      Distance,
      DureeTrajet,
      HeureConsult: adjustedHeureConsult,
      HeureDepart: adjustedHeureDepart,
      AllerRetour,
      pecPMR,
      DureeConsult,
      Etat
    });

    // Si AllerRetour = 1, créer une réservation pour le retour
    if (AllerRetour === 1) {
      const returnHeureConsult = moment(adjustedHeureConsult).add(DureeConsult, 'hours').toISOString();
      const returnHeureDepart = returnHeureConsult;

      const returnReservation = await Reservation.create({
        idClient,
        idTaxi,
        AdresseDepart: AdresseArrive, // Inverse des adresses
        AdresseArrive: AdresseDepart,
        Distance,
        DureeTrajet,
        HeureConsult: returnHeureConsult,
        HeureDepart: returnHeureDepart,
        AllerRetour: 0,
        pecPMR,
        DureeConsult,
        Etat
      });

      return res.status(201).json({
        idReservationAller: newReservation.idReservation,
        idReservationRetour: returnReservation.idReservation,
        Etat: Etat
      });
    }

    return res.status(201).json({ idReservation: newReservation.idReservation, Etat: Etat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errorCode: "SERVER_ERROR" });
  }
});

app.put('/api/reservation/annulerreservation', authenticateToken, async (req,res) => {
  try{
    const {idReservation} = req.body;
    const reservation = await Reservation.findByPk(idReservation);
    if (reservation.Etat ===  __ETAT_CONFIRME__ || reservation.Etat === __ETAT_ENATTENTE__ ){
      await reservation.update({Etat: __ETAT_ANNULE__});
      return res.status(201).json({ message: "Reservation annulée avec succès"});
    } else {
      return res.status(400).json({ error: "La reservation ne peut pas etre annulée"});
    }
  } catch (error){
    console.error(error);
    res.status(500).json({ error: error.message });
  }
})

app.put('/api/reservation/modiftaxi', authenticateToken, async (req,res) => {
  try {
    const { idReservation, idTaxi } = req.body;
    
    // Find the reservation by its primary key
    const reservation = await Reservation.findByPk(idReservation);

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    // Update the reservation with the new taxi ID and set its status to validated
    // Assuming 'validated' status is represented by a specific value, for example, 1
    const updatedReservation = await reservation.update({
      idTaxi: idTaxi,
      Etat: __ETAT_CONFIRME__, // Replace __ETAT_VALIDE__ with the actual value representing 'validated' status in your database
    });

    res.status(200).json({ message: "Taxi modified successfully and reservation validated", updatedReservation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while updating the reservation" });
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
app.post('/api/bon/bonfromcli', authenticateToken, upload.single('BonTransport'), async (req, res) => {
  if(req.user.role == __ROLE_UTILISATEUR__){
    try{
      let cheminBon = "";
      if (req.file) {
        cheminBon = req.file.path; // Accès correct au fichier
      }
      const {dateEmission, drPrescripteur} = req.body;
      const idFichePatient = req.body.idFicheUser;
      const bon = await BonTransport.create({
        idFichePatient: idFichePatient,
        drPrescripteur: drPrescripteur,
        dateEmission: dateEmission,
        ficBon: cheminBon
      });
      res.status(201).json({ message: "Bon déposé avec succès", idBon: bon.idBon });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "L'utilisateur n'a pas les droits nécessaires" });
  }
});


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


app.post('/api/bon/validateBon', authenticateToken, async (req, res) => {
  if (req.user.role === __ROLE_SUPERVISEUR__) {
    try {
      const { idFiche, idBonTransport, nombreTransports } = req.body;

      // Assurez-vous que nombreTransports est un nombre valide
      if (isNaN(nombreTransports) || nombreTransports < 1) {
        return res.status(400).json({ error: "Nombre de transports invalide" });
      }

      // Mise à jour de la colonne 'valide' dans BonTransport
      await BonTransport.update(
        { Valide: true },
        { where: { idBon: idBonTransport } }
      );

      // Incrémenter la colonne 'transport' dans FicheUser par le nombre spécifié
      await FicheUser.increment(
        { TransportDispo: nombreTransports },
        { where: { idFiche: idFiche } }
      );

      await Message.create({
        idFiche: idFiche,
        Objet: 'Validation de Bon de Transport',
        Message: `Votre bon de transport a été validé avec succès. Nombre de transports disponibles ajoutés : ${nombreTransports}.`
      });

      res.status(201).json({ message: `Bon de transport validé et nombre de transport mis à jour de ${nombreTransports}.` });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(403).json({ error: "Vous ne possédez pas les droits nécessaires" });
  }
});


app.post('/api/bon/refuseBon', authenticateToken, async (req, res) => {
  if (req.user.role === __ROLE_SUPERVISEUR__) {
    try {
      const { idBonTransport, idFiche, messageRefus } = req.body;

      // Mise à jour de la colonne 'valide' dans BonTransport pour marquer comme refusé
      await BonTransport.update(
        { Valide: false },
        { where: { idBon: idBonTransport } }
      );

      // Optionnel: Ajouter un message dans la table 'Message' pour notifier l'utilisateur du refus
      if (messageRefus) {
        await Message.create({
          idFiche: idFiche,
          Objet: 'Refus de Bon de Transport',
          Message: messageRefus
        });
      }

      res.status(200).json({ message: "Bon de transport refusé avec succès." });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(403).json({ error: "Vous ne possédez pas les droits nécessaires" });
  }
});

app.get('/api/bon', authenticateToken, async (req, res) => {
  switch (req.user.role) {
    case __ROLE_SUPERVISEUR__:
      try {
        const bons = await BonTransport.findAll({
          where: {
            Valide: null // Ne sélectionner que les bons dont la colonne 'Valide' est à null
          },
          include: [
            {
              model: FicheUser,
              as: 'ficheuser', // Utilisez l'alias défini dans l'association
              attributes: ['idFiche', 'nom', 'prenom']
            }
          ]
        });
        
        res.status(201).json({ bons });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
      break;
    case __ROLE_UTILISATEUR__:
      try {
        const bons = await BonTransport.findAll({
          where: {
            idFichePatient: req.user.idFiche
          }
        });
        res.status(201).json({ bons });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
      break;

    default:
      res.status(400).json({ error: "Vous ne possédez pas les droits necessaire" });
      break;
    }
  }
)

app.get('/api/reservation/lastresa', authenticateToken, async (req,res) =>{
  console.log(req.user)
  const maintenant = new Date();
  maintenant.setHours(0, 0, 0, 0); 
  switch (req.user.role) {
    case __ROLE_SUPERVISEUR__:
      try{
        const reservations = await Reservation.findAll({
          where: {
            HeureDepart: {
              [Op.lt]: maintenant
            }
          },
          include: [{
            model: FicheUser,
            as: 'Taxi', // Assurez-vous que cette association est correctement définie dans vos modèles
            attributes: ['nom', 'prenom']
          }]
        });
        // Préparer les données pour inclure les informations du taxi dans la réponse
        const reservationsWithTaxiInfo = reservations.map(reservation => ({
          ...reservation.toJSON(),
          TaxiNom: reservation.Taxi?.nom,
          TaxiPrenom: reservation.Taxi?.prenom,
        }));
        res.status(201).json({reservations: reservationsWithTaxiInfo});
      } catch(error){
        res.status(400).json({ error: error.message });
      }
      break;

    case __ROLE_TAXI__:
      try{
        const reservations = await Reservation.findAll({
          where:{
            idTaxi:req.user.idFiche,
            HeureDepart: {
              [Op.lt]:maintenant
            }
          }
        })
        res.status(201).json({reservations});
      } catch(error){
        res.status(400).json({ error: error.message });
      }
      break;
      case __ROLE_UTILISATEUR__:
        try {
          // Assurez-vous d'inclure le modèle FicheUser pour les taxis et un autre pour les clients (utilisateurs rattachés)
          const reservations = await Reservation.findAll({
            where: {
              [Op.or]: [
                { idClient: req.user.idFiche },
                { '$Client.idFicheMere$': req.user.idFiche }
              ],
              HeureDepart: {
                [Op.lt]: maintenant
              }
            },
            include: [
              {
                model: FicheUser,
                as: 'Taxi',
                attributes: ['nom', 'prenom']
              },
              {
                model: FicheUser,
                as: 'Client', // Supposons que vous ayez cette association définie pour pointer vers l'utilisateur qui a fait la réservation
                attributes: ['nom', 'prenom']
              }
            ]
          });
      
          // Transformer les données pour inclure les informations nécessaires
          const reservationsTransformed = reservations.map(reservation => ({
            ...reservation.toJSON(),
            TaxiNom: reservation.Taxi?.nom,
            TaxiPrenom: reservation.Taxi?.prenom,
            ClientNom: reservation.Client?.nom, // Nom du client (utilisateur rattaché)
            ClientPrenom: reservation.Client?.prenom, // Prénom du client (utilisateur rattaché)
          }));
      
          res.status(201).json({ reservations: reservationsTransformed });
        } catch (error) {
          res.status(400).json({ error: error.message });
        }
        break;

    default:
      res.status(400).json({ error: "Vous ne possédez pas les droits necessaire" });
      break;

    }
})




app.get('/api/reservation/nextresa', authenticateToken, async (req,res) =>{
  console.log(req.user)
  const maintenant = new Date();
  maintenant.setHours(0, 0, 0, 0); 
  switch (req.user.role) {
    case __ROLE_SUPERVISEUR__:
      try{
        const reservations = await Reservation.findAll({
          where: {
            HeureDepart: {
              [Op.gt]: maintenant
            }
          },
          include: [{
            model: FicheUser,
            as: 'Taxi', // Assurez-vous que cette association est correctement définie dans vos modèles
            attributes: ['nom', 'prenom']
          }]
        });
        // Préparer les données pour inclure les informations du taxi dans la réponse
        const reservationsWithTaxiInfo = reservations.map(reservation => ({
          ...reservation.toJSON(),
          TaxiNom: reservation.Taxi?.nom,
          TaxiPrenom: reservation.Taxi?.prenom,
        }));
        res.status(201).json({reservations: reservationsWithTaxiInfo});
      } catch(error){
        res.status(400).json({ error: error.message });
      }
      break;

    case __ROLE_TAXI__:
      try{
        const reservations = await Reservation.findAll({
          where:{
            idTaxi:req.user.idFiche,
            HeureDepart: {
              [Op.gt]:maintenant
            }
          }
        })
        res.status(201).json({reservations});
      } catch(error){
        res.status(400).json({ error: error.message });
      }
      break;
      case __ROLE_UTILISATEUR__:
        try {
          // Assurez-vous d'inclure le modèle FicheUser pour les taxis et un autre pour les clients (utilisateurs rattachés)
          const reservations = await Reservation.findAll({
            where: {
              [Op.or]: [
                { idClient: req.user.idFiche },
                { '$Client.idFicheMere$': req.user.idFiche }
              ],
              HeureDepart: {
                [Op.gt]: maintenant
              }
            },
            include: [
              {
                model: FicheUser,
                as: 'Taxi',
                attributes: ['nom', 'prenom']
              },
              {
                model: FicheUser,
                as: 'Client', // Supposons que vous ayez cette association définie pour pointer vers l'utilisateur qui a fait la réservation
                attributes: ['nom', 'prenom']
              }
            ]
          });
      
          // Transformer les données pour inclure les informations nécessaires
          const reservationsTransformed = reservations.map(reservation => ({
            ...reservation.toJSON(),
            TaxiNom: reservation.Taxi?.nom,
            TaxiPrenom: reservation.Taxi?.prenom,
            ClientNom: reservation.Client?.nom, // Nom du client (utilisateur rattaché)
            ClientPrenom: reservation.Client?.prenom, // Prénom du client (utilisateur rattaché)
          }));
      
          res.status(201).json({ reservations: reservationsTransformed });
        } catch (error) {
          res.status(400).json({ error: error.message });
        }
        break;

    default:
      res.status(400).json({ error: "Vous ne possédez pas les droits necessaire" });
      break;

    }
})

app.get('/files/*', (req, res) => {
  const filepath = req.params[0];
  const fullPath = path.join(__dirname, filepath);

  res.sendFile(fullPath, (err) => {
    if (err) {
      res.status(404).send('Fichier non trouvé');
    }
  });
});


app.post('/api/taxi/disponibilite', authenticateToken, async (req, res) => {
  let idTaxi;

  // Vérifiez le rôle de l'utilisateur
  if (req.user.role === __ROLE_TAXI__) {
      // Si l'utilisateur est un taxi, utilisez son idFiche comme idTaxi
      idTaxi = req.user.idFiche;
  } else if (req.user.role === __ROLE_SUPERVISEUR__) {
      // Si l'utilisateur est un superviseur, récupérez l'idTaxi du corps de la requête
      idTaxi = req.body.idTaxi;
  } else {
      // Si l'utilisateur n'est ni un taxi ni un superviseur, renvoyez une erreur
      return res.status(403).json({ error: "Action non autorisée" });
  }
  console.log(req.body)
  // Créez la disponibilité avec idTaxi déterminé et d'autres données de req.body
  try {
      const nouvelleDisponibilite = await Disponibilite.create({
          idTaxi: idTaxi,
          idJour: req.body.idJour,
          HeureDebutMatin: req.body.HeureDebutMatin,
          HeureFinMatin: req.body.HeureFinMatin,
          HeureDebutApresMidi: req.body.HeureDebutApresMidi,
          HeureFinApresMidi: req.body.HeureFinApresMidi
          // Ajoutez d'autres champs de disponibilité au besoin
      });

      res.status(201).json(nouvelleDisponibilite);
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});


app.put('/api/disponibilites/:id', authenticateToken, async (req, res) => {
  const { id } = req.params; // ID de la disponibilité à mettre à jour

  try {
      // Trouver la disponibilité existante par son ID
      const disponibilite = await Disponibilite.findByPk(id);

      if (!disponibilite) {
          return res.status(404).json({ error: "Disponibilité non trouvée" });
      }

      // Vérifier si l'utilisateur est autorisé à mettre à jour cette disponibilité
      if (req.user.role === __ROLE_TAXI__ && disponibilite.idTaxi !== req.user.idFiche) {
          // Si l'utilisateur est un taxi mais pas le propriétaire de cette disponibilité
          return res.status(403).json({ error: "Action non autorisée" });
      } else if (req.user.role === __ROLE_SUPERVISEUR__) {
          // Si l'utilisateur est un superviseur, permettre la mise à jour
          // Optionnel : Si l'idTaxi est fourni dans req.body, mise à jour de l'idTaxi
          if (req.body.idTaxi) {
              disponibilite.idTaxi = req.body.idTaxi;
          }
      } else {
          // Si l'utilisateur n'est ni un taxi propriétaire ni un superviseur
          return res.status(403).json({ error: "Action non autorisée" });
      }

      // Mise à jour de la disponibilité avec les nouvelles valeurs
      disponibilite.idJour = req.body.idJour || disponibilite.idJour;
      disponibilite.HeureDebutMatin = req.body.HeureDebutMatin || disponibilite.HeureDebutMatin;
      disponibilite.HeureFinMatin = req.body.HeureFinMatin || disponibilite.HeureFinMatin;
      disponibilite.HeureDebutApresMidi = req.body.HeureDebutApresMidi || disponibilite.HeureDebutApresMidi;
      disponibilite.HeureFinApresMidi = req.body.HeureFinAprem || disponibilite.HeureFinApresMidi;
      // Mettre à jour d'autres champs au besoin

      await disponibilite.save(); // Sauvegarder les modifications

      res.json(disponibilite);
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});


app.get('/api/disponibilites/taxi/:idTaxi?', authenticateToken, async (req, res) => {
  // Utilisez l'ID du taxi fourni dans les paramètres de la requête ou l'ID de l'utilisateur authentifié si aucun ID n'est fourni
  const idTaxi = req.params.idTaxi || req.user.idFiche;

  try {
      // Si l'utilisateur est un taxi et qu'il tente de voir les disponibilités d'un autre taxi, renvoyez une erreur
      if (req.user.role === __ROLE_TAXI__ && req.user.idFiche !== parseInt(idTaxi)) {
          return res.status(403).json({ error: "Action non autorisée" });
      }

      // Les superviseurs peuvent voir les disponibilités de tous les taxis, donc pas de vérification supplémentaire nécessaire pour __ROLE_SUPERVISEUR__

      // Récupération des disponibilités pour le taxi spécifié
      const disponibilites = await Disponibilite.findAll({
          where: { idTaxi: idTaxi },
          include: [
              // Incluez ici d'autres modèles si nécessaire, par exemple le modèle 'Jour'
              { model: Jour, as: 'Jour' } // Assurez-vous que l'association est correctement configurée
          ]
      });

      if (disponibilites.length === 0) {
          return res.status(404).json({ message: "Aucune disponibilité trouvée pour ce taxi" });
      }

      res.json(disponibilites);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
      const idFichePrincipal = req.user.idFiche; // ID de l'utilisateur principal obtenu à partir du token JWT
      
      // Récupérer tous les ID des fiches utilisateurs rattachées, incluant l'utilisateur principal
      const fichesUtilisateurs = await FicheUser.findAll({
          where: {
              [Op.or]: [{ idFiche: idFichePrincipal }, { idFicheMere: idFichePrincipal }]
          },
          attributes: ['idFiche']
      });
      
      // Extraire les ID des fiches pour la requête des messages
      const idsFiches = fichesUtilisateurs.map(fiche => fiche.idFiche);
      
      // Récupérer les messages pour tous les ID de fiches trouvés, avec le nom et le prénom du destinataire
      const messages = await Message.findAll({
          where: {
              idFiche: idsFiches
          },
          include: [{
              model: FicheUser, // Assurez-vous que l'association est bien configurée dans vos modèles Sequelize
              as: 'destinataire', // Utilisez l'alias approprié si vous en avez défini un dans l'association
              attributes: ['nom', 'prenom']
          }],
          order: [['createdAt', 'DESC']] // Optionnel : trier les messages par date de création
      });

      res.json(messages.map(message => {
          // Structurez le JSON de réponse comme vous le souhaitez ici
          return {
              idMessage: message.id,
              objet: message.Objet,
              contenu: message.Message,
              dateEnvoi: message.createdAt,
              destinataire: {
                  nom: message.destinataire.nom,
                  prenom: message.destinataire.prenom
              }
          };
      }));
  } catch (error) {
      console.error('Erreur lors de la récupération des messages :', error);
      res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

app.post('/api/messages', authenticateToken, async (req, res) => {
  if (req.user.role !== __ROLE_SUPERVISEUR__) {
      return res.status(403).json({ error: "Action non autorisée" });
  }
  try {
      const { idFiche, objet, contenu } = req.body;

      // Créer un message avec les données reçues
      const message = await Message.create({
        idFiche: idFiche,
        Objet: objet,
        Message: contenu
      });

      res.status(201).json({ message: "Message envoyé avec succès", idMessage: message.id });
  } catch (error) {
      console.error('Erreur lors de l\'envoi du message :', error);
      res.status(500).json({ error: "Erreur interne du serveur" });
  }
}
);

app.post('/api/users/createtaxi', authenticateToken, async (req, res) => {
  if (req.user.role !== __ROLE_SUPERVISEUR__) {
      return res.status(403).json({ error: "Action non autorisée" });
  }

  try {
    const { email } = req.body;
    const chaineAlphanumeriqueAleatoire = genererChaineAlphanumeriqueAleatoire(16);
    const user = await User.create({ 
      email: email, 
      USR_KEY: chaineAlphanumeriqueAleatoire });
    const fiche = await FicheUser.create({ 
      idCNX: user.id, 
      role: __ROLE_TAXI__, 
      mailcontact: email,
      Valide: 1 
    });
    const lieninscription = process.env.URL + "/InscriptionTaxi/" + chaineAlphanumeriqueAleatoire;
    const objet = "Création de votre compte taxi"
    const message = `Votre compte taxi a été créé avec succès. nous vous invitons a aller completer votre inscription sur le lien suivant : ${lieninscription}`;
    const replacements = {
      objet,
      message
    };
    
    await sendEmail(email,replacements)
    res.status(201).json({ message: "Taxi créé avec succès" });

  } catch (error) {
    console.error('Erreur lors de la création du taxi :', error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
}); 

app.post('/api/users/completetaxi', upload.fields([
  { name: 'controletechnique', maxCount: 1 },
  { name: 'KBIS', maxCount: 1 },
  { name: 'attestassurance', maxCount: 1 },
  { name: 'autostationnement', maxCount: 1 },
  { name: 'atteststagecontinue', maxCount: 1 },
  { name: 'attestmedicale', maxCount: 1 },
  { name: 'cartepro', maxCount: 1 },
  { name: 'permis', maxCount: 1 }
]),async (req,res) => {
  try{
    const { key, etape1, etape2, etape3, etape5, etape6 } = req.body;
    console.log(etape6)
    const user = await User.findOne({where: {USR_KEY: key}});
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    

    const hashedPassword = await bcrypt.hash(etape1.password, 10); 
    await user.update({ password: hashedPassword });


    const ficheUtilisateur = await FicheUser.findOne({where: {idCNX: user.id}});
    if (!ficheUtilisateur) return res.status(404).json({ error: "Fiche utilisateur non trouvée" });
    

    await ficheUtilisateur.update({
      nom: etape2.nom,
      prenom: etape2.prenom,
      adresse: etape2.adresse,
      ville: etape2.ville,
      codepostal: etape2.codepostal,
      telephone: etape2.telephone,
      Valide: 2,
      IdStripe: etape6.paymentMethodId
    });

    
    const infopermis = await FichePermis.create({
      idFiche: ficheUtilisateur.idFiche,
      numPermis: etape5.numPermis,
      dateDel: etape5.dateDel,
      dateExpi: etape5.dateExpi,
    });

    const infovehicule = await FicheVehicule.create({
      idFiche: ficheUtilisateur.idFiche,
      Marque: etape3.marquevehicule,
      Modele: etape3.modele,
      couleur: etape3.couleur,
      Annee: etape3.annee,
      numImmatriculation: etape3.immatriculation,
      numSerie: etape3.numSerie,
      pecPMR: etape3.pecPMR
    });

    // Création d'un client Stripe
    try{
      const customer = await stripe.customers.create({
        email: ficheUtilisateur.mailcontact, // Utilisez l'email de votre utilisateur
        payment_method: etape6.paymentMethodId, // ID de la méthode de paiement
      });
  
      // Associer la méthode de paiement au client et définir comme méthode par défaut
      await stripe.paymentMethods.attach(
        etape6.paymentMethodId, // ID de la méthode de paiement
        {customer: customer.id}
      );
  
      await stripe.customers.update(
        customer.id,
        {
          invoice_settings: {
            default_payment_method: etape6.paymentMethodId,
          },
        }
      );
  
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: 'price_1P3y8hESO4xwzKUzxzuQarWb' }], // Remplacez 'price_id' par l'ID de votre plan
        expand: ['latest_invoice.payment_intent'],
      });
  
      const objet = "Confirmation de votre compte taxi"
      const contenu = `Votre compte taxi a été complété avec succès. Nous vous ferons parvenir un email de confirmation dès que votre compte sera validé.`;
      const replacements = {
        objet,
        message: contenu,
        nom: etape2.nom,
    };
      await sendEmail(ficheUtilisateur.mailcontact,replacements)
  
      const message = await Message.create({
        idFiche: ficheUtilisateur.idFiche,
        Objet: objet,
        Message: contenu
      });

  
      res.status(201).json({ message: "Taxi complété avec succès" });
    }catch (stripeError){
      console.error('Erreur Stripe lors de la création du taxi:', stripeError);
      // Gestion spécifique des erreurs Stripe
      return res.status(500).json({ error: "Erreur de paiement Stripe" });
    }

  }catch (dberror) {
    console.error('Erreur BDD lors de la création du taxi:', dberror);
    // Gestion spécifique des erreurs liées aux opérations en BDD
    return res.status(500).json({ error: "Une erreur est survenu lors de votre enregistrement n'hesitez pas a contacter le support" });
  }
}
);

app.get('/api/users/doc/:key', authenticateToken, async (req, res) => {

  const { key } = req.params;
  if (req.user.role !== __ROLE_SUPERVISEUR__) {
    return res.status(403).json({ error: "Action non autorisée" });
  }
  // Assurez-vous que le dossier existe
  const directoryPath = path.join(__dirname, 'uploads', key);
  if (!fs.existsSync(directoryPath)) {
    return res.status(404).send('Dossier non trouvé.');
  }

  // Créez un stream pour écrire le fichier ZIP
  const zipFileName = `${key}.zip`;
  res.attachment(zipFileName);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Niveau de compression
  });
  archive.on('error', function(err) {
    res.status(500).send({error: err.message});
  });
  // Pipe les données de l'archive dans la réponse
  archive.pipe(res);

  // Ajoutez le dossier à l'archive
  archive.directory(directoryPath, false);

  // Finalisez l'archive (cela indique que nous avons fini d'ajouter des fichiers)
  archive.finalize();
});


app.get('/api/reservation/download/:idReservation', async (req, res) => {
  const { idReservation } = req.params;

  try {
    const reservation = await Reservation.findOne({ where: { idReservation: idReservation } });

    if (!reservation || !reservation.bonTransportPath) {
      return res.status(404).send('File not found.');
    }

    // Construire le chemin complet vers le fichier
    const filePath = path.join(__dirname, 'uploads', 'BonTransport', reservation.bonTransportPath);

    // Vérifier si le fichier existe réellement sur le disque
    if (fs.existsSync(filePath)) {
      // Définir les headers pour le téléchargement
      res.setHeader('Content-Disposition', 'attachment; filename=' + path.basename(filePath));
      res.setHeader('Content-Type', 'application/octet-stream');

      // Envoyer le fichier
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found on server.');
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post('/api/reservation/upload', upload.single('BonTransport'),authenticateToken, async (req, res) => {
  const { idReservation } = req.body;
  const reservation = await Reservation.findByPk(idReservation);

  if (!reservation) {
    return res.status(404).json({ error: "Reservation not found" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Enregistrez le chemin du fichier dans la base de données
  reservation.bonTransportPath = req.file.filename;
  await reservation.save();

  res.status(200).json({ message: "File uploaded successfully" });
});


const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


