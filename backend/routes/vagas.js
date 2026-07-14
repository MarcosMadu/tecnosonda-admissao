const express = require('express');
const rateLimit = require('express-rate-limit');
const talentController = require('../controllers/talentController');
const { uploadCurriculo } = require('../config/cloudinaryTalent');

const router = express.Router();

// Protege o endpoint público contra envio em massa
const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de envio. Tente novamente em alguns minutos.' },
});

// Lista de vagas abertas (público)
router.get('/', talentController.listPublicJobs);

// Envio de candidatura + currículo (público)
router.post(
  '/candidatar',
  applyLimiter,
  uploadCurriculo.single('curriculo'),
  talentController.apply
);

module.exports = router;
