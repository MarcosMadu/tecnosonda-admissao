const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    label: { type: String, required: true },
    fileName: String,
    originalName: String,
    url: String,
    publicId: String,
    mimeType: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const employeeSchema = new mongoose.Schema(
  {
    // Cadastro inicial pelo RH
    name: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
    },
    responsavelAdmissao: {
      type: String,
      required: [true, 'Responsável pela admissão é obrigatório'],
      trim: true,
    },
    contrato: {
      type: String,
      required: [true, 'Contrato é obrigatório'],
      trim: true,
    },

    // Token único de acesso
    accessToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Dados preenchidos pelo colaborador
    cpf: { type: String, trim: true },
    fullName: { type: String, trim: true },
    funcao: { type: String, trim: true },
    dataNascimento: { type: Date },

    // Documentos
    documents: [documentSchema],

    // Status do processo
    status: {
      type: String,
      enum: ['aguardando_documentacao', 'documentacao_recebida', 'reaberto_para_correcao'],
      default: 'aguardando_documentacao',
    },

    // Controle de envio
    submittedAt: Date,
    reopenedAt: Date,
    reopenReason: String,

    // Auditoria
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    locked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

employeeSchema.virtual('statusLabel').get(function () {
  const labels = {
    aguardando_documentacao: 'Aguardando Documentação',
    documentacao_recebida: 'Documentação Recebida',
    reaberto_para_correcao: 'Reaberto para Correção',
  };
  return labels[this.status] || this.status;
});

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Employee', employeeSchema);
