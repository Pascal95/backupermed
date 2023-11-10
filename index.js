const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('./models'); // Supposons que vous ayez un modèle Sequelize "User"
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
        const token = jwt.sign({ userId: user.id }, 'secretKey', { expiresIn: '1h' });
        await user.update({ derniereconnexion: new Date() });
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
        const user = await User.findByPk(req.user.userId);
        res.json({ email: user.email, dateCreation: user.datecreation, derniereConnexion: user.derniereconnexion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

