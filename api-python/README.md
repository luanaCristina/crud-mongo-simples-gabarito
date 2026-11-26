# API de Cadastro de Alunos — versão Python (Flask)

Esta é a **mesma aplicação** da pasta `../cadastro` (Node.js), só que reescrita em **Python**.
Serve para comparar lado a lado como o mesmo CRUD fica nas duas linguagens.

## 🔁 De Node para Python — o que corresponde a quê

| Node.js (`../cadastro`) | Python (esta pasta) | Papel |
|-------------------------|---------------------|-------|
| Express                 | **Flask**           | servidor web e rotas |
| EJS                     | **Jinja2** (vem no Flask) | templates HTML |
| driver `mongodb`        | **PyMongo**         | conversar com o banco |
| `dotenv`                | **python-dotenv**   | ler o arquivo `.env` |
| pasta `views/`          | pasta `templates/`  | onde ficam as páginas |
| pasta `public/`         | pasta `static/`     | arquivos estáticos (CSS) |
| `express.static`        | já é automático no Flask | servir o `static/` |

## � `request` e `response`: Express vs Flask

Uma dúvida comum: *"no Express toda rota recebe `(req, res)`, mas no Flask as funções não
recebem nada. Cadê o request e o response no Python?"*

A resposta é: **os dois existem nas duas linguagens**. O que muda é só **como cada
framework entrega isso para você**.

### No Express: `req` e `res` são parâmetros

O Express **passa** os dois objetos para a sua função toda vez que a rota é chamada:

```javascript
api.post("/novo", (req, res) => {
    const nome = req.body.nome    // req = o que CHEGOU (o pedido)
    res.redirect("/")             // res = o que você DEVOLVE (a resposta)
})
```

### No Flask: o `request` é global e o `response` é o `return`

No Flask a ideia é a mesma, mas a entrega muda em dois pontos:

**1. O `request` você importa (não recebe como parâmetro):**

```python
from flask import request          # importado uma vez no topo do arquivo

@app.route("/novo", methods=["POST"])
def novo_salvar():
    nome = request.form.get("nome") # mesmo papel do req.body.nome
```

O Flask mantém um `request` "mágico" que sempre aponta para o pedido que está sendo
atendido naquele momento. Por isso não precisa recebê-lo na função: é só importar e usar.

**2. O `response` é simplesmente o que a função `return`:**

```python
return redirect(url_for("listar"))              # equivale ao res.redirect("/")
return render_template("listar.html", ...)      # equivale ao res.render(...)
```

No Express você **chama um método** do `res` (`res.render`, `res.redirect`, `res.send`).
No Flask você **retorna** o valor, e o framework transforma esse retorno na resposta HTTP.

### Tabela de equivalência

| O que você quer fazer | Express (Node) | Flask (Python) |
|-----------------------|----------------|----------------|
| Ler dados do formulário | `req.body.nome` | `request.form.get("nome")` |
| Ler o `:id` da URL | `req.params.id` | parâmetro da função: `def rota(id)` |
| Ler um parâmetro `?x=1` | `req.query.x` | `request.args.get("x")` |
| Mostrar um HTML | `res.render("x.ejs")` | `return render_template("x.html")` |
| Redirecionar | `res.redirect("/")` | `return redirect(url_for("listar"))` |
| Devolver um texto | `res.send("oi")` | `return "oi"` |

### Em resumo

- O **request** existe nos dois. No Express chega como o parâmetro `req`; no Flask é um
  objeto global que você importa com `from flask import request`.
- O **response** existe nos dois. No Express você escreve nele chamando métodos do `res`;
  no Flask você apenas **retorna** o conteúdo e o framework monta a resposta.

É só uma diferença de estilo: o Express prefere passar tudo por parâmetro; o Flask prefere
um `request` global e usar o `return` como resposta.

## �📁 Estrutura

