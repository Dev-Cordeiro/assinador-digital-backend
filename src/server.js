require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.log(err));

app.use('/api/auth', require('./routes/auth'));

app.listen(PORT, () => {
    console.log(`Servidor na porta: ${PORT}`);
});
