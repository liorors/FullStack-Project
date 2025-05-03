// server.js
const express = require('express');
const bodyParser = require('body-parser');
const awsSDK = require('aws-sdk');
require('dotenv').config();

// configure AWS with env.
awsSDK.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const app = express();

const port = process.env.PORT || 3000;

// middleware for JSON parsing and serving static files
app.use(bodyParser.json());
app.use('/', express.static('Public'));

// CPU-related API routes
const cpuRoutes = require('./Routes/cpuRoutes');
app.use('/api/cpu', cpuRoutes);

// Server initialization
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
