# AFQA Vidracaria Platform

Sistema full-stack completo para gestão de vidraçaria — backend, painel web administrativo e app mobile operacional.

---

## Stack

| Camada | Tecnologias |
|--------|------------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy, Alembic, SQLite |
| **Admin Web** | React 18, Vite, TypeScript, CSS puro |
| **Mobile** | React Native 0.81.5, Expo SDK 54, React 19 |

---

## Funcionalidades implementadas

### Autenticação e Acesso
- JWT com perfis: `admin`, `vendedor`, `instalador`
- Multi-tenant por header `X-Tenant-ID`
- Seed automático do admin padrão na inicialização

### Clientes
- CRUD completo (criar, listar, editar, excluir)
- Busca por nome, telefone ou e-mail
- Campos: nome, telefone, e-mail, endereço, CPF/CNPJ, observações

### Orçamentos
- Criação com itens (descrição, quantidade, unidade, preço unitário)
- Cálculo automático de total e desconto
- Status: `draft` → `approved`
- Conversão de orçamento em pedido
- Geração de PDF (`GET /quotes/{id}/pdf`)
- Exclusão de rascunhos (admin)

### Pedidos
- Conversão automática a partir de orçamento
- Fluxo de status: `open` → `em_deslocamento` → `em_andamento` → `installed`
- Cancelamento: `cancelado`
- Atribuição de instalador responsável
- Agendamento de instalação (data)
- Registro de pagamentos (parcial ou total)
- Geração de PDF (`GET /orders/{id}/pdf`)
- Notificação WhatsApp para o cliente

### Funcionários / Equipe
- CRUD completo (admin)
- Perfis: `admin`, `vendedor`, `instalador`
- Status operacional em tempo real: `disponivel`, `em_deslocamento`, `instalando`, `medicao`, `parado`
- Instalador atualiza o próprio status pelo app mobile
- Admin visualiza e altera status de qualquer funcionário

### Dashboard
- Total de clientes, orçamentos e pedidos
- Pedidos abertos (exclui cancelados e instalados)
- Receita do mês
- Valor pendente de recebimento

---

## Perfis de acesso

| Perfil | Admin Web | Mobile — Abas |
|--------|-----------|---------------|
| `admin` | Acesso total | Painel, Clientes, Orçamentos, Pedidos, Equipe, Calculadora, Site |
| `vendedor` | — | Painel, Clientes, Orçamentos, Pedidos, Calculadora |
| `instalador` | — | Painel (só seus pedidos), Pedidos (somente atribuídos), Calculadora |

---

## Estrutura do projeto

```
api-vidracaria/
├── backend/          # API FastAPI + banco + migrações Alembic
├── admin-web/        # Painel administrativo (React + TypeScript)
├── mobile/           # App operacional (React Native + Expo)
└── docker-compose.yml
```

---

## Credenciais padrão (seed)

- **Email:** `admin@afqa.com`
- **Senha:** `Admin@123`
- **Tenant:** `afqa`

---

## Como rodar (sem Docker)

### 1. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API + Swagger: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Admin Web

```bash
cd admin-web
npm install
npm run dev
```

- Acesse: `http://localhost:5173`

### 3. App Mobile (celular físico)

```bash
cd mobile
npm install
npx expo start --clear
```

- Instale o **Expo Go** no celular (atualizado para SDK 54)
- Celular e PC na **mesma rede Wi-Fi**
- Escaneie o QR code com o Expo Go
- Na tela de login do app, informe a URL do backend: `http://[IP_DO_PC]:8000`
- Use o botão **Testar** para verificar a conexão antes de entrar

> **Dica:** Se o QR não conectar, use `npx expo start --tunnel --clear`

---

## Como rodar (com Docker)

```bash
docker compose down
docker compose up --build
```

- API: `http://localhost:8000/docs`
- Web Admin: `http://localhost:5173`

> O Docker já roda `alembic upgrade head` antes de subir a API.

---

## Banco de dados e Migrações (Alembic)

