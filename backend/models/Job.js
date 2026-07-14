const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, 'Título da vaga é obrigatório'],
      trim: true,
    },
    setor: { type: String, trim: true },
    local: { type: String, trim: true },
    tipoContrato: {
      type: String,
      enum: ['CLT', 'PJ', 'Temporário', 'Estágio', 'Aprendiz', 'Banco de Talentos'],
      default: 'CLT',
    },
    descricao: { type: String, trim: true },
    requisitos: { type: String, trim: true },

    // null / undefined = sem limite de candidaturas
    quantidadeVagas: {
      type: Number,
      min: [1, 'A quantidade de vagas deve ser no mínimo 1'],
      default: null,
    },

    status: {
      type: String,
      enum: ['aberta', 'fechada'],
      default: 'aberta',
    },

    // Fechada automaticamente ao atingir o limite de candidaturas
    fechadaAutomaticamente: { type: Boolean, default: false },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

jobSchema.virtual('statusLabel').get(function () {
  const labels = { aberta: 'Aberta', fechada: 'Fechada' };
  return labels[this.status] || this.status;
});

jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Job', jobSchema);
