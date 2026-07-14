const { cloudinary } = require('./cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

/**
 * Storage exclusivo do Banco de Talentos.
 * Currículos são sempre salvos como "raw" (PDF/DOC/DOCX).
 */
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const safeName = file.originalname
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);

    const jobId = (req.body && req.body.jobId) || 'geral';

    return {
      folder: `tecnosonda_banco_talentos/${jobId}`,
      resource_type: 'raw',
      public_id: `cv_${Date.now()}_${safeName}`,
      format: ext,
    };
  },
});

const ALLOWED_CV_MIMES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_CV_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato não permitido. Envie o currículo em PDF, DOC ou DOCX.'), false);
  }
};

const uploadCurriculo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = { uploadCurriculo, ALLOWED_CV_MIMES };
