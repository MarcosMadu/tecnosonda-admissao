const express = require('express');
const employeeController = require('../controllers/employeeController');
const { upload } = require('../config/cloudinary');

const router = express.Router();

router.get('/:token', employeeController.getByToken);
router.put('/:token/personal-data', employeeController.savePersonalData);
router.post(
  '/:token/documents',
  upload.single('file'),
  employeeController.uploadDocument
);
router.delete('/:token/documents/:docId', employeeController.removeOwnDocument);
router.post('/:token/submit', employeeController.submit);

module.exports = router;
