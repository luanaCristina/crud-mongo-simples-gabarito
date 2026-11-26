> 📚 **Repositório gabarito** das aulas de CRUD (ETE Pernambuco). Use para conferir o seu código.
> Para rodar: copie `.env.example` para `.env` e preencha com a **sua** string de conexão do MongoDB.

# API CRUD com Node.js, Express, EJS e MongoDB

Esta é uma API web simples que faz um **CRUD** (Create, Read, Update, Delete) de pessoas
(nome e sobrenome) usando **Node.js** com **Express**, renderizando páginas HTML com **EJS**
e salvando os dados no **MongoDB Atlas**.

Este README explica **cada linha** do arquivo `server.js` para você entender exatamente o que
cada parte faz.

---

## 📦 Tecnologias usadas

| Biblioteca | Para que serve |
|------------|----------------|
| **express** | Criar o servidor web e definir as rotas (URLs) |
| **mongodb** | Driver oficial para conversar com o banco MongoDB |
| **ejs** | Motor de templates que transforma arquivos `.ejs` em HTML |
| **dotenv** | Ler variáveis de ambiente do arquivo `.env` (ex: senha do banco) |
| **nodemon** | Reiniciar o servidor automaticamente a cada alteração (desenvolvimento) |

---

## 📁 Estrutura do projeto

```
api-crud-ete/
├── server.js          # Toda a lógica do servidor e das rotas
├── .env               # Guarda a string de conexão do MongoDB (NÃO vai pro Git)
├── package.json       # Dependências e scripts do projeto
└── views/             # Páginas EJS que o servidor renderiza
    ├── index.ejs      # Formulário de cadastro
    ├── show.ejs       # Tabela com todos os registros
    └── edit.ejs       # Formulário de edição
```

---

## 🧩 Explicação do `server.js` linha por linha

### 1. Importação das bibliotecas

```javascript
const express = require("express")
const { MongoClient } = require("mongodb")
const ObjectId = require("mongodb").ObjectId
const dotenv = require("dotenv")
```

- `const express = require("express")` → importa o Express, que é o framework que cria o servidor web.
- `const { MongoClient } = require("mongodb")` → importa a classe `MongoClient`. É ela que abre a conexão com o banco MongoDB. As chaves `{ }` pegam só o `MongoClient` de dentro do pacote `mongodb`.
- `const ObjectId = require("mongodb").ObjectId` → importa o `ObjectId`. No MongoDB, cada documento tem um campo `_id` que **não** é um texto comum, e sim um tipo especial chamado ObjectId. Precisamos dele para buscar/editar/deletar um registro pelo seu id.
- `const dotenv = require("dotenv")` → importa o dotenv, que lê o arquivo `.env`.

### 2. Carregar o arquivo `.env`

```javascript
dotenv.config()
```

- Essa linha lê o arquivo `.env` e coloca o conteúdo dentro de `process.env`.
- ⚠️ **Atenção:** os parênteses `()` são obrigatórios. Sem eles (`dotenv.config`), a função não é executada e as variáveis nunca são carregadas. Esse foi exatamente o erro inicial deste projeto.

### 3. Criar a aplicação e pegar a URL do banco

```javascript
const api = express()
const url = process.env.DATABASE_URL
```

- `const api = express()` → cria a aplicação Express. Tudo (rotas, configurações) vai ser configurado nesse objeto `api`.
- `const url = process.env.DATABASE_URL` → lê a variável `DATABASE_URL` que veio do `.env`. É a string de conexão do MongoDB Atlas (ex: `mongodb+srv://usuario:senha@cluster...`).

### 4. Criar o cliente do MongoDB

```javascript
const client = new MongoClient(url)
let collection
```

- `const client = new MongoClient(url)` → cria o cliente de conexão usando a URL. Nesse momento ele ainda **não** conectou, só preparou o cliente.
- `let collection` → declara a variável `collection` vazia. Ela vai guardar a coleção do banco depois que a conexão for feita (lá embaixo, dentro da função `iniciar`). Usamos `let` porque o valor dela muda depois. Ela fica aqui no topo para que **todas as rotas** consigam usá-la.

### 5. Configurar o Express

```javascript
api.set('view engine', 'ejs')
api.use(express.urlencoded({ extended: true }))
```

