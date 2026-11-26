const express = require("express")
const path = require("path")
const { MongoClient } = require("mongodb")
const ObjectId = require("mongodb").ObjectId
const dotenv = require("dotenv")

// Carrega as variaveis do .env que esta na pasta acima (api-crud-ete/.env)
dotenv.config({ path: path.join(__dirname, "..", ".env") })

const api = express()
const url = process.env.DATABASE_URL

const client = new MongoClient(url)
let collection

// Diz ao Express onde estao as views desta pasta (cadastro/views)
api.set("view engine", "ejs")
api.set("views", path.join(__dirname, "views"))
api.use(express.urlencoded({ extended: true }))

// Serve os arquivos estaticos (CSS) da pasta "public".
// Assim a tag <link rel="stylesheet" href="/style.css"> funciona.
api.use(express.static(path.join(__dirname, "public")))

// Lista das escolas usada nos formularios (poderia vir do banco tambem)
const ESCOLAS = [
    "ETE Advogado José de Góis",
    "ETE Cícero Dias",
    "ETE Governador Eduardo Campos",
    "ETE Maria Eduarda",
    "Outra",
]

const CURSOS = [
    "Desenvolvimento de Sistemas",
    "Redes de Computadores",
    "Administração",
    "Logística",
    "Enfermagem",
    "Edificações",
]

// ===================== VALIDACAO =====================

// Verifica os dados enviados pelo formulario.
// Retorna um objeto { erros, dados }:
//  - erros: objeto com mensagens por campo (vazio = tudo certo)
//  - dados: os valores "limpos" (sem espacos sobrando) para salvar ou reexibir
function validarAluno(body) {
    const dados = {
        nome: (body.nome || "").trim(),
        email: (body.email || "").trim(),
        escola: body.escola || "",
        curso: body.curso || "",
        matricula: (body.matricula || "").trim(),
        telefone: (body.telefone || "").trim(),
        dataNascimento: body.dataNascimento || "",
    }

    const erros = {}

    // Nome: obrigatorio e com pelo menos 3 letras
    if (dados.nome.length < 3) {
        erros.nome = "O nome deve ter pelo menos 3 caracteres."
    }

    // Email: obrigatorio e em formato valido (texto@texto.texto)
    const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formatoEmail.test(dados.email)) {
        erros.email = "Informe um e-mail válido (ex: aluno@escola.edu.br)."
    }

    // Escola e curso: precisam estar entre as opcoes permitidas
    if (!ESCOLAS.includes(dados.escola)) {
        erros.escola = "Selecione uma escola."
    }
    if (!CURSOS.includes(dados.curso)) {
        erros.curso = "Selecione um curso."
    }

    // Matricula: obrigatoria, somente numeros
    if (!/^\d+$/.test(dados.matricula)) {
        erros.matricula = "A matrícula deve conter apenas números."
    }

    return { erros, dados }
}

// ===================== ROTAS =====================

// HOME: lista todos os alunos (READ)
api.get("/", async (req, res) => {
    const alunos = await collection.find().sort({ nome: 1 }).toArray()
    res.render("listar", { alunos })
})

// Mostra o formulario de cadastro
api.get("/novo", (req, res) => {
    // erros e aluno comecam vazios; a view sabe lidar com isso
    res.render("cadastrar", { escolas: ESCOLAS, cursos: CURSOS, erros: {}, aluno: {} })
})

// Cria um novo aluno (CREATE)
api.post("/novo", async (req, res) => {
    const { erros, dados } = validarAluno(req.body)

    // Se houver erros, volta para o formulario mostrando as mensagens
    // e mantendo o que o usuario ja tinha digitado (dados).
    if (Object.keys(erros).length > 0) {
        return res.render("cadastrar", { escolas: ESCOLAS, cursos: CURSOS, erros, aluno: dados })
    }

    await collection.insertOne({ ...dados, criadoEm: new Date() })
    res.redirect("/")
})

// Mostra os detalhes de um aluno (READ de um so)
api.get("/detalhes/:id", async (req, res) => {
    const aluno = await collection.findOne({ _id: new ObjectId(req.params.id) })
    if (!aluno) {
        return res.status(404).send("Aluno não encontrado")
    }
    res.render("detalhes", { aluno })
})

// Mostra o formulario de edicao preenchido
api.get("/editar/:id", async (req, res) => {
    const aluno = await collection.findOne({ _id: new ObjectId(req.params.id) })
    res.render("editar", { aluno, escolas: ESCOLAS, cursos: CURSOS, erros: {} })
})

// Atualiza um aluno (UPDATE)
api.post("/editar/:id", async (req, res) => {
    const { erros, dados } = validarAluno(req.body)

    if (Object.keys(erros).length > 0) {
        // Reexibe o formulario de edicao com os erros.
        // Juntamos o _id para o form continuar apontando para o aluno certo.
        const aluno = { _id: req.params.id, ...dados }
        return res.render("editar", { aluno, escolas: ESCOLAS, cursos: CURSOS, erros })
    }

    await collection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: dados }
    )
    res.redirect("/")
})

// Deleta um aluno (DELETE)
api.get("/deletar/:id", async (req, res) => {
    await collection.deleteOne({ _id: new ObjectId(req.params.id) })
    res.redirect("/")
})

// ===================== INICIALIZACAO =====================

async function iniciar() {
    await client.connect()
    const db = client.db("escola")
    collection = db.collection("alunos")
    console.log("Conectado ao MongoDB (banco: escola, colecao: alunos)")

    const PORTA = 3001
    api.listen(PORTA, function () {
        console.log(`Servidor de cadastro rodando em http://localhost:${PORTA}`)
    })
}

iniciar().catch(function (erro) {
    console.error("Erro ao iniciar a aplicacao de cadastro:", erro)
})
