"use strict";
const http = require("http");
const url = require("url");
const path = require("path");
const express = require("express");
const multer = require("multer");

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
    response.redirect("/registro.html");
});


app.listen(3000, function (err) {
    if (err) {
        console.error("No se pudo inicializar el servidor: " +
            err.message);
    } else {
        console.log("Servidor arrancado en el puerto 3000");
    }
});

app.post("/procesar_formulario", multerFactory.single('foto'),
    function (request, response) {
        
        let usuario = {
            mail: request.body.mail,
            apellidos: request.body.password,
            nickName: request.body.nickName,
            imagen: null
        };
        if (request.file) {
            usuario.imagen = request.file.buffer;
        }
        insertarUsuario(usuario, function (err, newId) {
            if (err) {
                
            }
        });
    });

function insertarUsuario(usuario, callback) {
    pool.getConnection(function (err, con) {
        if (err)
            callback(err);
        else {
            let sql =
                "INSERT INTO usuarios(mail, password, foto, nickName) VALUES(?, ?, ?, ?)";
            con.query(sql, [usuario.mail, usuario.password,
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
