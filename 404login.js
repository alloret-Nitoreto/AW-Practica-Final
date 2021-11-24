"use strict";
const http = require("http");
const url = require("url");
const path = require("path");
const express = require("express");
const multer = require("multer");
const { check, validationResult } = require("express-validator");
const app = express();

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

const ficherosEstaticos =
    path.join(__dirname, "public");

app.use(express.static(ficherosEstaticos));


app.get("/", function (request, response) {
    response.redirect("/404login.html");
});


app.get("/crear_cuenta", function (request, response) {
    response.redirect("/registro.ejs");
});


app.listen(3000, function (err) {
    if (err) {
        console.error("No se pudo inicializar el servidor: " +
            err.message);
    } else {
        console.log("Servidor arrancado en el puerto 3000");
    }
});


const igual = (pass1,pass2) => {
    return pass1 == pass2;
};
    
app.post(
    '/procesar_formulario',
    // El campo login ha de ser no vacío.
    check("email", "Nombre de usuario vacío").notEmpty(),
    // El campo email debe tener formato de correo
    check("email","No es un correo electronico").isEmail(),
    // El campo password ha de ser no vacío.
    check("passWord", "Nombre de usuario vacío").notEmpty(),
    // El campo confimar password ha de ser no vacío.
    check("confPassWord", "Nombre de usuario vacío").notEmpty(),
    // El campo nickname ha de ser no vacío.
    check("nickName", "Nombre de usuario vacío").notEmpty(),
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
                nickName: request.body.nickName,
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
            response.render("/registro.ejs", {errores: errors.mapped()});    
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
