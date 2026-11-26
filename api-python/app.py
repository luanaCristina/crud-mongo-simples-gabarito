"""
API de Cadastro de Alunos — versao Python (Flask + PyMongo)

Equivalente a versao Node.js que esta na pasta ../cadastro:
  - Flask    -> faz o papel do Express (servidor web e rotas)
  - Jinja2   -> faz o papel do EJS (templates HTML, ja vem com o Flask)
  - PyMongo  -> faz o papel do driver "mongodb" (conversa com o banco)
  - dotenv   -> le a URL de conexao do arquivo .env
"""

import os
import re
from datetime import datetime

from flask import Flask, render_template, request, redirect, url_for, abort
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv

# Carrega as variaveis do .env que esta na pasta de cima (api-crud-ete/.env)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

app = Flask(__name__)

# Conexao com o MongoDB (mesma URL usada pela versao Node)
url = os.getenv("DATABASE_URL")
client = MongoClient(url)
db = client["escolaETE"]
collection = db["alunosETE"]

# Listas usadas nos formularios
ESCOLAS = [
    "ETE Advogado José de Góis",
    "ETE Cícero Dias",
    "ETE Governador Eduardo Campos",
    "ETE Maria Eduarda",
    "Outra",
]

CURSOS = [
    "Desenvolvimento de Sistemas",
    "Redes de Computadores",
    "Administração",
    "Logística",
    "Enfermagem",
    "Edificações",
]


# ===================== VALIDACAO =====================

def validar_aluno(form):
    """Valida os dados do formulario.

    Retorna (erros, dados):
      - erros: dicionario com mensagens por campo (vazio = tudo certo)
      - dados: valores "limpos" (sem espacos sobrando) para salvar/reexibir
    """
    dados = {
        "nome": (form.get("nome") or "").strip(),
        "email": (form.get("email") or "").strip(),
        "escola": form.get("escola") or "",
        "curso": form.get("curso") or "",
        "matricula": (form.get("matricula") or "").strip(),
        "telefone": (form.get("telefone") or "").strip(),
        "dataNascimento": form.get("dataNascimento") or "",
    }

    erros = {}

    # Nome: pelo menos 3 caracteres
    if len(dados["nome"]) < 3:
        erros["nome"] = "O nome deve ter pelo menos 3 caracteres."

    # Email: formato texto@texto.texto
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", dados["email"]):
        erros["email"] = "Informe um e-mail válido (ex: aluno@escola.edu.br)."

    # Escola e curso: precisam estar nas listas permitidas
    if dados["escola"] not in ESCOLAS:
        erros["escola"] = "Selecione uma escola."
    if dados["curso"] not in CURSOS:
        erros["curso"] = "Selecione um curso."

    # Matricula: apenas numeros
    if not re.match(r"^\d+$", dados["matricula"]):
        erros["matricula"] = "A matrícula deve conter apenas números."

    return erros, dados


# ===================== ROTAS =====================

@app.route("/")
def listar():
    """HOME: lista todos os alunos (READ)."""
    alunos = list(collection.find().sort("nome", 1))
    return render_template("listar.html", alunos=alunos)


@app.route("/novo", methods=["GET"])
def novo_form():
    """Mostra o formulario de cadastro."""
    return render_template("cadastrar.html", escolas=ESCOLAS, cursos=CURSOS, erros={}, aluno={})


@app.route("/novo", methods=["POST"])
def novo_salvar():
    """Cria um novo aluno (CREATE)."""
    erros, dados = validar_aluno(request.form)

    # Se houver erros, volta ao formulario mostrando as mensagens
    # e mantendo o que o usuario ja tinha digitado.
    if erros:
        return render_template("cadastrar.html", escolas=ESCOLAS, cursos=CURSOS, erros=erros, aluno=dados)

    dados["criadoEm"] = datetime.now()
    collection.insert_one(dados)
    return redirect(url_for("listar"))


@app.route("/detalhes/<id>")
def detalhes(id):
    """Mostra os detalhes de um aluno (READ de um so)."""
    aluno = collection.find_one({"_id": ObjectId(id)})
    if not aluno:
        abort(404, description="Aluno não encontrado")
    return render_template("detalhes.html", aluno=aluno)


@app.route("/editar/<id>", methods=["GET"])
def editar_form(id):
    """Mostra o formulario de edicao preenchido."""
    aluno = collection.find_one({"_id": ObjectId(id)})
    if not aluno:
        abort(404, description="Aluno não encontrado")
    return render_template("editar.html", aluno=aluno, escolas=ESCOLAS, cursos=CURSOS, erros={})


@app.route("/editar/<id>", methods=["POST"])
def editar_salvar(id):
    """Atualiza um aluno (UPDATE)."""
    erros, dados = validar_aluno(request.form)

    if erros:
        # Reexibe o formulario com os erros, mantendo o id para o form
        # continuar apontando para o aluno certo.
        aluno = {"_id": id, **dados}
        return render_template("editar.html", aluno=aluno, escolas=ESCOLAS, cursos=CURSOS, erros=erros)

    collection.update_one({"_id": ObjectId(id)}, {"$set": dados})
    return redirect(url_for("listar"))


@app.route("/deletar/<id>")
def deletar(id):
    """Deleta um aluno (DELETE)."""
    collection.delete_one({"_id": ObjectId(id)})
    return redirect(url_for("listar"))


# ===================== INICIALIZACAO =====================

if __name__ == "__main__":
    # Confirma a conexao com o banco antes de subir o servidor
    client.admin.command("ping")
    print("Conectado ao MongoDB (banco: escolaETE, colecao: alunosETE)")
    print("Servidor Python rodando em http://localhost:3002")
    # porta 3002 para nao conflitar com as APIs Node (3000 e 3001)
    app.run(host="0.0.0.0", port=3002, debug=True)
