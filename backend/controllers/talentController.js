const axios = require('axios');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const { cloudinary } = require('../config/cloudinary');

/* ============================================================
 * HELPERS
 * ========================================================== */

// Monta um resumo da vaga já com contagem de candidatos e vagas restantes
const decorateJobs = async (jobs) => {
  const ids = jobs.map((j) => j._id);
  const counts = await Candidate.aggregate([
    { $match: { job: { $in: ids } } },
    { $group: { _id: '$job', total: { $sum: 1 } } },
  ]);

  const map = {};
  counts.forEach((c) => {
    map[String(c._id)] = c.total;
  });

  return jobs.map((job) => {
    const obj = job.toObject ? job.toObject() : job;
    const totalCandidatos = map[String(job._id)] || 0;
    const limite = job.quantidadeVagas || null;

    return {
      ...obj,
      totalCandidatos,
      vagasRestantes: limite ? Math.max(limite - totalCandidatos, 0) : null,
      limiteAtingido: limite ? totalCandidatos >= limite : false,
    };
  });
};

const destroyCurriculo = async (candidate) => {
  if (candidate?.curriculo?.publicId) {
    try {
      await cloudinary.uploader.destroy(candidate.curriculo.publicId, {
        resource_type: 'raw',
      });
    } catch (e) {
      console.warn('Falha ao remover currículo do Cloudinary:', e.message);
    }
  }
};

/* ============================================================
 * ADMIN — VAGAS
 * ========================================================== */

// POST /api/talent/jobs
exports.createJob = async (req, res, next) => {
  try {
    const {
      titulo,
      setor,
      local,
      tipoContrato,
      descricao,
      requisitos,
      quantidadeVagas,
    } = req.body;

    if (!titulo || !String(titulo).trim()) {
      return res.status(400).json({ message: 'O título da vaga é obrigatório.' });
    }

    let limite = null;
    if (quantidadeVagas !== undefined && quantidadeVagas !== null && quantidadeVagas !== '') {
      limite = Number(quantidadeVagas);
      if (!Number.isInteger(limite) || limite < 1) {
        return res.status(400).json({
          message: 'A quantidade de vagas deve ser um número inteiro maior que zero, ou deixe em branco para vagas ilimitadas.',
        });
      }
    }

    const job = await Job.create({
      titulo: String(titulo).trim(),
      setor: setor?.trim(),
      local: local?.trim(),
      tipoContrato: tipoContrato || 'CLT',
      descricao: descricao?.trim(),
      requisitos: requisitos?.trim(),
      quantidadeVagas: limite,
      createdBy: req.admin._id,
    });

    res.status(201).json({ job, message: 'Vaga aberta com sucesso.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/talent/jobs
exports.listJobs = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const jobs = await Job.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ jobs: await decorateJobs(jobs), total: jobs.length });
  } catch (error) {
    next(error);
  }
};

// PUT /api/talent/jobs/:id
exports.updateJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Vaga não encontrada.' });

    const campos = ['titulo', 'setor', 'local', 'tipoContrato', 'descricao', 'requisitos'];
    campos.forEach((c) => {
      if (req.body[c] !== undefined) job[c] = String(req.body[c]).trim();
    });

    if (req.body.quantidadeVagas !== undefined) {
      const valor = req.body.quantidadeVagas;
      if (valor === null || valor === '') {
        job.quantidadeVagas = null;
      } else {
        const limite = Number(valor);
        if (!Number.isInteger(limite) || limite < 1) {
          return res.status(400).json({ message: 'Quantidade de vagas inválida.' });
        }
        const totalCandidatos = await Candidate.countDocuments({ job: job._id });
        if (limite < totalCandidatos) {
          return res.status(400).json({
            message: `Esta vaga já possui ${totalCandidatos} candidato(s). O limite não pode ser menor que isso.`,
          });
        }
        job.quantidadeVagas = limite;
      }
    }

    if (req.body.status && ['aberta', 'fechada'].includes(req.body.status)) {
      job.status = req.body.status;
      if (job.status === 'aberta') job.fechadaAutomaticamente = false;
    }

    await job.save();
    res.json({ job, message: 'Vaga atualizada com sucesso.' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/talent/jobs/:id  (remove a vaga e todas as candidaturas ligadas a ela)
exports.removeJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Vaga não encontrada.' });

    const candidates = await Candidate.find({ job: job._id });
    for (const candidate of candidates) {
      await destroyCurriculo(candidate);
    }
    await Candidate.deleteMany({ job: job._id });
    await job.deleteOne();

    res.json({
      message: `Vaga excluída. ${candidates.length} candidatura(s) removida(s).`,
    });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
 * ADMIN — CANDIDATOS
 * ========================================================== */

// GET /api/talent/candidates
exports.listCandidates = async (req, res, next) => {
  try {
    const { jobId, status, search } = req.query;
    const filter = {};
    if (jobId) filter.job = jobId;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { telefone: { $regex: search, $options: 'i' } },
        { jobTitulo: { $regex: search, $options: 'i' } },
      ];
    }

    const candidates = await Candidate.find(filter)
      .populate('job', 'titulo status quantidadeVagas')
      .sort({ createdAt: -1 });

    res.json({ candidates, total: candidates.length });
  } catch (error) {
    next(error);
  }
};

