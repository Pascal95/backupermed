# backupermed

- npm install

<h3>Route</h3>
<b>URL : </b>https://backupper.onrender.com
<h5>/api/users/register</h5>
<p>Endpoint pour l'inscription a la table connexion</p>
<b>Méthode :</b> : POST<br>
<b>Exemple :</b> : 
{
    "email":"azeerr@hotmail.fr",
    "password":"Axeb+3495"
}

<h5>/api/users/ficheuser</h5>
<p>Endpoint pour l'inscription a la table ficheuser (detail sur l'utilisateur)</p>
<b>Méthode :</b> : POST<br>
<b>Exemple :</b> : 
{
    "nom":"Pascal", 
    "prenom":"Pierre-Richard", 
    "adresse":"6 rue des fossettes", 
    "ville":"Domont", 
    "codepostal":"95330", 
    "mailcontact":"richard.pascalpro@gmail.com", 
    "telephone":"0778641376", 
    "role":1, 
    "idCNX":2, 
    "signature":""
}

<h5>/api/users/fichevehicule</h5>
<p>Endpoint pour la table fiche vehicule (si c'est un taxi)</p>
<b>Méthode</b> : POST<br>
<b>Exemple</b> :
{
    "Marque":"Peugeot", 
    "Modele":"206", 
    "Annee":"2004", 
    "numImmatriculation":"BW-350-PD", 
    "numSerie":"987654321", 
    "ficVehicule":"", 
    "idFiche":1
}


<h5>/api/users/fichepermis</h5>
<p>Endpoint pour la table fiche permis (si c'est un taxi)</p>
<b>Méthode</b> : POST<br>
<b>Exemple</b> :
{
    "numPermis":"768493", 
    "dateDel":"1998-01-23", 
    "dateExpi":"2021-12-11", 
    "ficPermis":"", 
    "idFiche":1
}

<h5>/api/users/profile</h5>
<p>Endpoint pour recuperer les information d'un utilisateur</p>
<b>Méthode</b> : GET<br>
<b>Exemple</b> :
{
    method: 'GET',
    headers: {
        'Authorization': `Bearer token`
    }
}