// Catálogo de documentos do sistema
const REQUIRED_DOCUMENTS = [
  { type: 'foto_3x4', label: 'Foto 3x4' },
  { type: 'ctps', label: 'CTPS' },
  { type: 'cpf_cin', label: 'CPF/CIN' },
  { type: 'rg', label: 'RG' },
  { type: 'titulo_eleitor', label: 'Título de Eleitor' },
  { type: 'comprovante_endereco', label: 'Comprovante de Endereço' },
  { type: 'pis_pasep', label: 'PIS/PASEP' },
  { type: 'escolaridade', label: 'Escolaridade' },
  { type: 'certidao_casamento_nascimento', label: 'Certidão de Casamento/Nascimento' },
  { type: 'conta_bancaria', label: 'Conta Bancária' },
  { type: 'carteira_vacinacao', label: 'Carteira de Vacinação' },
];

const OPTIONAL_DOCUMENTS = [
  { type: 'reservista', label: 'Reservista (se aplicável)' },
  { type: 'dependentes', label: 'Dependentes' },
  { type: 'declaracao_escolar_filhos', label: 'Declaração Escolar dos Filhos' },
  { type: 'carteira_vacinacao_filhos', label: 'Carteira Vacinação dos Filhos' },
];

const ALL_DOCUMENTS = [...REQUIRED_DOCUMENTS, ...OPTIONAL_DOCUMENTS];

const getLabelByType = (type) => {
  const doc = ALL_DOCUMENTS.find((d) => d.type === type);
  return doc ? doc.label : type;
};

const isValidType = (type) => ALL_DOCUMENTS.some((d) => d.type === type);

const isRequired = (type) => REQUIRED_DOCUMENTS.some((d) => d.type === type);

module.exports = {
  REQUIRED_DOCUMENTS,
  OPTIONAL_DOCUMENTS,
  ALL_DOCUMENTS,
  getLabelByType,
  isValidType,
  isRequired,
};