// GET /api/talent/candidates/:id
exports.getCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate(
      'job',
      'titulo setor local tipoContrato quantidadeVagas status'
    );
    if (!candidate) {
      return res.status(404).json({ message: 'Candidato não encontrado.' });
    }
    res.json({ candidate });
  } catch (error) {
    next(error);
  }
};

// PUT /api/talent/candidates/:id/status
exports.updateCandidateStatus = async (req, res, next) => {
  try {
    const { status, observacoes } = req.body;
    const permitidos = ['recebido', 'em_analise', 'aprovado', 'reprovado'];

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidato não encontrado.' });
    }

    if (status) {
      if (!permitidos.includes(status)) {
        return res.status(400).json({ message: 'Status inválido.' });
      }
      candidate.status = status;
      if (status === 'aprovado' && !candidate.admissaoIniciadaEm) {
        candidate.admissaoIniciadaEm = new Date();
      }
    }

    if (observacoes !== undefined) candidate.observacoes = String(observacoes).trim();

    await candidate.save();
    res.json({ candidate, message: 'Candidato atualizado com sucesso.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/talent/candidates/:id/curriculo/download
exports.downloadCurriculo = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidato não encontrado.' });
    }
    if (!candidate.curriculo || (!candidate.curriculo.url && !candidate.curriculo.publicId)) {
      return res.status(404).json({ message: 'Currículo não encontrado.' });
    }

    let fileUrl = candidate.curriculo.url;
    if (!fileUrl && candidate.curriculo.publicId) {
      fileUrl = cloudinary.url(candidate.curriculo.publicId, {
        resource_type: 'raw',
        secure: true,
      });
    }

    // Currículos são sempre salvos como raw
    if (fileUrl && fileUrl.includes('/image/upload/')) {
      fileUrl = fileUrl.replace('/image/upload/', '/raw/upload/');
    }

    const response = await axios.get(fileUrl, {
      responseType: 'stream',
      timeout: 60000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const filename = (candidate.curriculo.originalName || 'curriculo')
      .replace(/[\r\n"]/g, '')
      .trim();

    const contentType =
      candidate.curriculo.mimeType ||
      response.headers['content-type'] ||
      'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    response.data.on('error', (err) => {
      console.error('Erro no stream do currículo:', err.message);
      if (!res.headersSent) res.status(500).end('Erro ao baixar arquivo.');
      else res.destroy(err);
    });

    response.data.pipe(res);
  } catch (error) {
    console.error('ERRO DOWNLOAD CURRÍCULO:', error.message);
    return res.status(500).json({ message: 'Erro ao baixar currículo.' });
  }
};

// DELETE /api/talent/candidates/:id
exports.removeCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidato não encontrado.' });
    }

    await destroyCurriculo(candidate);
    const jobId = candidate.job;
    await candidate.deleteOne();

    // Se a vaga havia sido fechada automaticamente pelo limite, reabre.
    const job = await Job.findById(jobId);
    if (job && job.fechadaAutomaticamente && job.status === 'fechada') {
      const total = await Candidate.countDocuments({ job: job._id });
      if (!job.quantidadeVagas || total < job.quantidadeVagas) {
        job.status = 'aberta';
        job.fechadaAutomaticamente = false;
        await job.save();
      }
    }

    res.json({ message: 'Candidato excluído com sucesso.' });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
 * ADMIN — ESTATÍSTICAS
 * ========================================================== */

// GET /api/talent/stats
exports.stats = async (req, res, next) => {
  try {
    const [totalVagas, vagasAbertas, totalCandidatos] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: 'aberta' }),
      Candidate.countDocuments(),
    ]);

    const porStatus = await Candidate.aggregate([
      { $group: { _id: '$status', total: { $sum: 1 } } },
    ]);

    const porFuncao = await Candidate.aggregate([
      { $group: { _id: '$jobTitulo', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const ultimos7Dias = await Candidate.countDocuments({
      createdAt: { $gte: seteDiasAtras },
    });

    const statusMap = { recebido: 0, em_analise: 0, aprovado: 0, reprovado: 0 };
    porStatus.forEach((s) => {
      statusMap[s._id] = s.total;
    });

    res.json({
      totalVagas,
      vagasAbertas,
      totalCandidatos,
      ultimos7Dias,
      porStatus: statusMap,
      porFuncao: porFuncao.map((f) => ({ funcao: f._id || 'Não informado', total: f.total })),
    });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
 * PÚBLICO — PORTAL DE VAGAS
 * ========================================================== */

// GET /api/vagas — vagas abertas e ainda com posições disponíveis
exports.listPublicJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ status: 'aberta' }).sort({ createdAt: -1 });
    const decorated = await decorateJobs(jobs);

    const disponiveis = decorated
      .filter((j) => !j.limiteAtingido)
      .map((j) => ({
        _id: j._id,
        titulo: j.titulo,
        setor: j.setor,
        local: j.local,
        tipoContrato: j.tipoContrato,
        descricao: j.descricao,
        requisitos: j.requisitos,
        vagasRestantes: j.vagasRestantes, // null = ilimitado
        createdAt: j.createdAt,
      }));

    res.json({ jobs: disponiveis, total: disponiveis.length });
  } catch (error) {
    next(error);
  }
};

