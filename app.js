const URL_MODELO = "./modelo/";

let modelo;
let webcam;
let maxPredicciones;
let imagenSeleccionada = null;
let camaraActiva = false;

let historico = JSON.parse(localStorage.getItem("historico")) || [];

let ultimaClaseCamara = "";
let ultimoRegistroCamara = 0;


async function cargarModelo() {

    try {

        const modelURL = URL_MODELO + "model.json";
        const metadataURL = URL_MODELO + "metadata.json";

        modelo = await tmImage.load(modelURL, metadataURL);

        maxPredicciones = modelo.getTotalClasses();

        document.getElementById("mensaje").innerHTML =
            "Modelo cargado correctamente. Puedes empezar.";

    } catch (error) {

        console.error("Error al cargar el modelo:", error);

        document.getElementById("mensaje").innerHTML =
            "Error al cargar el modelo.";
    }
}


async function iniciarCamara() {

    if (!modelo) {

        document.getElementById("mensaje").innerHTML =
            "El modelo todavía no está cargado.";

        return;
    }

    if (camaraActiva) {
        return;
    }

    try {

        webcam = new tmImage.Webcam(400, 400, true);

        await webcam.setup();
        await webcam.play();

        camaraActiva = true;

        document.getElementById("camara").innerHTML = "";

        document
            .getElementById("camara")
            .appendChild(webcam.canvas);

        document.getElementById("mensaje").innerHTML =
            "Cámara iniciada. Apunta a una imagen.";

        bucleCamara();

    } catch (error) {

        console.error("Error al iniciar la cámara:", error);

        document.getElementById("mensaje").innerHTML =
            "No se ha podido iniciar la cámara.";
    }
}


async function bucleCamara() {

    if (!camaraActiva) {
        return;
    }

    webcam.update();

    await clasificar(webcam.canvas, "Cámara");

    if (camaraActiva) {
        window.requestAnimationFrame(bucleCamara);
    }
}


function pararCamara() {

    if (!camaraActiva) {

        document.getElementById("mensaje").innerHTML =
            "La cámara ya estaba parada.";

        return;
    }

    webcam.stop();

    webcam = null;
    camaraActiva = false;

    document.getElementById("camara").innerHTML = "";

    document.getElementById("mensaje").innerHTML =
        "La cámara se ha detenido. ¡Gracias por usar el clasificador!";
}


async function clasificar(imagen, origen) {

    if (!modelo) {

        document.getElementById("resultado").innerHTML =
            "El modelo todavía no está cargado.";

        return;
    }

    try {

        const predicciones = await modelo.predict(imagen);

        let mejorPrediccion = predicciones[0];

        for (let i = 1; i < predicciones.length; i++) {

            if (
                predicciones[i].probability >
                mejorPrediccion.probability
            ) {
                mejorPrediccion = predicciones[i];
            }
        }

        const umbral =
            Number(document.getElementById("umbral").value) / 100;

        const porcentaje =
            mejorPrediccion.probability * 100;

        const resultado =
            document.getElementById("resultado");


        if (mejorPrediccion.probability >= umbral) {

            resultado.innerHTML =
                "Coincidencia: <strong>" +
                mejorPrediccion.className +
                "</strong><br>" +
                "Confianza: " +
                porcentaje.toFixed(2) +
                "%";

            if (origen === "Imagen") {

                guardarResultado(
                    mejorPrediccion.className,
                    porcentaje,
                    origen
                );
            }

            if (origen === "Cámara") {

                const ahora = Date.now();

                if (
                    ultimaClaseCamara !== mejorPrediccion.className ||
                    ahora - ultimoRegistroCamara > 2000
                ) {

                    guardarResultado(
                        mejorPrediccion.className,
                        porcentaje,
                        origen
                    );

                    ultimaClaseCamara =
                        mejorPrediccion.className;

                    ultimoRegistroCamara = ahora;
                }
            }

        } else {

            resultado.innerHTML =
                "<strong>No hay coincidencia.</strong><br>" +
                "La confianza más alta es de " +
                porcentaje.toFixed(2) +
                "%.";

            if (origen === "Imagen") {

                guardarResultado(
                    "Sin coincidencia",
                    porcentaje,
                    origen
                );
            }
        }

    } catch (error) {

        console.error("Error al clasificar:", error);

        document.getElementById("resultado").innerHTML =
            "Se ha producido un error al clasificar la imagen.";
    }
}


function guardarResultado(clase, porcentaje, origen) {

    const fecha = new Date();

    const resultado = {
        clase: clase,
        porcentaje: porcentaje.toFixed(2),
        origen: origen,
        fecha: fecha.toLocaleString()
    };

    historico.unshift(resultado);

    localStorage.setItem(
        "historico",
        JSON.stringify(historico)
    );

    mostrarHistorico();
}


function mostrarHistorico() {

    const lista =
        document.getElementById("lista-historico");

    lista.innerHTML = "";

    for (let i = 0; i < historico.length; i++) {

        const elemento =
            document.createElement("div");

        elemento.className = "elemento-historico";

        elemento.innerHTML =
            "<strong>" +
            historico[i].clase +
            "</strong><br>" +
            "Confianza: " +
            historico[i].porcentaje +
            "%<br>" +
            "Origen: " +
            historico[i].origen +
            "<br>" +
            "Fecha: " +
            historico[i].fecha;

        lista.appendChild(elemento);
    }
}


document
    .getElementById("boton-inicio")
    .addEventListener("click", iniciarCamara);


document
    .getElementById("boton-parada")
    .addEventListener("click", pararCamara);


document
    .getElementById("umbral")
    .addEventListener("input", function() {

        document.getElementById("valor-umbral").innerHTML =
            this.value;
    });


document
    .getElementById("selector-imagen")
    .addEventListener("change", function(event) {

        const archivo = event.target.files[0];

        if (!archivo) {
            return;
        }

        const imagen =
            document.getElementById("imagen-seleccionada");

        imagen.onload = function() {

            imagenSeleccionada = imagen;

            document.getElementById("resultado").innerHTML =
                "Imagen cargada. Pulsa «Calificar imagen».";

        };

        imagen.onerror = function() {

            document.getElementById("resultado").innerHTML =
                "No se ha podido cargar la imagen.";
        };

        imagen.src =
            window.URL.createObjectURL(archivo);

        imagen.style.display = "block";
    });


document
    .getElementById("boton-calificar")
    .addEventListener("click", function() {

        if (!imagenSeleccionada) {

            document.getElementById("resultado").innerHTML =
                "Primero selecciona una imagen.";

            return;
        }

        clasificar(
            imagenSeleccionada,
            "Imagen"
        );
    });


document
    .getElementById("borrar-historico")
    .addEventListener("click", function() {

        historico = [];

        localStorage.removeItem("historico");

        mostrarHistorico();
    });


mostrarHistorico();

cargarModelo();