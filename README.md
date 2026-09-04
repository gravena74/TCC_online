# Cafofo do Pet 🐾

App de agendamento de serviços para pets (banho, tosa e veterinário), web responsivo.

- **Frontend:** HTML + CSS + JavaScript puro (sem build step), várias páginas estáticas
  consumindo a API via `fetch`
- **Backend:** Node.js + Express
- **Banco de dados:** SQLite (via `node:sqlite`, módulo nativo do Node — não usa
  nenhum binário compilado de terceiros, então não é bloqueado por políticas
  corporativas de segurança como Windows Application Control/AppLocker, nem
  exige toolchain de compilação na máquina)

> **Requisito:** Node.js **22.5 ou mais recente** (o `node:sqlite` foi introduzido nessa
> versão). Se aparecer `ExperimentalWarning: SQLite is an experimental feature`, é
> esperado — pode ignorar, o recurso funciona normalmente.

## Estrutura do projeto

```
cafofo-do-pet/
├── backend/      API REST (Express + SQLite)
└── frontend/     Páginas HTML/CSS/JS estáticas (uma por tela)
```

## Como rodar localmente

Você vai precisar de **Node.js 18+** instalado. Abra dois terminais.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

A API sobe em `http://localhost:3333`. Na primeira execução, os serviços padrão (Banho, Tosa,
Veterinário) são inseridos automaticamente no banco (`backend/db/cafofo.sqlite3`, criado
sozinho).

### 2. Frontend

O frontend é HTML/CSS/JS puro, sem build step. Basta servir a pasta `frontend/` como arquivos
estáticos — por exemplo, com a extensão Live Server do VS Code, `npx serve frontend` ou o próprio
Apache do XAMPP apontando para essa pasta.

Por padrão as páginas chamam a API em `http://localhost:3333/api` (ver `frontend/js/config.js`).
Se precisar apontar para outra URL, defina `window.CAFOFO_API_URL = "https://sua-api"` num
`<script>` antes de importar `js/config.js`, ou edite o valor padrão no próprio arquivo.

Abra `frontend/index.html` pelo servidor estático escolhido (ou o IP da máquina, no celular, na
mesma rede) para testar.

## Fluxo do app

1. **Boas-vindas** (`index.html`) — nome + telefone, dispara o código de verificação.
2. **Verificação** (`verificar.html`) — código de 4 dígitos.
   - **Modo de desenvolvimento:** o código é sempre `1234` e aparece na tela e na resposta da
     API, para você testar sem precisar de um provedor de SMS pago.
3. **Escolha do pet** (`pets.html`) — lista os pets cadastrados, com opção de cadastrar um novo (`+`).
4. **Cadastro de pet** (`pets-novo.html`) — foto, nome, idade, raça e porte.
5. **Agendar** (`agendar.html`) — escolhe o serviço, a data no calendário e o horário disponível.
6. **Checkout** (`checkout.html`) — como o pet vai e volta (você leva/retira, ou buscamos/entregamos
   em casa — com endereço, se necessário).
7. **Resumo** (`resumo.html`) — confirma valores e finaliza o agendamento.
8. **Meus agendamentos** (`agendamentos.html`) — acompanhar e cancelar agendamentos.

## Sobre o código de verificação (OTP)

Por padrão o projeto está em **modo simulado**: nenhum SMS é enviado de verdade, o código é
sempre `1234` e a API devolve esse código na resposta (`devCode`) só para facilitar o
desenvolvimento — é por isso que ele aparece na tela de verificação.

Quando quiser conectar um provedor real (ex: Twilio, Zenvia), edite
`backend/routes/auth.js`: troque a geração do código fixo por um código aleatório, remova o
`devCode` da resposta e adicione a chamada ao provedor de SMS na rota `POST /api/auth/request-otp`.

## Próximos passos sugeridos

- Trocar o SQLite por Postgres/MySQL quando for para produção (o `better-sqlite3` é ótimo para
  desenvolvimento, mas não escala para múltiplos servidores).
- Adicionar um provedor de SMS real para o OTP.
- Hospedar o backend (Render, Railway, Fly.io) e o frontend estático (Vercel, Netlify, GitHub
  Pages) com HTTPS.
- Tela de perfil do usuário e edição/remoção de pet.
- Painel administrativo para o pet shop gerenciar agendamentos.
