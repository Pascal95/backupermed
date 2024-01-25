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
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      let folder = "";
      switch (file.fieldname) {
          case 'permis':
              folder = "uploads/permis";
              break;
          case 'carteGrise':
              folder = "uploads/cartes_grises";
              break;
          case 'BonTransport':
            folder = "uploads/BonTransport"
          // ajoutez d'autres cas au besoin
      }
      cb(null, folder);
  },
  filename: function (req, file, cb) {
      // Vous pouvez également personnaliser le nom du fichier ici
      const fileExt = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + Date.now() + fileExt);
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
async function sendEmail(recipient, replacements) {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'richard.pascalpro@gmail.com',
        pass: 'shzw rrnb dcmj mgkl' // ou votre mot de passe d'application si l'authentification à deux facteurs est activée
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
            from: '"UperMed" <richard.pascalpro@gmail.com>',
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
      const token = jwt.sign({ idFiche: fiche.idFiche, role: fiche.role }, 'secretKey', { expiresIn: '1h' });
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
        const link = "http://127.0.0.1:5173/InscriptionEtape/" + dateTime + newUser.id
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

app.post('/api/users/ficheuser', async (req, res) => {
  try {
    const { nom, prenom, adresse, ville, codepostal, mailcontact, telephone, role, idCNX, signature, idFicheMere, numSS } = req.body;

    // Définir la valeur de Valide en fonction du rôle
    const valide = role === __ROLE_UTILISATEUR__; // true si le rôle est __ROLE_UTILISATEUR__, sinon false

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


app.post('/api/users/fichevehicule', upload.fields([{ name: 'carteGrise' }]), async (req, res) => {
  try {
    const { Marque, Modele, Annee, numImmatriculation, numSerie, idFiche } = req.body;

    // Chemin du fichier téléchargé pour la carte grise
    let cheminCarteGrise = "";
    if (req.file['carteGrise']) {
      cheminCarteGrise = req.file['carteGrise'][0].path;
    }

    const newFicheVehicule = await FicheVehicule.create({
      Marque, Modele, Annee, numImmatriculation, numSerie, ficVehicule: cheminCarteGrise, idFiche
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

app.get('/api/users/taxinonvalide', authenticateToken, async (req,res) =>{
  try {
    const result = await FicheUser.findAll({
      where: { Valide: false },
      include: [
          { 
              model: FichePermis, 
              as: 'permis',
              attributes: ['numPermis', 'dateExpi', 'dateDel', 'ficPermis'],
              required: true
          },
          {
              model: FicheVehicule,
              as: 'vehicule', // Utilisez l'alias défini dans l'association
              attributes: ['Marque', 'Modele', 'Annee', 'numImmatriculation', 'numSerie', 'ficVehicule'],
              required: true
          },
          
      ],
      attributes: ['idFiche','nom', 'prenom', 'adresse', 'ville', 'codepostal', 'mailcontact', 'telephone']
  });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

app.post('/api/users/valideuser', authenticateToken, async (req,res) =>{

  try{
    const {idFiche} = req.body;
    const user = await FicheUser.findByPk(idFiche);
    await user.update({Valide: true});
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
    await user.update({Valide: false});
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
    const {AdresseDepart, AdresseArrive, Distance, DureeTrajet, HeureConsult, HeureDepart, AllerRetour, DureeConsult} = req.body
    const idClient = req.user.idFiche;
    // Convertir HeureConsult en objet Date
    const dateHeureConsult = new Date(HeureConsult);

    // Formater la date pour correspondre à votre format SQL (YYYY-MM-DD)
    const dateConsultation = dateHeureConsult.toISOString().split('T')[0];
    
    const [resultats] = await sequelize.query(`
    SELECT 
    U.idFiche AS idTaxi,
    COALESCE(SUM(CASE 
                WHEN R.allerretour = 1 THEN R.distance * 2 
                ELSE R.distance 
              END), 0) AS distanceTotale
    FROM 
        USR_Fiche U
    LEFT JOIN 
        Reservation R ON U.idFiche = R.idTaxi AND DATE(R.HeureConsult) = '${dateConsultation}'
    WHERE 
        U.role = 3
    GROUP BY 
        U.idFiche
    ORDER BY 
        distanceTotale ASC, 
        COUNT(R.idTaxi) ASC  -- Ajoutez un critère de tri pour les taxis avec moins de réservations
    LIMIT 1;
    `);

    if (resultats.length === 0) {
      return res.status(404).json({ message: "Aucun taxi disponible trouvé" });
    }

    const idTaxi = resultats[0].idTaxi;
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
app.post('/api/bon/bonfromcli', authenticateToken, upload.single('BonTransport'), async (req, res) => {
  if(req.user.role == __ROLE_UTILISATEUR__){
    try{
      let cheminBon = "";
      if (req.file) {
        cheminBon = req.file.path; // Accès correct au fichier
      }
      const {dateEmission, drPrescripteur} = req.body;
      const idFichePatient = req.user.idFiche;
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



app.get('/api/reservation/nextresa', authenticateToken, async (req,res) =>{
  console.log(req.user)
  switch (req.user.role) {
    case __ROLE_SUPERVISEUR__:
      try{
        const maintenant = new Date()
        const reservations = await Reservation.findAll({
          where:{
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

    case __ROLE_TAXI__:
      try{
        const maintenant = new Date()
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
        try{
          const maintenant = new Date()
          const reservations = await Reservation.findAll({
            where:{
              idClient:req.user.idFiche,
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

  // Créez la disponibilité avec idTaxi déterminé et d'autres données de req.body
  try {
      const nouvelleDisponibilite = await Disponibilite.create({
          idTaxi: idTaxi,
          idJour: req.body.idJour,
          HeureDebutMatin: req.body.HeureDebutMatin,
          HeureFinMatin: req.body.HeureFinMatin,
          HeureDebutAprem: req.body.HeureDebutApresMidi,
          HeureFinAprem: req.body.HeureFinApresMidi
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


app.get('/api/disponibilites/taxi/:idTaxi', authenticateToken, async (req, res) => {
  const { idTaxi } = req.params; // ID du taxi pour lequel récupérer les disponibilités

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



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

