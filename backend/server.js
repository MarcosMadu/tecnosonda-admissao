require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const connectDB = require('./config/database');
const Admin = require('./models/Admin');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const admissionRoutes = require('./routes/admission');
const talentRoutes = require('./routes/talent');
const vagasRoutes = require('./routes/vagas');

const app = express();


// Security
app.use(
  helmet({
    contentSecurityPolicy: false, // permite inline para o frontend simples
  })
);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admission', admissionRoutes);
app.use('/api/talent', talentRoutes);   // Banco de Talentos (painel RH)
app.use('/api/vagas', vagasRoutes);     // Portal público de vagas

// Frontend estático
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Páginas
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages', 'index.html'));
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages', 'admin-login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages', 'admin-dashboard.html'));
});
app.get('/admissao/:token', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages', 'admissao.html'));
});
app.get('/admin/talentos', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages', 'admin-talentos.html'));
});
app.get('/vagas', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages', 'vagas.html'));
});


app.get('/api/download', async (req, res) => {
  try {
    const fileUrl = req.query.url;
    const filename = String(req.query.filename || 'arquivo')
      .replace(/[\r\n"]/g, '')
      .trim();

    if (!fileUrl) {
      return res.status(400).send('URL não informada.');
    }

    const response = await axios.get(fileUrl, {
      responseType: 'stream',
      timeout: 60000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const contentType = response.headers['content-type'] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    response.data.on('error', (err) => {
      console.error('Erro no stream do download:', err.message);
      if (!res.headersSent) res.status(500).end('Erro ao baixar arquivo.');
      else res.destroy(err);
    });

    response.data.pipe(res);
  } catch (error) {
    console.error('ERRO DOWNLOAD:', error.message);

    if (error.response) {
      console.error('STATUS:', error.response.status);
      console.error('CONTENT-TYPE:', error.response.headers?.['content-type']);
    }

    res.status(500).send('Erro ao baixar arquivo.');
  }
});

// 404 fallback
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Rota não encontrada.' });
  }
  res.sendFile(path.join(frontendPath, 'pages', 'index.html'));
});

// Error handler
app.use(errorHandler);

// Bootstrap admin inicial
const ensureInitialAdmin = async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      const email = process.env.ADMIN_INITIAL_EMAIL || 'admin@tecnosonda.com.br';
      const password = process.env.ADMIN_INITIAL_PASSWORD || 'Tecnosonda@2025';
      const name = process.env.ADMIN_INITIAL_NAME || 'Administrador RH';
      await Admin.create({ name, email, password, role: 'admin' });
      console.log('✅ Admin inicial criado:');
      console.log(`   E-mail: ${email}`);
      console.log(`   Senha:  ${password}`);
    }
  } catch (e) {
    console.error('Erro criando admin inicial:', e.message);
  }
};

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  await ensureInitialAdmin();
  app.listen(PORT, () => {
    console.log(`🚀 Tecnosonda Admissão rodando em http://localhost:${PORT}`);
  });
};

start();
