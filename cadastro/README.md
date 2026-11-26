# Cadastro de Alunos — Tema Cyberpunk 2077

Mini-projeto de CRUD (Create, Read, Update, Delete) de alunos feito com **Node.js + Express + EJS + MongoDB**.

O foco deste README é explicar **como as três partes do visual se conectam**:

```
views  →  o HTML das páginas (EJS)
public →  os arquivos fixos (CSS, imagens)
static →  a "ponte" do Express que entrega o que está em public
```

---

## 📁 Estrutura da pasta

```
cadastro/
├── server-cadastro.js      # o servidor: conexão, rotas e configuração
├── public/                 # arquivos ESTÁTICOS (não mudam por aluno)
│   └── style.css           # todo o visual do tema 2077 em um só lugar
└── views/                  # TEMPLATES EJS (viram HTML na hora da resposta)
    ├── listar.ejs          # tabela com todos os alunos
    ├── cadastrar.ejs       # formulário de novo aluno
    └── editar.ejs          # formulário de edição
```

---

## 🧩 As três peças, explicadas

### 1. `views/` — o que o usuário vê

São os arquivos **`.ejs`**. EJS é um "HTML com superpoderes": além das tags normais,
ele aceita pedaços de JavaScript entre `<% %>` para mostrar dados do banco.

Exemplo da `listar.ejs` montando uma linha da tabela para cada aluno:

```ejs
<% alunos.forEach(function(aluno) { %>
    <tr>
        <td><%= aluno.nome %></td>
        <td><%= aluno.email %></td>
    </tr>
<% }) %>
```

- `<% ... %>` → **executa** JavaScript (laços, condições). Não aparece na tela.
- `<%= ... %>` → **mostra** o valor na tela (o nome, o email, etc.).

O servidor manda uma view para o navegador com `res.render`:

```javascript
res.render("listar", { alunos })   // procura views/listar.ejs e injeta a lista "alunos"
```

> Por padrão o Express procura as views numa pasta `views`. Aqui dizemos isso
> explicitamente no `server-cadastro.js` com:
> ```javascript
> api.set("views", path.join(__dirname, "views"))
> ```

### 2. `public/` — os arquivos estáticos

"Estático" quer dizer **arquivo que não muda** dependendo do aluno: o CSS, imagens,
ícones, fontes. Diferente das views, que são montadas na hora com dados do banco,
o `style.css` é sempre o mesmo arquivo entregue do jeito que está.

Por isso o visual inteiro foi colocado em **um único `public/style.css`**: fica fácil de
achar, de estudar e de mudar. Trocar uma cor lá reflete em todas as telas.

### 3. `static` — a ponte entre `public/` e o navegador

Um arquivo numa pasta **não fica disponível na internet sozinho**. É preciso avisar o
Express para servir aquela pasta. Isso é feito com o middleware `express.static`:

```javascript
api.use(express.static(path.join(__dirname, "public")))
```

O que essa linha faz, na prática:

| O navegador pede | O Express procura | Resultado |
|------------------|-------------------|-----------|
| `/style.css`     | `public/style.css`| entrega o CSS (HTTP 200) |
| `/logo.png`      | `public/logo.png` | entregaria a imagem, se existisse |

Repare que na URL **não** aparece a palavra `public`. A pasta `public` vira a "raiz"
dos arquivos estáticos. Por isso, dentro das views, o link é:

```html
<link rel="stylesheet" href="/style.css">
```
e **não** `href="/public/style.css"`.

---

## 🔄 Como tudo se conecta (o caminho de uma requisição)

Quando o aluno abre `http://localhost:3001/` no navegador:

1. O navegador faz um **GET /**.
2. O Express cai na rota `api.get("/")`, busca os alunos no MongoDB e chama
   `res.render("listar", { alunos })`.
3. O EJS transforma `views/listar.ejs` em HTML, preenchendo os dados dos alunos.
4. Esse HTML tem `<link rel="stylesheet" href="/style.css">`.
5. O navegador então faz um **segundo** pedido: **GET /style.css**.
6. O `express.static` encontra `public/style.css` e devolve o CSS.
7. O navegador junta HTML + CSS e mostra a página com o tema 2077. 🎨

```
NAVEGADOR ──GET / ─────────────▶ EXPRESS ──▶ MongoDB (busca alunos)
          ◀── HTML (listar.ejs) ── EJS monta a página
NAVEGADOR ──GET /style.css ────▶ express.static ──▶ public/style.css
          ◀── CSS ───────────────
```

---

## ▶️ Como rodar

```bash
cd api-crud-ete/cadastro
node server-cadastro.js
```

Depois acesse no navegador:

- **Listar alunos:** http://localhost:3001/
- **Cadastrar:** http://localhost:3001/novo

> A conexão com o banco usa a variável `DATABASE_URL` do arquivo `.env` da pasta
> de cima (`api-crud-ete/.env`).

> 💡 **Dica importante:** ao alterar qualquer arquivo, **pare o servidor antigo** com
> `Ctrl+C` antes de rodar de novo. Se um processo antigo continuar na porta 3001,
> você pode acabar vendo o código velho (foi o que aconteceu quando o CSS parecia não carregar).

---

## 🗺️ Rotas do CRUD

| Método | Rota            | Operação | O que faz |
|--------|-----------------|----------|-----------|
| GET    | `/`             | Read     | Lista todos os alunos |
| GET    | `/novo`         | —        | Mostra o formulário de cadastro |
| POST   | `/novo`         | Create   | Salva um novo aluno |
| GET    | `/editar/:id`   | Read     | Mostra o formulário de edição preenchido |
| POST   | `/editar/:id`   | Update   | Salva as alterações |
| GET    | `/deletar/:id`  | Delete   | Remove o aluno |

---

## 📝 Campos do aluno

`nome`, `email`, `escola`, `curso`, `matricula`, `telefone`, `dataNascimento`
(e um `criadoEm` preenchido automaticamente na criação).

---

## 📚 Para saber mais

- Servir arquivos estáticos no Express: https://expressjs.com/en/starter/static-files.html
- Usando template engines (EJS) no Express: https://expressjs.com/en/guide/using-template-engines.html
- Documentação do EJS: https://ejs.co/#docs
