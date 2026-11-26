const express = require("express")
const { MongoClient } = require("mongodb")
const ObjectId = require("mongodb").ObjectId
const dotenv = require("dotenv")

dotenv.config()

const api = express()
const url = process.env.DATABASE_URL

const client = new MongoClient(url)
let collection

api.set('view engine', 'ejs')
api.use(express.urlencoded({ extended: true }))

// Rota inicial: formulario de cadastro
api.get('/index', (req, res) => {
    res.render('index.ejs')
})

// Listar todos os registros (READ)
api.get('/show', async (req, res) => {
    const crud = await collection.find().toArray()
    res.render('show.ejs', { crud })
})

// Criar um novo registro (CREATE)
api.post('/show', async (req, res) => {
    await collection.insertOne({
        name: req.body.name,
        surname: req.body.surname
    })
    res.redirect('/show')
})

// Mostrar o formulario de edicao de um registro
api.get('/edit/:id', async (req, res) => {
    const crud = await collection.find({ _id: new ObjectId(req.params.id) }).toArray()
    res.render('edit.ejs', { crud })
})

// Atualizar um registro (UPDATE)
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

// Deletar um registro (DELETE)
api.get('/delete/:id', async (req, res) => {
    await collection.deleteOne({ _id: new ObjectId(req.params.id) })
    res.redirect('/show')
})

// Conecta ao banco e so depois sobe o servidor
async function iniciar() {
    await client.connect()
    const db = client.db("pessoa")
    collection = db.collection("crud")
    console.log("Conectado ao MongoDB")

    api.listen(3000, function () {
        console.log("meu servidor esta na porta 3000")
    })
}

iniciar().catch(function (erro) {
    console.error("Erro ao iniciar a aplicacao:", erro)
})