```
api-python/
├── app.py                 # servidor Flask: conexão, rotas e validação
├── requirements.txt       # dependências Python
├── static/
│   └── style.css          # o mesmo tema 2077 da versão Node
└── templates/             # templates Jinja2 (equivalem aos .ejs)
    ├── listar.html
    ├── cadastrar.html
    ├── editar.html
    └── detalhes.html
```

## 🔤 Diferenças de sintaxe nos templates (EJS → Jinja2)

| Objetivo | EJS (Node) | Jinja2 (Python) |
|----------|-----------|-----------------|
| Mostrar um valor | `<%= aluno.nome %>` | `{{ aluno.nome }}` |
| Laço (for) | `<% lista.forEach(... %> ... <% }) %>` | `{% for x in lista %} ... {% endfor %}` |
| Condição (if) | `<% if (x) { %> ... <% } %>` | `{% if x %} ... {% endif %}` |
| Link para o CSS | `href="/style.css"` | `href="{{ url_for('static', filename='style.css') }}"` |

## 🧠 Entendendo o `app.py` passo a passo

Esta seção explica o arquivo `app.py` em blocos, para os alunos entenderem o que cada
parte faz. A ordem aqui é a mesma ordem em que o código aparece no arquivo.

### 1. Importações

```python
import os
import re
from datetime import datetime

from flask import Flask, render_template, request, redirect, url_for, abort
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
```

- `os` → ler variáveis de ambiente e montar caminhos de arquivo.
- `re` → "expressões regulares", usadas para validar o e-mail e a matrícula.
- `datetime` → pegar a data/hora atual (guardada em `criadoEm`).
- `Flask` → cria a aplicação. `render_template` mostra um HTML, `request` lê os dados do
  formulário, `redirect`/`url_for` mandam o navegador para outra rota, `abort` encerra com erro (ex: 404).
- `MongoClient` → abre a conexão com o MongoDB.
- `ObjectId` → converte o texto do `id` para o tipo que o MongoDB usa no campo `_id`.
- `load_dotenv` → lê o arquivo `.env`.

### 2. Carregar o `.env` e criar a aplicação

```python
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

app = Flask(__name__)
```

- `os.path.dirname(__file__)` é a pasta onde o `app.py` está. O `".."` sobe um nível, então
  o `.env` lido é o de `api-crud-ete/.env` (o mesmo das versões Node).
- `Flask(__name__)` cria a aplicação. O `__name__` ajuda o Flask a achar as pastas
  `templates/` e `static/` automaticamente.

### 3. Conectar ao banco

```python
url = os.getenv("DATABASE_URL")
client = MongoClient(url)
db = client["escolaETE"]
collection = db["alunosETE"]
```

- `os.getenv("DATABASE_URL")` pega a string de conexão que veio do `.env`.
- `MongoClient(url)` prepara o cliente de conexão.
- `client["escolaETE"]` seleciona o banco e `db["alunosETE"]` seleciona a coleção.
  No MongoDB, se o banco/coleção não existirem, eles são criados no primeiro documento salvo.

### 4. As listas de escolas e cursos

```python
ESCOLAS = [ ... ]
CURSOS = [ ... ]
```

Listas fixas usadas para preencher os `<select>` dos formulários e, na validação, para
conferir se o valor enviado é realmente uma das opções permitidas.

### 5. A função de validação

```python
def validar_aluno(form):
    dados = {
        "nome": (form.get("nome") or "").strip(),
        ...
    }
    erros = {}
    ...
    return erros, dados
```

- Recebe o `request.form` (o que o usuário digitou).
- Monta o dicionário `dados` já "limpo": `.strip()` remove espaços no começo/fim.
- O `or ""` evita erro quando um campo não veio: se for `None`, vira texto vazio.
- Em `erros` vão as mensagens, uma por campo com problema. As regras:
  - **nome:** `len(...) < 3` → pelo menos 3 caracteres.
  - **email:** `re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", ...)` → formato `texto@texto.texto`.
  - **escola/curso:** `not in ESCOLAS` / `not in CURSOS` → precisa ser uma opção da lista.
  - **matrícula:** `re.match(r"^\d+$", ...)` → só números (`\d` = dígito).
