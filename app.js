"use strict";
const http = require("http");
const url = require("url");
const path = require("path");
const express = require("express");
const multer = require("multer");
const session = require("express-session");
const fs = require("fs");
const { check, validationResult } = require("express-validator");
const bodyParser = require("body-parser");
const config = require("./config.js");

const app = express();

const middlewareSession = session({
    saveUninitialized: false,
    secret: "foobar34",
    resave: false
});

app.use(middlewareSession);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const multerFactory = multer({ storage: multer.memoryStorage() });

const mysql = require("mysql");
const { symlinkSync } = require("fs");
const pool = mysql.createPool(config.mysqlConfig);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


const ficherosEstaticos =
    path.join(__dirname, "public");

app.use(express.static(ficherosEstaticos));

//-----------------GET-------------------------

app.listen(config.port, function (err) {
    if (err) {
        console.error("No se pudo inicializar el servidor: " +
            err.message);
    } else {
        console.log("Servidor arrancado en el puerto 3000");
    }
});

app.get("/", function (request, response) {
    response.render("404login.ejs", { errores: {} });
});

app.get("/crear_cuenta", function (request, response) {
    response.render("registro.ejs", { errores: {} });
});

app.get("/ir_inicar_sesion", function (request, response) {
    response.render("404login.ejs", { errores: {} });
});

app.get("/preguntas", function (request, response) {
    obtenerPreguntas('todo', '', request, response);
});

app.get("/formularPregunta", function (request, response) {
    response.render("formularPregunta.ejs", { usuario: request.session.usuario, errores: {} });
});

//-----------------GET---------------------------

//-----------------POST-------------------------

//-------------------------Iniciar sesion------------------
app.post('/inicar_sesion',
    // El campo login ha de ser no vacío.
    check("email", "Este campo no puede estar vacío").notEmpty(),
    // El campo email debe tener formato de correo
    check("email", "No es un correo electronico valido").isEmail(),
    // El campo password ha de ser no vacío.
    check("password", "Este campo no puede estar vacío").notEmpty(),
    (request, response) => {

        let usuario = {
            email: request.body.email,
            password: request.body.password,
            foto: null,
            nickname: null,
            id: null
        };
        const errors = validationResult(request);

        if (errors.isEmpty()) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    callback(new Error("Error de acceso a la base de datos:" + err));
                }
                else {
                    connection.query("SELECT * FROM usuarios WHERE email = ? AND password = ?",
                        [usuario.email, usuario.password],
                        function (err, result) {
                            connection.release(); // devolver al pool la conexión 
                            if (err) {
                                callback(new Error("Error al inicar sesion:" + err));
                            }
                            else {
                                if (result.length === 0) {
                                    console.log("No es correcta la contraseña o el mail"); //no está el usuario con el password proporcionado 
                                }
                                else {
                                    usuario.foto = Buffer.from(result[0].foto).toString('base64');
                                    usuario.nickname = result[0].nickname;
                                    usuario.id = result[0].id;
                                    request.session.usuario = usuario;
                                    response.render("mainpage.ejs", { usuario });
                                }
                            }
                        });
                }
            }
            );
        } else {
            let er = errors.mapped();
            response.render("404login.ejs", { errores: errors.mapped() });
        }
    });
//-------------------------Iniciar sesion------------------

//-------------------- Crear cuenta -------------------------
app.post(
    '/procesar_formulario', multerFactory.single('foto'),
    // El campo login ha de ser no vacío.
    check("email", "Este campo no puede estar vacío").notEmpty(),
    // El campo email debe tener formato de correo
    check("email", "No es un correo electronico valido").isEmail(),
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
                imagen: null,

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
            response.render("registro.ejs", { errores: errors.mapped() });
        }
    });

function insertarUsuario(usuario, callback) {
    pool.getConnection(function (err, con) {
        if (err)
            callback(err);
        else {
            if (usuario.imagen === null) {
                usuario.imagen = fs.readFileSync(__dirname + '/imagenes/defecto1.png');
            }
            let sql =
                "INSERT INTO usuarios(email, password, foto, nickname) VALUES(?, ?, ?, ?)";
            con.query(sql, [usuario.email, usuario.password,
            usuario.imagen, usuario.nickname],
                function (err, result) {
                    con.release();
                    if (err)
                        callback(error);
                    else {
                        console.log("CREADA CORRECTAMENTE")
                        response.render("404login.ejs", { errores: {} });
                    }
                });
        }
    });
}
//-------------------- Crear cuenta -------------------------

//----------------------- Preguntas -----------------------------

