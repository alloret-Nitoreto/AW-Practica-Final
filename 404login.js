"use strict";
const http = require("http");
const url = require("url");
const path = require("path");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { check, validationResult } = require("express-validator");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
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

//-----------------GET-------------------------

app.get("/", function (request, response) {
    response.render("404login.ejs", {errores:{}});
});

app.get("/crear_cuenta", function (request, response) {
    response.render("registro.ejs", {errores:{}});
});

app.get("/ir_inicar_sesion", function (request, response) {
    response.render("404login.ejs", {errores:{}});
});

const igual = (param1, param2) => {
    return param1 === param2;
};

//-----------------POST-------------------------

app.post('/inicar_sesion',
    // El campo login ha de ser no vacío.
    check("email", "Este campo no puede estar vacío").notEmpty(),
    // El campo email debe tener formato de correo
    check("email","No es un correo electronico valido").isEmail(),
    // El campo password ha de ser no vacío.
    check("password", "Este campo no puede estar vacío").notEmpty(),
    (request, response) => {

    let usuario = {
        email: request.body.email,
        password: request.body.password,
    };
    const errors = validationResult(request);

    if(errors.isEmpty()){
        pool.getConnection(function(err, connection) { 
            if (err) {  
                callback(new Error("Error de acceso a la base de datos:" + err));  
            } 
            else { 
            connection.query("SELECT * FROM usuarios WHERE email = ? AND password = ?" , 
            [usuario.email, usuario.password], 
            function(err, rows) { 
                connection.release(); // devolver al pool la conexión 
                if (err) { 
                    callback(new Error("Error al inicar sesion:" + err)); 
                } 
                else { 
                    if (rows.length === 0) { 
                        console.log("No es correcta la contraseña o el mail"); //no está el usuario con el password proporcionado 
                    } 
                    else { 
                        console.log("INICIADA CORRECTAMENTE");
                        //Deberia llevar a la pantalla principal
                    }            
                } 
            }); 
            } 
        } 
        ); 
    } else {
        let er = errors.mapped();
        response.render("404login.ejs", {errores: errors.mapped()});    
    }
});

app.post(
    '/procesar_formulario', multerFactory.single('foto'),
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
    //Las contraseñas son iguales
    check('password', 'Las contraseñas no coinciden').custom((value, { req }) => value === req.body.confPass),
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
            insertarUsuario(usuario, function (err) {
                if (err) {
                  console.log("Error de conexión a la base de datos" + err);
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
            if(usuario.imagen === null){
                usuario.imagen = fs.readFileSync(__dirname + '/imagenes/defecto1.png');      
            }
            let sql =
                "INSERT INTO usuarios(email, password, foto, nickName) VALUES(?, ?, ?, ?)";
            con.query(sql, [usuario.email, usuario.password,
            usuario.imagen, usuario.nickname],
                function (err, result) {
                    con.release();
                    if (err)
                        callback(error);
                    else
                        console.log("CREADA CORRECTAMENTE")
                        //Deberia llevar a la pantalla principal
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