- Retorna `(erros, dados)`. Se `erros` estiver vazio, está tudo certo.

> **Por que validar no servidor?** O usuário pode burlar a validação do navegador (ou
> enviar dados por fora do formulário). Validar no Python garante que nada inválido chega ao banco.

### 6. As rotas (o coração do CRUD)

No Flask, cada rota é uma função decorada com `@app.route(...)`. O decorador diz **qual
URL** e **qual método HTTP** (GET/POST) acionam aquela função.

#### Listar — Read

```python
@app.route("/")
def listar():
    alunos = list(collection.find().sort("nome", 1))
    return render_template("listar.html", alunos=alunos)
```

- `collection.find()` busca todos os documentos; `.sort("nome", 1)` ordena por nome (1 = crescente).
- `list(...)` transforma o resultado em uma lista Python.
- `render_template` monta `templates/listar.html` passando a variável `alunos` para o HTML.

#### Mostrar o formulário de cadastro

```python
@app.route("/novo", methods=["GET"])
def novo_form():
    return render_template("cadastrar.html", escolas=ESCOLAS, cursos=CURSOS, erros={}, aluno={})
```

- Como é a primeira vez abrindo o formulário, `erros` e `aluno` vão vazios.
  O template sabe lidar com isso (não mostra erro e deixa os campos em branco).

#### Criar — Create

```python
@app.route("/novo", methods=["POST"])
def novo_salvar():
    erros, dados = validar_aluno(request.form)
    if erros:
        return render_template("cadastrar.html", escolas=ESCOLAS, cursos=CURSOS, erros=erros, aluno=dados)
    dados["criadoEm"] = datetime.now()
    collection.insert_one(dados)
    return redirect(url_for("listar"))
```

- Repare que a **mesma URL `/novo`** tem duas funções: uma para `GET` (mostrar o form) e
  outra para `POST` (salvar). O método HTTP decide qual roda.
- Se houver `erros`, volta ao formulário com as mensagens e os dados digitados (não perde nada).
- Se estiver tudo certo, adiciona a data de criação, salva com `insert_one` e
  redireciona para a listagem com `redirect(url_for("listar"))`.

#### Detalhes — Read de um só

```python
@app.route("/detalhes/<id>")
def detalhes(id):
    aluno = collection.find_one({"_id": ObjectId(id)})
    if not aluno:
        abort(404, description="Aluno não encontrado")
    return render_template("detalhes.html", aluno=aluno)
```

- `<id>` na URL vira o parâmetro `id` da função.
- `ObjectId(id)` converte o texto para o tipo do campo `_id`.
- `find_one(...)` busca **um** documento. Se não achar, `abort(404)` responde "não encontrado".

#### Editar (form) e Atualizar — Update

```python
@app.route("/editar/<id>", methods=["GET"])
def editar_form(id):
    aluno = collection.find_one({"_id": ObjectId(id)})
    ...
    return render_template("editar.html", aluno=aluno, escolas=ESCOLAS, cursos=CURSOS, erros={})

@app.route("/editar/<id>", methods=["POST"])
def editar_salvar(id):
    erros, dados = validar_aluno(request.form)
    if erros:
        aluno = {"_id": id, **dados}
        return render_template("editar.html", aluno=aluno, escolas=ESCOLAS, cursos=CURSOS, erros=erros)
    collection.update_one({"_id": ObjectId(id)}, {"$set": dados})
    return redirect(url_for("listar"))
```

- O `GET` abre o formulário já preenchido com os dados atuais do aluno.
- O `POST` valida de novo. Se houver erro, reexibe o form (o `{"_id": id, **dados}` junta o
  id de volta para o form continuar apontando para o aluno certo — o `**` "espalha" os campos de `dados`).
- `update_one(filtro, {"$set": dados})` altera só os campos indicados. O `$set` é um
  operador do MongoDB que atualiza sem apagar o resto do documento.

#### Deletar — Delete