```bash
# Aplicar migrações
alembic upgrade head

# Criar nova migração
alembic revision --autogenerate -m "descricao"

# Reverter última migração
alembic downgrade -1
```

---

## Endpoints da API

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | Login (retorna JWT) |
| GET | `/auth/me` | Dados do usuário logado |

### Clientes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/clients` | Listar (suporta `?search=`) |
| POST | `/clients` | Criar |
| GET | `/clients/{id}` | Buscar por ID |
| PUT | `/clients/{id}` | Atualizar |
| DELETE | `/clients/{id}` | Excluir |

### Orçamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/quotes` | Listar (suporta `?status=`) |
| POST | `/quotes` | Criar com itens |
| GET | `/quotes/{id}` | Buscar por ID |
| PUT | `/quotes/{id}` | Atualizar / aprovar |
| DELETE | `/quotes/{id}` | Excluir rascunho |
| POST | `/quotes/{id}/items` | Adicionar item |
| GET | `/quotes/{id}/pdf` | Gerar PDF |

### Pedidos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/orders` | Listar (suporta `?status=`) |
| POST | `/orders/from-quote/{quote_id}` | Converter orçamento em pedido |
| GET | `/orders/{id}` | Buscar por ID |
| PUT | `/orders/{id}` | Atualizar status / instalador / agendamento |
| POST | `/orders/{id}/payments` | Registrar pagamento |
| GET | `/orders/{id}/pdf` | Gerar PDF |
| POST | `/orders/{id}/notify-whatsapp` | Notificar cliente via WhatsApp |

### Funcionários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/employees` | Listar |
| POST | `/employees` | Criar (admin) |
| GET | `/employees/me` | Perfil do usuário atual |
| PATCH | `/employees/me/status` | Atualizar próprio status |
| GET | `/employees/{id}` | Buscar por ID |
| PATCH | `/employees/{id}` | Editar (admin) |
| PATCH | `/employees/{id}/status` | Alterar status (admin) |
| DELETE | `/employees/{id}` | Excluir (admin) |

### Dashboard
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/dashboard/summary` | Resumo geral |

---

## Fluxo operacional

```
1. Admin cria cliente
2. Vendedor/Admin cria orçamento (status: draft)
3. Admin aprova orçamento (status: approved)
4. Admin converte orçamento em pedido
5. Admin atribui instalador ao pedido
6. Instalador atualiza status: open → em_deslocamento → em_andamento → installed
7. Admin registra pagamento
8. Admin gera PDF e envia WhatsApp ao cliente
```

---

## Variáveis de ambiente (`backend/.env`)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `SECRET_KEY` | `change-me-in-production` | Chave JWT |
| `DATABASE_URL` | `sqlite:///./afqa.db` | URL do banco |
| `DEFAULT_TENANT_ID` | `afqa` | Tenant padrão |
| `DEFAULT_ADMIN_EMAIL` | `admin@afqa.com` | E-mail do admin seed |
| `DEFAULT_ADMIN_PASSWORD` | `Admin@123` | Senha do admin seed |
| `AUTO_CREATE_TABLES` | `false` | Criar tabelas sem Alembic |
| `PAYMENT_PROVIDER` | `mock` | Provedor de pagamento |
| `WHATSAPP_PROVIDER` | `mock` | Provedor WhatsApp |

---

## Multi-tenant

Todas as rotas protegidas exigem o header:

```http
X-Tenant-ID: afqa
Authorization: Bearer <token>
```

O JWT carrega o `tenant_id`. O backend rejeita tokens com tenant divergente do header.

---

## Produção (próximos passos)

- Substituir SQLite por PostgreSQL
- Configurar HTTPS com domínio próprio
- Integrar provedor real de pagamento (Mercado Pago, Stripe)
- Integrar WhatsApp real (Evolution API, Twilio)
- Adicionar testes automatizados (pytest + Vitest)
- Configurar CI/CD com GitHub Actions
- Publicar app mobile na Play Store / App Store com EAS Build
