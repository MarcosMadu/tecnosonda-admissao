const Employee = require('../models/Employee');
const axios = require('axios');
const { cloudinary } = require('../config/cloudinary');
const { generateAccessToken } = require('../services/tokenService');
const {
  REQUIRED_DOCUMENTS,
  OPTIONAL_DOCUMENTS,
  ALL_DOCUMENTS,
  getLabelByType,
  isValidType,
  isRequired,
} = require('../services/documentsCatalog');

// ===== ADMIN: criar colaborador =====
exports.create = async (req, res, next) => {
  try {
    const { name, responsavelAdmissao, contrato } = req.body;
    if (!name || !responsavelAdmissao || !contrato) {
      return res.status(400).json({
        message: 'Nome, responsável pela admissão e contrato são obrigatórios.',
      });
    }

    let token;
    let exists = true;
    while (exists) {
      token = generateAccessToken();
      exists = await Employee.findOne({ accessToken: token });
    }

    const employee = await Employee.create({
      name: name.trim(),
      responsavelAdmissao: responsavelAdmissao.trim(),
      contrato: contrato.trim(),
      accessToken: token,
      createdBy: req.admin._id,
    });

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const accessLink = `${baseUrl}/admissao/${token}`;

    res.status(201).json({ employee, accessLink });
  } catch (error) {
    next(error);
  }
};

// ===== ADMIN: listar todos =====
exports.list = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { cpf: { $regex: search, $options: 'i' } },
        { contrato: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ employees, total: employees.length });
  } catch (error) {
    next(error);
  }
};

// ===== ADMIN: detalhes =====
exports.getById = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );
    if (!employee) {
      return res.status(404).json({ message: 'Colaborador não encontrado.' });
    }

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const accessLink = `${baseUrl}/admissao/${employee.accessToken}`;

    res.json({
      employee,
      accessLink,
      requiredDocuments: REQUIRED_DOCUMENTS,
      optionalDocuments: OPTIONAL_DOCUMENTS,
    });
  } catch (error) {
    next(error);
  }
};



// ===== ADMIN: download seguro de documento =====
exports.downloadDocument = async (req, res, next) => {
  try {
    const { id, docId } = req.params;
    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ message: 'Colaborador não encontrado.' });
    }

    const doc = employee.documents.id(docId);
    if (!doc) {
      return res.status(404).json({ message: 'Documento não encontrado.' });
    }

    if (!doc.url && !doc.publicId) {
      return res.status(404).json({ message: 'Documento sem URL registrada.' });
    }

    const isPdf = doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.originalName || '');
    const resourceType = isPdf ? 'raw' : 'image';

    let fileUrl = doc.url;

    // Fallback: se a URL salva estiver ausente ou incorreta, monta pela publicId do Cloudinary.
    if (!fileUrl && doc.publicId) {
      fileUrl = cloudinary.url(doc.publicId, {
        resource_type: resourceType,
        secure: true,
      });
    }

    // Correção defensiva para PDFs salvos acidentalmente com resource_type image.
    if (isPdf && fileUrl && fileUrl.includes('/image/upload/')) {
      fileUrl = fileUrl.replace('/image/upload/', '/raw/upload/');
    }

    // Não usar decodeURIComponent aqui: o Express já decodifica parâmetros e a URL
    // do Cloudinary pode conter caracteres que quebram ao decodificar duas vezes.
    const response = await axios.get(fileUrl, {
      responseType: 'stream',
      timeout: 60000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const filename = (doc.originalName || doc.fileName || 'arquivo')
      .replace(/[\r\n"]/g, '')
      .trim();

    const contentType = doc.mimeType || response.headers['content-type'] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    response.data.on('error', (err) => {
      console.error('Erro no stream do Cloudinary:', err.message);
      if (!res.headersSent) {
        res.status(500).end('Erro ao baixar arquivo.');
      } else {
        res.destroy(err);
      }
    });

    response.data.pipe(res);
  } catch (error) {
    console.error('ERRO DOWNLOAD DOCUMENTO:', error.message);

    if (error.response) {
      console.error('STATUS CLOUDINARY:', error.response.status);
      console.error('CONTENT-TYPE CLOUDINARY:', error.response.headers?.['content-type']);
    }

    return res.status(500).json({
      message: 'Erro ao baixar arquivo.',
      detail: error.response?.status ? `Cloudinary retornou HTTP ${error.response.status}` : error.message,
    });
  }
};

// ===== ADMIN: reabrir formulário =====
exports.reopen = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Colaborador não encontrado.' });
    }

    employee.status = 'reaberto_para_correcao';
    employee.locked = false;
    employee.reopenedAt = new Date();
    employee.reopenReason = reason || 'Reaberto pelo RH para correção.';
    await employee.save();

    res.json({ employee, message: 'Formulário reaberto com sucesso.' });
  } catch (error) {
    next(error);
  }
};

