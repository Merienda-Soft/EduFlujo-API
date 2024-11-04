const express = require('express');
const multer = require('multer');
const { parsePdf } = require('../controllers/pdfController');

const router = express.Router();
const upload = multer();

router.post('/parse-pdf', upload.single('file'), parsePdf);

module.exports = router;