- `api.set('view engine', 'ejs')` → diz ao Express que vamos usar o EJS como motor de templates. Assim o `res.render('index.ejs')` sabe transformar o arquivo `.ejs` em HTML.
- `api.use(express.urlencoded({ extended: true }))` → ativa um "middleware" que lê os dados enviados pelos formulários HTML (os campos `name` e `surname`). Sem essa linha, `req.body` chegaria vazio.

### 6. Rota inicial — mostrar o formulário de cadastro (READ da tela)

```javascript
api.get('/index', (req, res) => {
    res.render('index.ejs')
})
```

- `api.get('/index', ...)` → quando alguém acessar `http://localhost:3000/index` pelo navegador (método GET), executa esta função.
- `req` é a requisição (o que o cliente mandou) e `res` é a resposta (o que vamos devolver).
- `res.render('index.ejs')` → renderiza a página `views/index.ejs` (o formulário de cadastro) e envia como HTML.

### 7. Listar todos os registros — **R** (Read)

```javascript
api.get('/show', async (req, res) => {
    const crud = await collection.find().toArray()
    res.render('show.ejs', { crud })
})
```

- `async (req, res) => {...}` → a função é `async` porque vamos acessar o banco, e isso leva tempo. O `await` só pode ser usado dentro de uma função `async`.
- `collection.find()` → busca **todos** os documentos da coleção. `.toArray()` transforma o resultado em um array (lista) de objetos.
- `await` → espera o banco responder antes de continuar.
- `res.render('show.ejs', { crud })` → renderiza a página `show.ejs` e envia junto a lista `crud`. Dentro do EJS, o `<% crud.forEach(...) %>` usa essa lista para montar a tabela.

### 8. Criar um novo registro — **C** (Create)

```javascript
api.post('/show', async (req, res) => {
    await collection.insertOne({
        name: req.body.name,
        surname: req.body.surname
    })
    res.redirect('/show')
})
```

- `api.post('/show', ...)` → responde ao envio do formulário de cadastro (método POST para `/show`).
- `req.body.name` e `req.body.surname` → pegam os valores digitados no formulário (graças ao `express.urlencoded` configurado antes).
- `collection.insertOne({...})` → insere um novo documento na coleção com os campos `name` e `surname`.
- `res.redirect('/show')` → depois de salvar, redireciona o navegador para a lista de registros, mostrando o novo item.

### 9. Mostrar o formulário de edição

```javascript
api.get('/edit/:id', async (req, res) => {
    const crud = await collection.find({ _id: new ObjectId(req.params.id) }).toArray()
    res.render('edit.ejs', { crud })
})
```

- `/edit/:id` → o `:id` é um parâmetro na URL. Ao clicar em "Editar", o link vira algo como `/edit/6adac102b85231147ee459bd`.
- `req.params.id` → lê esse id da URL.
- `new ObjectId(req.params.id)` → converte o texto do id para o tipo ObjectId que o MongoDB entende.
- `collection.find({ _id: ... })` → busca **apenas** o documento com aquele id.
- `res.render('edit.ejs', { crud })` → mostra o formulário de edição já preenchido com os dados atuais.

### 10. Atualizar um registro — **U** (Update)

```javascript
api.post('/edit/:id', async (req, res) => {
    await collection.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
            $set: {
                name: req.body.name,
                surname: req.body.surname
            }
        }
    )
    res.redirect('/show')
})
```

- `collection.updateOne(filtro, mudança)` → atualiza **um** documento.
- O **primeiro** objeto `{ _id: ... }` é o **filtro**: qual documento atualizar (o que tiver aquele id).
- O **segundo** objeto usa `$set` para dizer **quais campos** mudar (`name` e `surname`). O `$set` é um operador do MongoDB que altera só os campos indicados, sem apagar o resto.
- `res.redirect('/show')` → volta para a lista depois de salvar.

### 11. Deletar um registro — **D** (Delete)

```javascript
api.get('/delete/:id', async (req, res) => {
    await collection.deleteOne({ _id: new ObjectId(req.params.id) })
    res.redirect('/show')
})
```

- `collection.deleteOne({ _id: ... })` → remove **um** documento que tenha aquele id.
- `res.redirect('/show')` → volta para a lista, já sem o registro removido.

### 12. Conectar ao banco e só então subir o servidor

```javascript
async function iniciar() {
    await client.connect()
    const db = client.db("pessoa")
    collection = db.collection("crud")
    console.log("Conectado ao MongoDB")

    api.listen(3000, function () {
        console.log("meu servidor esta na porta 3000")
    })
}
```

