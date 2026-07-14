// Catálogo de documentos do sistema
const REQUIRED_DOCUMENTS = [
  { type: 'foto_3x4', label: 'Foto 3x4', acceptedFormats: ['jpg', 'jpeg', 'png', 'pdf'] },
  { type: 'ctps', label: 'CTPS', acceptedFormats: ['pdf'] },
  { type: 'cpf_cin', label: 'CPF/CIN', acceptedFormats: ['pdf'] },
  { type: 'rg', label: 'RG', acceptedFormats: ['pdf'] },
  { type: 'titulo_eleitor', label: 'Título de Eleitor', acceptedFormats: ['pdf'] },
  { type: 'comprovante_endereco', label: 'Comprovante de Endereço', acceptedFormats: ['pdf'] },
  { type: 'pis_pasep', label: 'PIS/PASEP', acceptedFormats: ['pdf'] },
  { type: 'escolaridade', label: 'Escolaridade', acceptedFormats: ['pdf'] },
  { type: 'certidao_casamento_nascimento', label: 'Certidão de Casamento/Nascimento', acceptedFormats: ['pdf'] },
  { type: 'conta_bancaria', label: 'Conta Bancária (Itaú/Bradesco)', acceptedFormats: ['pdf'] },
  { type: 'carteira_vacinacao', label: 'Carteira de Vacinação', acceptedFormats: ['pdf'] },
];

const OPTIONAL_DOCUMENTS = [
  { type: 'reservista', label: 'Reservista (se aplicável)', acceptedFormats: ['pdf'] },
  { type: 'dependentes', label: 'Dependentes', acceptedFormats: ['pdf'] },
  { type: 'declaracao_escolar_filhos', label: 'Declaração Escolar dos Filhos', acceptedFormats: ['pdf'] },
  { type: 'carteira_vacinacao_filhos', label: 'Carteira Vacinação dos Filhos', acceptedFormats: ['pdf'] },
  { type: 'carteira_profissional_crea_mte_cft', label: 'Carteira profissional-(CREA-MTE-CFT)', acceptedFormats: ['pdf'] },
  { type: 'CNH', label: 'CNH', acceptedFormats: ['pdf'] },
];

const ALL_DOCUMENTS = [...REQUIRED_DOCUMENTS, ...OPTIONAL_DOCUMENTS];

const getLabelByType = (type) => {
  const doc = ALL_DOCUMENTS.find((d) => d.type === type);
  return doc ? doc.label : type;
};

const getAcceptedFormats = (type) => {
  const doc = ALL_DOCUMENTS.find((d) => d.type === type);
  return doc ? doc.acceptedFormats : ['pdf', 'jpg', 'jpeg', 'png'];
};

const isValidType = (type) => ALL_DOCUMENTS.some((d) => d.type === type);

const isValidFormat = (type, fileExtension) => {
  const doc = ALL_DOCUMENTS.find((d) => d.type === type);
  if (!doc) return false;
  const ext = fileExtension.toLowerCase().replace('.', '');
  return doc.acceptedFormats.includes(ext);
};

const isValidMimeType = (type, mimeType) => {
  const ext = mimeType.split('/')[1]?.toLowerCase();
  if (!ext) return false;
  
  const mimeMap = {
    'pdf': 'pdf',
    'plain': 'pdf',
    'jpeg': 'jpg',
    'png': 'png',
  };
  
  const normalizedExt = mimeMap[ext] || ext;
  return isValidFormat(type, normalizedExt);
};

const isRequired = (type) => REQUIRED_DOCUMENTS.some((d) => d.type === type);

module.exports = {
  REQUIRED_DOCUMENTS,
  OPTIONAL_DOCUMENTS,
  ALL_DOCUMENTS,
  getLabelByType,
  getAcceptedFormats,
  isValidType,
  isValidFormat,
  isValidMimeType,
  isRequired,
};