// POST /api/vagas/candidatar — envio do currículo (multipart/form-data)
exports.apply = async (req, res, next) => {
  const limparUpload = async () => {
    if (req.file?.filename) {
      await cloudinary.uploader
        .destroy(req.file.filename, { resource_type: 'raw' })
        .catch(() => {});
    }
  };

  try {
    const { nome, idade, sexo, email, telefone, cidade, jobId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Anexe o seu currículo (PDF, DOC ou DOCX).' });
    }

    if (!nome || !idade || !sexo || !telefone || !jobId) {
      await limparUpload();
      return res.status(400).json({
        message: 'Preencha nome, idade, sexo, contato e selecione a vaga desejada.',
      });
    }

    const idadeNum = Number(idade);
    if (!Number.isInteger(idadeNum) || idadeNum < 14 || idadeNum > 90) {
      await limparUpload();
      return res.status(400).json({ message: 'Informe uma idade válida.' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      await limparUpload();
      return res.status(404).json({ message: 'Vaga não encontrada.' });
    }
    if (job.status !== 'aberta') {
      await limparUpload();
      return res.status(409).json({ message: 'Esta vaga não está mais recebendo currículos.' });
    }

    // Trava do limite de vagas
    const totalCandidatos = await Candidate.countDocuments({ job: job._id });
    if (job.quantidadeVagas && totalCandidatos >= job.quantidadeVagas) {
      job.status = 'fechada';
      job.fechadaAutomaticamente = true;
      await job.save();
      await limparUpload();
      return res.status(409).json({
        message: 'Esta vaga já atingiu o limite de candidaturas e foi encerrada.',
      });
    }

    // Evita candidatura duplicada na mesma vaga (mesmo telefone ou e-mail)
    const duplicadoFiltro = [{ telefone: String(telefone).trim() }];
    if (email) duplicadoFiltro.push({ email: String(email).trim().toLowerCase() });

    const duplicado = await Candidate.findOne({ job: job._id, $or: duplicadoFiltro });
    if (duplicado) {
      await limparUpload();
      return res.status(409).json({
        message: 'Você já se candidatou a esta vaga. Aguarde o contato do nosso RH.',
      });
    }

    const candidate = await Candidate.create({
      nome: String(nome).trim(),
      idade: idadeNum,
      sexo,
      email: email ? String(email).trim() : undefined,
      telefone: String(telefone).trim(),
      cidade: cidade ? String(cidade).trim() : undefined,
      job: job._id,
      jobTitulo: job.titulo,
      curriculo: {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        url: req.file.path,
        publicId: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });

    // Fecha a vaga automaticamente se atingiu o limite com esta candidatura
    if (job.quantidadeVagas && totalCandidatos + 1 >= job.quantidadeVagas) {
      job.status = 'fechada';
      job.fechadaAutomaticamente = true;
      await job.save();
    }

    res.status(201).json({
      message: 'Currículo enviado com sucesso! Nosso RH entrará em contato.',
      candidate: {
        _id: candidate._id,
        nome: candidate.nome,
        jobTitulo: candidate.jobTitulo,
      },
    });
  } catch (error) {
    await limparUpload();
    next(error);
  }
};