- `async function iniciar()` → função que organiza a inicialização.
- `await client.connect()` → abre de fato a conexão com o MongoDB e **espera** ela terminar.
- `const db = client.db("pessoa")` → seleciona o banco de dados chamado `pessoa`.
- `collection = db.collection("crud")` → seleciona a coleção `crud` dentro do banco e guarda na variável que todas as rotas usam.
- `api.listen(3000, ...)` → só agora sobe o servidor na porta 3000. Isso garante que o banco já esteja conectado **antes** de qualquer rota ser usada.

### 13. Executar a inicialização e tratar erros

```javascript
iniciar().catch(function (erro) {
    console.error("Erro ao iniciar a aplicacao:", erro)
})
```

- `iniciar()` → chama a função que conecta e sobe o servidor.
- `.catch(...)` → se algo der errado (senha errada, internet caiu, banco fora do ar), em vez de quebrar silenciosamente, mostra a mensagem de erro no terminal.

---

## ▶️ Como rodar o projeto

### 1. Instalar as dependências
```bash
npm install
```

### 2. Configurar o `.env`
Crie um arquivo `.env` na raiz com a sua string de conexão (troque `SUA_SENHA` pela senha real do usuário do banco):
```
DATABASE_URL=mongodb+srv://USUARIO:SUA_SENHA@SEU-CLUSTER.mongodb.net/
```
> Se a senha tiver caracteres especiais (`@`, `/`, `:`, `#`), eles precisam ser codificados (ex: `@` vira `%40`).

### 3. Rodar o servidor
```bash
node server.js
```
Ou, para reiniciar automaticamente a cada alteração (usando nodemon):
```bash
npx nodemon server.js
```

### 4. Acessar no navegador
- Cadastrar: http://localhost:3000/index
- Listar: http://localhost:3000/show

> 💡 **Dica:** ao alterar o `server.js`, pare o servidor antigo com `Ctrl+C` antes de rodar de novo. Se um processo antigo continuar rodando na porta 3000, você pode acabar testando o código velho ou receber erro de "porta em uso".

---

## 🗺️ Mapa das rotas

| Método | Rota | Operação CRUD | O que faz |
|--------|------|---------------|-----------|
| GET  | `/index`      | —      | Mostra o formulário de cadastro |
| GET  | `/show`       | Read   | Lista todos os registros |
| POST | `/show`       | Create | Cria um novo registro |
| GET  | `/edit/:id`   | Read   | Mostra o formulário de edição |
| POST | `/edit/:id`   | Update | Salva a edição |
| GET  | `/delete/:id` | Delete | Remove o registro |

---

## 📚 Referências oficiais dos códigos

### MongoDB (driver Node.js)
- Documentação geral do driver Node.js: https://www.mongodb.com/docs/drivers/node/current/
- Inserir documentos (`insertOne`): https://www.mongodb.com/docs/drivers/node/current/crud/insert/
- Deletar documentos (`deleteOne`): https://www.mongodb.com/docs/drivers/node/current/crud/delete/
- Referência rápida de comandos (`find`, `updateOne`, etc.): https://www.mongodb.com/docs/drivers/node/current/quick-reference/
- Conexão com `MongoClient`: https://www.mongodb.com/docs/drivers/node/current/connect/

### Express
- Roteamento básico (`app.get`, `app.post`): https://expressjs.com/en/starter/basic-routing.html
- Guia de roteamento: https://expressjs.com/en/guide/routing.html
- Objeto de resposta (`res.render`, `res.redirect`): https://expressjs.com/en/5x/api/response.html
- Middleware `express.urlencoded`: https://expressjs.com/en/5x/api/#express.urlencoded

### EJS
- Site oficial e documentação: https://ejs.co/
- Guia de uso (tags `<% %>` e `<%= %>`): https://ejs.co/#docs
- Integração com Express (`view engine`): https://expressjs.com/en/guide/using-template-engines.html

### dotenv
- Repositório e documentação oficial: https://github.com/motdotla/dotenv
- Página no npm: https://www.npmjs.com/package/dotenv

### nodemon
- Site oficial: https://nodemon.io/
- Repositório e documentação: https://github.com/remy/nodemon
- Página no npm: https://www.npmjs.com/package/nodemon

> As explicações deste README foram escritas com base na documentação oficial listada acima. O conteúdo das fontes foi reescrito e resumido para fins didáticos.
