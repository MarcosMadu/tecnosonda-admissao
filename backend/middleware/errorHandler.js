const errorHandler = (err, req, res, next) => {
  console.error('❌ Erro:', err);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Arquivo muito grande. Limite: 30MB.' });
  }

  // Multer file type error
  if (err.message && err.message.includes('Formato não permitido')) {
    return res.status(400).json({ message: err.message });
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  // Mongoose duplicate
  if (err.code === 11000) {
    return res.status(400).json({ message: 'Registro duplicado.' });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Erro interno do servidor.',
  });
};

module.exports = errorHandler;
