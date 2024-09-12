// index.js
const app = require('./app');  // On importe l'application configurée dans app.js
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});