// ===== ADMIN: excluir colaborador =====
exports.remove = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Colaborador não encontrado.' });
    }

    // Apaga documentos do Cloudinary
    for (const doc of employee.documents) {
      if (doc.publicId) {
        try {
          const resourceType = doc.mimeType === 'application/pdf' ? 'raw' : 'image';
          await cloudinary.uploader.destroy(doc.publicId, { resource_type: resourceType });
        } catch (e) {
          console.warn('Falha ao apagar do Cloudinary:', e.message);
        }
      }
    }

    await employee.deleteOne();
    res.json({ message: 'Colaborador excluído com sucesso.' });
  } catch (error) {
    next(error);
  }
};

// ===== ADMIN: excluir documento específico =====
exports.removeDocument = async (req, res, next) => {
  try {
    const { id, docId } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Colaborador não encontrado.' });
    }

    const doc = employee.documents.id(docId);
    if (!doc) {
      return res.status(404).json({ message: 'Documento não encontrado.' });
    }

    if (doc.publicId) {
      try {
        const resourceType = doc.mimeType === 'application/pdf' ? 'raw' : 'image';
        await cloudinary.uploader.destroy(doc.publicId, { resource_type: resourceType });
      } catch (e) {
        console.warn('Falha ao apagar do Cloudinary:', e.message);
      }
    }

    employee.documents.pull({ _id: docId });
    await employee.save();

    res.json({ message: 'Documento excluído com sucesso.', employee });
  } catch (error) {
    next(error);
  }
};

// ===== PUBLIC: acesso por token =====
exports.getByToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const employee = await Employee.findOne({ accessToken: token });
    if (!employee) {
      return res
        .status(404)
        .json({ message: 'Token inválido ou expirado. Procure o RH.' });
    }

    res.json({
      employee: {
        _id: employee._id,
        name: employee.name,
        responsavelAdmissao: employee.responsavelAdmissao,
        contrato: employee.contrato,
        cpf: employee.cpf,
        fullName: employee.fullName,
        funcao: employee.funcao,
        dataNascimento: employee.dataNascimento,
        documents: employee.documents.map((d) => ({
          _id: d._id,
          type: d.type,
          label: d.label,
          originalName: d.originalName,
          uploadedAt: d.uploadedAt,
        })),
        status: employee.status,
        statusLabel: employee.statusLabel,
        locked: employee.locked,
        reopenReason: employee.reopenReason,
      },
      requiredDocuments: REQUIRED_DOCUMENTS,
      optionalDocuments: OPTIONAL_DOCUMENTS,
    });
  } catch (error) {
    next(error);
  }
};

// ===== PUBLIC: salvar dados pessoais =====
exports.savePersonalData = async (req, res, next) => {
  try {
    const { token } = req.params;
    const employee = await Employee.findOne({ accessToken: token });
    if (!employee) {
      return res.status(404).json({ message: 'Token inválido.' });
    }
    if (employee.locked) {
      return res
        .status(403)
        .json({ message: 'Documentação já enviada. Edição bloqueada.' });
    }

    const { cpf, fullName, funcao, dataNascimento } = req.body;
    if (cpf !== undefined) employee.cpf = cpf.trim();
    if (fullName !== undefined) employee.fullName = fullName.trim();
    if (funcao !== undefined) employee.funcao = funcao.trim();
    if (dataNascimento) employee.dataNascimento = new Date(dataNascimento);

    await employee.save();
    res.json({ message: 'Dados salvos com sucesso.', employee });
  } catch (error) {
    next(error);
  }
};

