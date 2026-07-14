const mongoose = require('mongoose');

const curriculoSchema = new mongoose.Schema(
  {
    originalName: String,
    fileName: String,
    url: String,
    publicId: String,
    mimeType: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const candidateSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
    },
    idade: {
      type: Number,
      required: [true, 'Idade é obrigatória'],
      min: [14, 'Idade mínima permitida é 14 anos'],
      max: [90, 'Idade inválida'],
    },
    sexo: {
      type: String,
      enum: ['masculino', 'feminino', 'outro', 'nao_informar'],
      required: [true, 'Sexo é obrigatório'],
    },
    email: { type: String, trim: true, lowercase: true },
    telefone: {
      type: String,
      required: [true, 'Telefone de contato é obrigatório'],
      trim: true,
    },
    cidade: { type: String, trim: true },

    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Vaga é obrigatória'],
      index: true,
    },
    // Snapshot do título — preserva histórico mesmo se a vaga for excluída
    jobTitulo: { type: String, trim: true },

    curriculo: curriculoSchema,

    status: {
      type: String,
      enum: ['recebido', 'em_analise', 'aprovado', 'reprovado'],
      default: 'recebido',
      index: true,
    },

    observacoes: { type: String, trim: true },

    // Preenchido quando o RH inicia a auto admissão a partir do candidato
    admissaoIniciadaEm: Date,
  },
  { timestamps: true }
);

candidateSchema.virtual('statusLabel').get(function () {
  const labels = {
    recebido: 'Currículo Recebido',
    em_analise: 'Em Análise',
    aprovado: 'Aprovado',
    reprovado: 'Reprovado',
  };
  return labels[this.status] || this.status;
});

candidateSchema.virtual('sexoLabel').get(function () {
  const labels = {
    masculino: 'Masculino',
    feminino: 'Feminino',
    outro: 'Outro',
    nao_informar: 'Prefiro não informar',
  };
  return labels[this.sexo] || this.sexo;
});

candidateSchema.set('toJSON', { virtuals: true });
candidateSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Candidate', candidateSchema);