```python
@app.route("/deletar/<id>")
def deletar(id):
    collection.delete_one({"_id": ObjectId(id)})
    return redirect(url_for("listar"))
```

- `delete_one(...)` remove o documento com aquele `_id` e volta para a listagem.

### 7. Subir o servidor

```python
if __name__ == "__main__":
    client.admin.command("ping")
    print("Conectado ao MongoDB (banco: escolaETE, colecao: alunosETE)")
    print("Servidor Python rodando em http://localhost:3002")
    app.run(host="0.0.0.0", port=3002, debug=True)
```

- `if __name__ == "__main__":` → este bloco só roda quando executamos o arquivo
  diretamente (`python app.py`), e não quando ele é importado por outro código.
- `client.admin.command("ping")` → faz um "ping" no banco para confirmar que a conexão
  funciona antes de subir o servidor.
- `app.run(...)` → inicia o servidor web. `port=3002` evita conflito com as APIs Node
  (3000 e 3001). `debug=True` reinicia o servidor sozinho quando você salva uma alteração
  e mostra erros detalhados (use só em desenvolvimento, nunca em produção).

> **Diferença importante para o Node:** o Flask já procura os HTML na pasta `templates/` e
> serve os arquivos da pasta `static/` automaticamente. Por isso aqui não existe o
> equivalente ao `express.static` — não precisamos configurar nada para o `style.css` funcionar.

## ▶️ Como rodar

1. Entre na pasta:
   ```bash
   cd api-crud-ete/api-python
   ```

2. Crie o ambiente virtual e instale as dependências (só na primeira vez):
   ```bash
   python3 -m venv venv
   ./venv/bin/pip install -r requirements.txt
   ```

3. Rode o servidor:
   ```bash
   ./venv/bin/python app.py
   ```

4. Acesse no navegador:
   - **Listar alunos:** http://localhost:3002/
   - **Cadastrar:** http://localhost:3002/novo

> A conexão usa a `DATABASE_URL` do arquivo `.env` da pasta de cima (`api-crud-ete/.env`).
> Esta versão Python usa o banco `escolaETE` e a coleção `alunosETE`, enquanto a versão
> Node (`../cadastro`) usa o banco `escola` e a coleção `alunos`. Ou seja: **cada versão tem
> seus próprios dados** (bancos separados).

## 🗺️ Rotas (iguais à versão Node)

| Método | Rota            | Operação | O que faz |
|--------|-----------------|----------|-----------|
| GET    | `/`             | Read     | Lista todos os alunos |
| GET    | `/novo`         | —        | Formulário de cadastro |
| POST   | `/novo`         | Create   | Salva novo aluno (com validação) |
| GET    | `/detalhes/<id>`| Read     | Mostra o dossiê do aluno |
| GET    | `/editar/<id>`  | Read     | Formulário de edição |
| POST   | `/editar/<id>`  | Update   | Salva alterações (com validação) |
| GET    | `/deletar/<id>` | Delete   | Remove o aluno |

## ✅ Validação

A função `validar_aluno()` no `app.py` confere: nome com 3+ caracteres, e-mail em
formato válido, escola e curso dentro das listas, e matrícula só com números.
Se algo falhar, o formulário volta mostrando as mensagens em vermelho e mantém o que
foi digitado — igual à versão Node.

## 🧭 Navegação entre as três APIs

A tela de listagem tem botões para alternar entre:
- **Python (Flask):** http://localhost:3002/
- **Node cadastro:** http://localhost:3001/
- **Node pessoas (original):** http://localhost:3000/show

Para a navegação funcionar, as respectivas APIs precisam estar rodando.

## 📚 Referências oficiais

- Flask (quickstart e rotas): https://flask.palletsprojects.com/en/stable/quickstart/
- Jinja2 (templates): https://jinja.palletsprojects.com/en/stable/templates/
- PyMongo (CRUD com MongoDB): https://pymongo.readthedocs.io/en/stable/tutorial.html
- python-dotenv: https://github.com/theskumar/python-dotenv
