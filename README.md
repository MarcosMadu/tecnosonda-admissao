# 🏢 Tecnosonda — Auto Admissão Digital

Sistema web corporativo completo de **Auto Admissão Digital**, com layout moderno e profissional inspirado em plataformas como Fluig/TOTVS. Permite que recém-contratados enviem toda a documentação admissional online, eliminando a necessidade de entrega física.

---

## ✨ Recursos

### Portal do recém-contratado
- Acesso por **token único** ou **link direto** (sem login/senha)
- Formulário em **etapas claras** com animações suaves
- Upload de **13 documentos obrigatórios** + 4 opcionais
- Validação em tempo real (PDF/JPG/PNG, até 30MB)
- Progresso visual em barra dinâmica
- Bloqueio automático após envio
- Reabertura para correção pelo RH

### Portal RH / Administrador
- Login com autenticação JWT
- Dashboard com estatísticas em tempo real
- Listagem completa com busca e filtros
- Cadastro de novos colaboradores com geração automática de link
- Visualização detalhada com download individual de documentos
- Reabertura de formulário com motivo
- Exclusão de colaboradores e documentos individuais
- Layout sidebar premium, responsivo

---

## 🛠️ Tecnologias

**Backend:** Node.js · Express · Mongoose (MongoDB Atlas) · JWT · Bcrypt · Multer · Cloudinary
**Frontend:** HTML5 · CSS3 (Design System próprio) · JavaScript Vanilla · Inter font
**Storage:** MongoDB Atlas (dados) + Cloudinary (arquivos)

---

## 📋 Pré-requisitos

- Node.js 16+
- Conta gratuita em [MongoDB Atlas](https://cloud.mongodb.com)
- Conta gratuita em [Cloudinary](https://cloudinary.com)

---

## 🚀 Instalação e configuração

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Copie o arquivo `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

Edite o `.env`:
```env
PORT=3000
MONGO_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/tecnosonda_admissao
JWT_SECRET=sua_chave_secreta_super_forte_aqui
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
ADMIN_INITIAL_EMAIL=admin@tecnosonda.com.br
ADMIN_INITIAL_PASSWORD=Tecnosonda@2025
APP_URL=http://localhost:3000
```

> **Dica:** gere uma JWT_SECRET forte com:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 3. Iniciar
```bash
npm start
# ou em modo dev (com auto-reload)
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

No primeiro start, será criado automaticamente o admin inicial usando os valores `ADMIN_INITIAL_*` do `.env`.

---

## 🗂️ Estrutura do projeto

```
tecnosonda-admissao/
├── backend/
│   ├── config/
│   │   ├── database.js          # MongoDB
│   │   └── cloudinary.js        # Storage
│   ├── controllers/
│   │   ├── authController.js
│   │   └── employeeController.js
│   ├── middleware/
│   │   ├── auth.js              # JWT
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── Admin.js
│   │   └── Employee.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── admin.js
│   │   └── admission.js
│   ├── services/
│   │   ├── documentsCatalog.js  # Lista de documentos
│   │   └── tokenService.js
│   └── server.js                # Entry point
├── frontend/
│   ├── css/
│   │   ├── main.css             # Design system
│   │   ├── landing.css
│   │   ├── login.css
│   │   ├── dashboard.css
│   │   └── admission.css
│   ├── js/
│   │   ├── utils.js             # Helpers (Toast, Modal, Api)
│   │   ├── dashboard.js
│   │   └── admission.js
│   └── pages/
│       ├── index.html
│       ├── admin-login.html
│       ├── admin-dashboard.html
│       └── admissao.html
├── .env.example
├── package.json
└── README.md
```

---

## 🔐 Status do processo

| Status | Descrição |
|---|---|
| `aguardando_documentacao` | Aguardando colaborador enviar |
| `documentacao_recebida` | Enviado e bloqueado |
| `reaberto_para_correcao` | Reaberto pelo RH para edição |

---

## 📄 Documentos solicitados

**Obrigatórios (13):**
Foto 3x4 · CTPS · CPF/CIN · RG · Título de Eleitor · Comprovante de Endereço · PIS/PASEP · Escolaridade · Certidão de Casamento/Nascimento · Bilhete Único · Conta Bancária · Atestado Médico Admissional · Carteira de Vacinação

**Opcionais:**
Reservista · Dependentes · Declaração escolar dos filhos · Carteira de vacinação dos filhos

> Para alterar a lista, edite `backend/services/documentsCatalog.js`.

---

## 🛡️ Segurança

- Senhas com hash **bcrypt** (10 rounds)
- Autenticação **JWT** com expiração configurável
- **Rate limit** no login (10 tentativas / 15min)
- Headers de segurança via **Helmet**
- Validação rigorosa de tipo e tamanho de arquivos no backend
- Tokens de acesso únicos com alfabeto não-ambíguo (8 caracteres)

---

## 🌐 Endpoints da API

### Públicos (acesso por token)
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/admission/:token` | Carrega dados do colaborador |
| `PUT` | `/api/admission/:token/personal-data` | Salva dados pessoais |
| `POST` | `/api/admission/:token/documents` | Upload de documento |
| `DELETE` | `/api/admission/:token/documents/:docId` | Remove documento |
| `POST` | `/api/admission/:token/submit` | Envia documentação |

### Auth
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/login` | Login admin |
| `GET` | `/api/auth/me` | Dados do admin logado |

### Admin (JWT obrigatório)
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/admin/employees` | Cadastra colaborador + gera link |
| `GET` | `/api/admin/employees` | Lista todos |
| `GET` | `/api/admin/employees/:id` | Detalhes |
| `POST` | `/api/admin/employees/:id/reopen` | Reabre formulário |
| `DELETE` | `/api/admin/employees/:id` | Exclui colaborador |
| `DELETE` | `/api/admin/employees/:id/documents/:docId` | Remove documento |

---

## 🎨 Paleta de cores

| Cor | Hex | Uso |
|---|---|---|
| Primary (azul corporativo) | `#0052cc` | Botões, links, destaques |
| Secondary | `#1e3a8a` | Gradientes |
| Accent | `#00b8d9` | Detalhes |
| Success | `#00875a` | Sucesso, confirmações |
| Warning | `#ff8b00` | Alertas |
| Danger | `#de350b` | Erros, exclusões |

---

## 📦 Deploy

O sistema é stateless e roda em qualquer plataforma Node.js (Render, Railway, Heroku, VPS).
- Configure as variáveis de ambiente
- Use HTTPS em produção (a `APP_URL` deve apontar para o domínio público)
- MongoDB Atlas e Cloudinary já são serviços externos — sem necessidade de servidor adicional

---

## 📝 Licença

© Tecnosonda — Todos os direitos reservados.
Desenvolvimento: Marcos Augusto
