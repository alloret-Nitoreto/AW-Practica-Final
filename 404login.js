"use strict";
const http = require("http");
const url = require("url");
const path = require("path");
const express = require("express");

const app = express();

app.set("view engine", "ejs");

const ficherosEstaticos =
    path.join(__dirname, "public");

app.use(express.static(ficherosEstaticos));


app.get("/", function(request, response) {
    response.redirect("/404login.html");
});


app.get("/crear_cuenta", function(request, response) {
    response.redirect("/registro.html");
});


app.listen(3000, function(err) {
    if (err) {
        console.error("No se pudo inicializar el servidor: " +
            err.message);
    } else {
        console.log("Servidor arrancado en el puerto 3000");
    }
});