const sinEspacio = (param) => {
    if (param != "") {
        let re = /\s/;
        if (param.search(re)) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
};

const max5 = (param) => {
    if (param != "") {
        let re = /(?<=@)\w+/;
        let etiquetas = param.match(re);
        if (etiquetas.length <= 5) {
            param = etiquetas;
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
};

app.post(
    '/procesar_formulario_pregunta',
    // El campo titulo ha de ser no vacío.
    check("titulo", "Este campo no puede estar vacío").notEmpty(),
    // El cuerpo ha de ser no vacío.
    check("cuerpo", "Este campo no puede estar vacío").notEmpty(),
    //Las etiquetas no pueden tener espacios
    check('etiquetas', 'No puede tener espacios').custom(sinEspacio),
    //Las etiquetas no pueden ser mas de 5
    check('etiquetas', 'No pueden ser mas de 5').custom(max5),
    (request, response) => {
        const errors = validationResult(request);
        if (errors.isEmpty()) {
            let d = new Date();
            let pregunta = {
                titulo: request.body.titulo,
                cuerpo: request.body.cuerpo,
                etiquetas: request.body.etiquetas,
                fecha: d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(),
                usuarioId: request.session.usuario.id
            };

            insertarPregunta(pregunta, function (err) {
                if (err) {
                    console.log("Error de conexión a la base de datos" + err);
                } else {
                    response.render("preguntas.ejs", { usuario: request.session.usuario });
                }
            });
        } else {
            let er = errors.mapped();
            response.render("formularPregunta.ejs", { usuario: request.session.usuario, errores: errors.mapped() });
        }
    });

    app.post("/etiqueta", function (request, response) {
        obtenerPreguntas('etiqueta', request.body.etiqueta , request, response);
    });

    app.post("/busqueda", function (request, response) {
        obtenerPreguntas('busqueda', request.body.cuerpo , request, response);
    });

function obtenerPreguntas(tipoBusqueda, dato, request, response) {
    pool.getConnection(function (err, con) {
        if (err)
            callback(err);
        else {
            let sqlAdd = '';
            switch (tipoBusqueda) {
                case 'todo': break;
                case 'etiqueta': sqlAdd = ' WHERE p.etiquetas LIKE ?';dato = '%@' + dato + '%' ; break;
                case 'busqueda': sqlAdd = ' WHERE p.cuerpo LIKE ?'; dato = '%' + dato + '%'; break;
            }
            let sql = "SELECT* FROM preguntas AS p INNER JOIN formular AS f ON p.id = f.idPregunta INNER JOIN usuarios AS u ON u.id = f.idUsuario" + sqlAdd;
            con.query(sql, [dato],
                function (err, result) {
                    con.release();
                    if (err)
                        callback(error);
                    else {
                        let cont = 0;
                        result.forEach(pregunta => {
                            cont++;
                            pregunta.foto = Buffer.from(pregunta.foto).toString('base64');
                            pregunta.etiquetas = pregunta.etiquetas.split(/@/);
                            pregunta.fecha = pregunta.fecha.getFullYear() + "-" + pregunta.fecha.getMonth() + "-" + pregunta.fecha.getDate();
                        });
                        result.cont = cont;

                        response.render("preguntas.ejs", { usuario: request.session.usuario, preguntas: result });
                    }

                });
        }
    });
}

function insertarPregunta(pregunta, callback) {
    pool.getConnection(function (err, con) {
        if (err) {
            callback(err);
        } else {

            let sql =
                "INSERT INTO preguntas (titulo, cuerpo, etiquetas, fecha) VALUES(?, ?, ?, ?)";
            con.query(sql, [pregunta.titulo, pregunta.cuerpo,
            pregunta.etiquetas, pregunta.fecha],
                function (err, result) {
                    if (err) {
                        callback(error);
                    } else {
                        let sql =
                            "INSERT into formular (idUsuario, idPregunta) VALUES (?, ?)";
                        con.query(sql, [pregunta.usuarioId, result.insertId],
                            function (err, response, result) {
                                con.release();
                                if (err) {
                                    callback(error);
                                } else {
                                    console.log("CREADA CORRECTAMENTE")
                                    callback(null);
                                }
                            });
                    }
                });
        }
    });
}

//----------------------- Preguntas -----------------------------

app.post("/formularRespuesta", function (request, response) {
    let pregunta = {
        titulo: request.body.titulo,
        cuerpo: request.body.cuerpo,
        etiquetas: request.body.etiquetas.split(/,/),
        fecha: request.body.fecha,
        nickname: request.body.nickname,
        foto: request.body.foto,
        idPregunta: request.body.idPregunta
    };
    obtenerRespuestas(pregunta, request, response)
    
});

//----------------------- Respuesta -----------------------------
app.post(
    '/procesar_formulario_respuesta',
    (request, response) => {
    const errors = validationResult(request);
        let d = new Date();
        let respuesta = {
            respuesta: request.body.respuesta,
            fecha: d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(),
            usuarioId: request.session.usuario.id,
            idPregunta: request.body.idPregunta
        };

        pool.getConnection(function (err, con) {
            if (err) {
                callback(err);
            } else {
    
                let sql =
                    "INSERT INTO respuestas (respuesta, fecha) VALUES( ?, ?)";
                con.query(sql, [respuesta.respuesta, respuesta.fecha],
                    function (err, result) {
                        if (err) {
                            callback(error);
                        } else {
                            let sql =
                                "INSERT into responder (idUsuario, idRespuesta, idPregunta) VALUES (?, ? ,?)";
                            con.query(sql, [respuesta.usuarioId, result.insertId, respuesta.idPregunta],
                                function (err, response, result) {
                                    con.release();
                                    if (err) {
                                        callback(error);
                                    } else {
                                        obtenerPreguntas('todo', '', request, response);
                                    }
                                });
                        }
                    });
            }
        });
});


function obtenerRespuestas(pregunta, request, response) {
    pool.getConnection(function (err, con) {
        if (err)
            callback(err);
        else {
            let sql = "SELECT* FROM respuestas AS re INNER JOIN responder AS rs ON re.id = rs.idRespuesta INNER JOIN usuarios AS u ON u.id = rs.idUsuario WHERE rs.idPregunta = ?";
            con.query(sql, [pregunta.idPregunta],
                function (err, result) {
                    con.release();
                    if (err)
                        callback(error);
                    else {
                        let cont = 0;
                        result.forEach(respuesta => {
                            cont++;
                            respuesta.foto = Buffer.from(respuesta.foto).toString('base64');
                            respuesta.fecha = respuesta.fecha.getFullYear() + "-" + respuesta.fecha.getMonth() + "-" + respuesta.fecha.getDate();
                        });
                        result.cont = cont;

                        response.render("respuestas.ejs", { usuario: request.session.usuario, pregunta, respuestas:result });
                    }

                });
        }
    });
}
//----------------------- Respuesta -----------------------------

//-----------------POST-------------------------