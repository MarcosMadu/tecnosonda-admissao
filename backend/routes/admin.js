const express = require('express');
const auth = require('../middleware/auth');
const employeeController = require('../controllers/employeeController');

const router = express.Router();

router.use(auth);

router.post('/employees', employeeController.create);
router.get('/employees', employeeController.list);
router.get('/employees/:id', employeeController.getById);
router.get('/employees/:id/documents/:docId/download', employeeController.downloadDocument);
router.post('/employees/:id/reopen', employeeController.reopen);
router.delete('/employees/:id', employeeController.remove);
router.delete('/employees/:id/documents/:docId', employeeController.removeDocument);

module.exports = router;
