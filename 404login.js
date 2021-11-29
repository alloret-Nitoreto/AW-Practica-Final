"use strict";
const http = require("http");
const url = require("url");
const path = require("path");
const express = require("express");
const multer = require("multer");
const { check, validationResult } = require("express-validator");
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

const multerFactory = multer({ storage: multer.memoryStorage() });

const mysql = require("mysql");
const { symlinkSync } = require("fs");
const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "practicafinal"
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


const ficherosEstaticos =
    path.join(__dirname, "public");

app.use(express.static(ficherosEstaticos));


app.get("/", function (request, response) {
    response.redirect("404login.html");
});


app.get("/crear_cuenta", function (request, response) {
    response.render("registro.ejs", {errores:{}});
});

const igual = (param1, param2) => {
    return param1 == param2;
};
Configuar el ejs para que envie json en el post
app.post(
    '/procesar_formulario',
    // El campo login ha de ser no vacío.
    check("email", "Este campo no puede estar vacío").notEmpty(),
    // El campo email debe tener formato de correo
    check("email","No es un correo electronico valido").isEmail(),
    // El campo password ha de ser no vacío.
    check("password", "Este campo no puede estar vacío").notEmpty(),
    // El campo confimar password ha de ser no vacío.
    check("confPass", "Este campo no puede estar vacío").notEmpty(),
    // El campo nickname ha de ser no vacío.
    check("nickname", "Este campo no puede estar vacío").notEmpty(),
    //El campo passwordy confPass son iguales
    check(["password","confPass"], "sadasd").custom(igual),
    // El campo password debe coincidir con confirmar password.
    //check("confPassWord","passWord", "Nombre de usuario no empieza por a").igual(confPassWord,passWord),
    // El campo login solo puede contener caracteres alfanuméricos.
    multerFactory.single('foto'),
    (request, response) => {
        const errors = validationResult(request);
        if (errors.isEmpty()) {
            let usuario = {
                email: request.body.email,
                password: request.body.password,
                nickname: request.body.nickname,
                imagen: null
            };
            if (request.file) {
                usuario.imagen = request.file.buffer;
            }
            insertarUsuario(usuario, function (err, newId) {
                if (err) {
                    //Poner un pop de fallo en la base de datos
                }
            });
        } else {
            let er = errors.mapped();
            response.render("registro.ejs", {errores: errors.mapped()});    
        }
});

function insertarUsuario(usuario, callback) {
    pool.getConnection(function (err, con) {
        if (err)
            callback(err);
        else {
            let sql =
                "INSERT INTO usuarios(email, password, foto, nickName) VALUES(?, ?, ?, ?)";
            con.query(sql, [usuario.email, usuario.password,
            usuario.imagen, usuario.nickName],
                function (err, result) {
                    con.release();
                    if (err)
                        callback(err);
                    else
                        callback(null, result.insertId);
                });
        }
    });
}

app.listen(3000, function (err) {
    if (err) {
        console.error("No se pudo inicializar el servidor: " +
            err.message);
    } else {
        console.log("Servidor arrancado en el puerto 3000");
    }
});