// ===== PUBLIC: upload de documento =====
exports.uploadDocument = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { documentType } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }
    if (!documentType || !isValidType(documentType)) {
      // limpa arquivo já enviado ao Cloudinary
      if (req.file.filename) {
        const resourceType =
          req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
        await cloudinary.uploader
          .destroy(req.file.filename, { resource_type: resourceType })
          .catch(() => {});
      }
      return res.status(400).json({ message: 'Tipo de documento inválido.' });
    }

    const employee = await Employee.findOne({ accessToken: token });
    if (!employee) {
      return res.status(404).json({ message: 'Token inválido.' });
    }
    if (employee.locked) {
      return res.status(403).json({ message: 'Edição bloqueada.' });
    }

    // Remove documento anterior do mesmo tipo (substituição)
    const existing = employee.documents.find((d) => d.type === documentType);
    if (existing && existing.publicId) {
      try {
        const resType = existing.mimeType === 'application/pdf' ? 'raw' : 'image';
        await cloudinary.uploader.destroy(existing.publicId, { resource_type: resType });
      } catch (e) {
        console.warn('Falha ao remover anterior:', e.message);
      }
      employee.documents.pull({ _id: existing._id });
    }

    employee.documents.push({
      type: documentType,
      label: getLabelByType(documentType),
      fileName: req.file.filename,
      originalName: req.file.originalname,
      url: req.file.path,
      publicId: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    await employee.save();

    const newDoc = employee.documents[employee.documents.length - 1];
    res.status(201).json({
      message: 'Documento enviado com sucesso.',
      document: {
        _id: newDoc._id,
        type: newDoc.type,
        label: newDoc.label,
        originalName: newDoc.originalName,
        uploadedAt: newDoc.uploadedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===== PUBLIC: remover documento (próprio colaborador) =====
exports.removeOwnDocument = async (req, res, next) => {
  try {
    const { token, docId } = req.params;
    const employee = await Employee.findOne({ accessToken: token });
    if (!employee) {
      return res.status(404).json({ message: 'Token inválido.' });
    }
    if (employee.locked) {
      return res.status(403).json({ message: 'Edição bloqueada.' });
    }

    const doc = employee.documents.id(docId);
    if (!doc) {
      return res.status(404).json({ message: 'Documento não encontrado.' });
    }

    if (doc.publicId) {
      try {
        const resType = doc.mimeType === 'application/pdf' ? 'raw' : 'image';
        await cloudinary.uploader.destroy(doc.publicId, { resource_type: resType });
      } catch (e) {
        console.warn('Falha ao remover Cloudinary:', e.message);
      }
    }

    employee.documents.pull({ _id: docId });
    await employee.save();

    res.json({ message: 'Documento removido.' });
  } catch (error) {
    next(error);
  }
};

// ===== PUBLIC: enviar documentação final =====
exports.submit = async (req, res, next) => {
  try {
    const { token } = req.params;
    const employee = await Employee.findOne({ accessToken: token });
    if (!employee) {
      return res.status(404).json({ message: 'Token inválido.' });
    }
    if (employee.locked) {
      return res.status(403).json({ message: 'Documentação já enviada.' });
    }

    // Valida dados pessoais
    if (!employee.cpf || !employee.fullName || !employee.funcao || !employee.dataNascimento) {
      return res.status(400).json({
        message: 'Preencha todos os dados pessoais antes de enviar.',
      });
    }

    // Valida documentos obrigatórios
    const uploadedTypes = employee.documents.map((d) => d.type);
    const missing = REQUIRED_DOCUMENTS.filter((d) => !uploadedTypes.includes(d.type));
    if (missing.length > 0) {
      return res.status(400).json({
        message: 'Todos os documentos obrigatórios devem ser anexados.',
        missing: missing.map((d) => d.label),
      });
    }

    employee.status = 'documentacao_recebida';
    employee.locked = true;
    employee.submittedAt = new Date();
    await employee.save();

    res.json({
      message: 'Documentação enviada com sucesso!',
      employee,
    });
  } catch (error) {
    next(error);
  }
};
