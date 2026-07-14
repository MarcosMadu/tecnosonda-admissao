const express = require('express');
const auth = require('../middleware/auth');
const talentController = require('../controllers/talentController');

const router = express.Router();

// Todas as rotas do painel exigem autenticação de admin/RH
router.use(auth);

// Estatísticas
router.get('/stats', talentController.stats);

// Vagas
router.get('/jobs', talentController.listJobs);
router.post('/jobs', talentController.createJob);
router.put('/jobs/:id', talentController.updateJob);
router.delete('/jobs/:id', talentController.removeJob);

// Candidatos
router.get('/candidates', talentController.listCandidates);
router.get('/candidates/:id', talentController.getCandidate);
router.get('/candidates/:id/curriculo/download', talentController.downloadCurriculo);
router.put('/candidates/:id/status', talentController.updateCandidateStatus);
router.delete('/candidates/:id', talentController.removeCandidate);

module.exports = router;
