/* ==========================================================================
   Zona Pits Motors — Comportamiento del sitio
   Sin dependencias. Todo degrada correctamente si el JavaScript falla.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------- 1. Menú móvil */
  var boton = document.querySelector('.menu-boton');
  var nav = document.getElementById('menu-principal');

  function cerrarMenu() {
    if (!boton || !nav) return;
    boton.setAttribute('aria-expanded', 'false');
    boton.setAttribute('aria-label', 'Abrir menú de navegación');
    nav.classList.remove('navegacion--abierta');
  }

  if (boton && nav) {
    boton.addEventListener('click', function () {
      var abierto = boton.getAttribute('aria-expanded') === 'true';
      boton.setAttribute('aria-expanded', String(!abierto));
      boton.setAttribute('aria-label', abierto ? 'Abrir menú de navegación' : 'Cerrar menú de navegación');
      nav.classList.toggle('navegacion--abierta', !abierto);
    });

    nav.addEventListener('click', function (evento) {
      if (evento.target.closest('a')) cerrarMenu();
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') cerrarMenu();
    });

    document.addEventListener('click', function (evento) {
      if (!nav.classList.contains('navegacion--abierta')) return;
      if (!nav.contains(evento.target) && !boton.contains(evento.target)) cerrarMenu();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 880) cerrarMenu();
    });
  }

  /* -------------------------------------------------- 2. Revelado al scroll */
  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Solo contenedores sin titulares: los encabezados los anima GSAP por palabra
  // (ver animaciones.js). Si ambos actuaran, se pisarían las transformaciones.
  var candidatos = document.querySelectorAll(
    '.tarjeta, .confianza__visual, .acordeon'
  );

  if (!reducido && 'IntersectionObserver' in window && candidatos.length) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('revelar--visible');
        observador.unobserve(entrada.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    candidatos.forEach(function (elemento) {
      // La clase se añade desde JS: si el JS no corre, el contenido es visible.
      elemento.classList.add('revelar');
      observador.observe(elemento);
    });
  }

  /* ------------------------------------------------------- 3. Año actual */
  var anio = document.getElementById('anio');
  if (anio) anio.textContent = String(new Date().getFullYear());

  /* ------------------------------ 3bis. Preferencias de cookies */
  /* El enlace del pie reabre el banner para que la decisión se pueda cambiar en
     cualquier momento, no solo en la primera visita. El banner lo construye
     consentimiento.js; si ese script no cargó, el enlace no debe quedarse muerto:
     se envía a la política de cookies, que explica cómo gestionarlas. */
  document.querySelectorAll('[data-preferencias-cookies]').forEach(function (enlace) {
    enlace.addEventListener('click', function (evento) {
      evento.preventDefault();
      if (window.ZPMConsentimiento) {
        window.ZPMConsentimiento.abrir();
      } else {
        window.location.href = 'politica-de-cookies.html#gestion';
      }
    });
  });

  /* ------------------------------------------- 4. Video de fondo del héroe */
  /* El video va sin "autoplay" y con preload="none": si se dejara al navegador,
     empezaría a descargar 1,1 MB en paralelo con la primera pintura y hundiría
     el LCP. Aquí se arranca cuando la página está ociosa. Hasta entonces se ve
     el poster, que también es lo que queda si el JavaScript no corre. */
  var video = document.getElementById('heroe-video');
  if (video) {
    var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (sinMovimiento) {
      // No se reproduce ni se descarga: queda el póster de .heroe__media como
      // imagen fija. El <video> sigue en opacity 0, así que nunca tapa el póster.
    } else {
      var arrancar = function () {
        video.preload = 'auto';
        video.load();

        video.addEventListener('playing', function () {
          video.classList.add('heroe__video--visible');
        }, { once: true });

        var intento = video.play();
        // Si el navegador rechaza la reproducción, queda el poster: no se
        // fuerza nada ni se muestra un control que el diseño no contempla.
        if (intento && typeof intento.catch === 'function') {
          intento.catch(function () {});
        }
      };

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(arrancar, { timeout: 2500 });
      } else {
        window.addEventListener('load', function () {
          window.setTimeout(arrancar, 200);
        });
      }
    }
  }

  /* ------------------------------------------ 3ter. Carrusel de servicios */
  /* El carrusel funciona SIN JavaScript: la pista es un contenedor con scroll
     horizontal y `scroll-snap` por CSS, así que con el dedo, la rueda o el teclado
     ya se navega. Este bloque solo añade lo que el CSS no puede: los botones de
     anterior y siguiente, el contador y el estado de los botones en los extremos.

     Los botones son necesarios porque el scroll horizontal no es evidente con
     ratón: sin ellos, la mitad de las fotos quedarían detrás de un gesto que en
     escritorio no todo el mundo descubre. */
  var pista = document.getElementById('carrusel-servicios');
  if (pista) {
    var fotos = pista.querySelectorAll('.carrusel__foto');
    var contador = document.getElementById('carrusel-contador');
    var botonAnterior = document.querySelector('[data-carrusel="anterior"]');
    var botonSiguiente = document.querySelector('[data-carrusel="siguiente"]');

    /* El índice se lleva en una variable y NO se deduce de scrollLeft. Es un detalle
       que costó una vuelta: leerlo del scroll mientras la animación suave está en
       marcha devuelve un valor intermedio, así que dos clics seguidos podían caer
       en la misma foto y el carrusel no llegaba al final (medido: con 10 clics se
       quedaba en la 6 de 7). El scroll solo sirve para sincronizar cuando el
       desplazamiento lo provoca el usuario. */
    var indice = 0;

    // Foto más próxima al centro de la pista. Se usa para resincronizar tras un
    // gesto del usuario, no para decidir a dónde va un botón.
    var indiceDelScroll = function () {
      var centro = pista.scrollLeft + pista.clientWidth / 2;
      var mejor = 0;
      var menor = Infinity;
      Array.prototype.forEach.call(fotos, function (foto, i) {
        var centroFoto = foto.offsetLeft - pista.offsetLeft + foto.offsetWidth / 2;
        var d = Math.abs(centroFoto - centro);
        if (d < menor) { menor = d; mejor = i; }
      });
      return mejor;
    };

    var pintar = function () {
      if (contador) {
        contador.innerHTML = '<strong>' + (indice + 1) + '</strong> / ' + fotos.length;
      }
      // En los extremos el botón se desactiva en lugar de desaparecer: si se
      // ocultara, la fila de controles daría un salto al llegar al final.
      if (botonAnterior) botonAnterior.disabled = indice === 0;
      if (botonSiguiente) botonSiguiente.disabled = indice === fotos.length - 1;
    };

    var centrar = function (i) {
      var destino = fotos[i];
      if (!destino) return;
      pista.scrollTo({
        // Se centra la foto en lugar de alinearla a la izquierda: con fotos de
        // anchos distintos, centrar mantiene el conjunto equilibrado.
        left: destino.offsetLeft - pista.offsetLeft
              - (pista.clientWidth - destino.offsetWidth) / 2,
        behavior: 'smooth'
      });
    };

    var irA = function (i) {
      indice = Math.max(0, Math.min(fotos.length - 1, i));
      centrar(indice);
      pintar();
    };

    if (botonAnterior) {
      botonAnterior.addEventListener('click', function () { irA(indice - 1); });
    }
    if (botonSiguiente) {
      botonSiguiente.addEventListener('click', function () { irA(indice + 1); });
    }

    /* Al desplazarse, se resincroniza el índice. Se espera al final del gesto en
       lugar de recalcular en cada píxel: un deslizamiento dispara decenas de
       eventos por segundo. Si el índice que sale del scroll es el que ya tenemos,
       no se pinta nada: así el temporizador no compite con los botones. */
    var temporizador = null;
    pista.addEventListener('scroll', function () {
      if (temporizador) window.clearTimeout(temporizador);
      temporizador = window.setTimeout(function () {
        var i = indiceDelScroll();
        if (i !== indice) { indice = i; pintar(); }
      }, 130);
    }, { passive: true });

    // Flechas del teclado cuando el foco está dentro del carrusel.
    pista.addEventListener('keydown', function (evento) {
      if (evento.key === 'ArrowRight') { evento.preventDefault(); irA(indice + 1); }
      if (evento.key === 'ArrowLeft') { evento.preventDefault(); irA(indice - 1); }
    });

    pintar();
  }

  /* --------------------------------- 4ter. Vídeo de presentación del taller */
  /* Mismo patrón que el vídeo del héroe: sin autoplay y con preload="none", para
     que no compita con la primera pintura. Se pide cuando la página está ociosa.
     Va por debajo del pliegue, así que además se espera a que entre en pantalla:
     no tiene sentido descargar 1,6 MB de vídeo que el visitante quizá no llegue a
     ver. La clase --visible se añade al confirmarse la reproducción; si el
     navegador la rechaza, queda el póster que el marco lleva de fondo. */
  var intro = document.getElementById('heroe-intro');
  if (intro) {
    var sinMovimientoIntro = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (sinMovimientoIntro) {
      // No se reproduce ni se descarga: queda el póster del marco.
    } else {
      var pedirIntro = function () {
        intro.preload = 'auto';
        intro.load();

        intro.addEventListener('playing', function () {
          intro.classList.add('heroe__intro--visible');
        }, { once: true });

        var intentoIntro = intro.play();
        if (intentoIntro && typeof intentoIntro.catch === 'function') {
          intentoIntro.catch(function () {});
        }
      };

      var arrancarIntro = function () {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(pedirIntro, { timeout: 3000 });
        } else {
          window.setTimeout(pedirIntro, 300);
        }
      };

      if ('IntersectionObserver' in window) {
        var observadorIntro = new IntersectionObserver(function (entradas) {
          entradas.forEach(function (entrada) {
            if (!entrada.isIntersecting) return;
            observadorIntro.unobserve(intro);
            arrancarIntro();
          });
        }, { threshold: 0, rootMargin: '200px 0px' });

        observadorIntro.observe(intro);
      } else {
        window.addEventListener('load', arrancarIntro);
      }
    }
  }

  /* --------------------------------------- 4bis. Botón flotante de WhatsApp */
  /* El botón está SIEMPRE visible, desde el héroe hasta el final: es el canal de
     conversión principal y no depende del scroll.

     Antes tenía una ventana de aparición (se ocultaba en el héroe y en el
     contacto). Se retiró a petición del cliente. El único roce que quedaba era
     en móvil, donde al final de la página tapaba el enlace de la firma; se
     resolvió con un relleno inferior en el pie, no ocultando el botón. Lo
     comprueba tools/diag_flotante_siempre.py. */

  /* ----------------------------------------------- 5. Formulario del pie */
  /* «Agenda tu revisión hoy» — los tres campos del wireframe: nombre, teléfono y
     modelo del auto, más la casilla de consentimiento del aviso de datos.

     Compone un mailto: valida en el cliente y abre el gestor de correo.

     ⚠ AVISO CONOCIDO — CARACTERES RAROS EN EL CORREO («TelÃ©fono»)
     -------------------------------------------------------------------------
     El texto se compone en UTF-8 y encodeURIComponent lo codifica según el RFC
     6068, que es lo correcto: «é» se convierte en %C3%A9. Comprobado capa por
     capa con tools/diag_codificacion_correo.py: el HTML declara UTF-8, este
     archivo es UTF-8 válido, el literal en memoria es correcto y el porcentaje
     resultante decodifica bien como UTF-8.

     El problema está del otro lado: algunos gestores de correo de Windows
     (Outlook y el manejador de mailto del sistema, entre otros) decodifican esos
     parámetros con la página de códigos del sistema (Latin-1 / Windows-1252) en
     lugar de UTF-8. Entonces %C3%A9 se lee como dos caracteres («Ã©») y %E2%80%94
     como «â€"». No lo podemos corregir desde el sitio: el sitio envía bien.

     Paliativo disponible si se quiere resolver ANTES de Formspree: limitar el
     cuerpo del correo a ASCII puro (sin tildes ni guiones largos). Pierde
     acentos pero se lee bien en cualquier cliente.

     Solución definitiva: Formspree. Al enviar por HTTP con UTF-8 real, el mailto
     desaparece del flujo y el problema con él. Está pendiente de que el cliente
     se registre y facilite el endpoint. */
  var CORREO_DESTINO = 'jbuitron@zonapitsmotors.com';

  function campoDe(formulario, nombre) { return formulario.elements[nombre]; }

  function limpiar(texto) {
    return String(texto).replace(/[\r\n]+/g, ' ').trim().slice(0, 300);
  }

  /* `requerido` decide si el campo vacío es válido y `validar` devuelve true o el
     mensaje de error. */
  var REGLAS = {
    nombre: {
      requerido: true,
      validar: function (v) { return v.length >= 2 || 'Escriba su nombre completo.'; }
    },
    modelo: {
      requerido: true,
      validar: function (v) {
        return v.length >= 3 || 'Indique la marca, el modelo y el año de su auto.';
      }
    },
    telefono: {
      requerido: true,
      validar: function (v) {
        var digitos = v.replace(/\D/g, '');
        // El ejemplo es un número ficticio a propósito. Antes era el del taller, y
        // eso invita a confusión: en un campo donde el visitante escribe SU teléfono,
        // poner el de la empresa como ejemplo parece una sugerencia.
        if (digitos.length < 10) return 'Escriba un teléfono a 10 dígitos (ej. 664 123 4567).';
        return true;
      }
    },
    /* Consentimiento expreso. No va marcado por defecto: el consentimiento tácito
       no es consentimiento, y la LFPDPPP pide que el titular lo manifieste. */
    consentimiento: {
      requerido: true,
      casilla: true,
      validar: function () { return true; },
      mensajeVacio: 'Necesitamos tu consentimiento para poder contactarte.'
    }
  };

  function pintarError(formulario, nombre, mensaje) {
    var input = campoDe(formulario, nombre);
    if (!input) return;
    var salida = formulario.querySelector('[data-error-de="' + nombre + '"]');
    var contenedor = input.closest('.campo');
    if (mensaje) {
      input.setAttribute('aria-invalid', 'true');
      if (contenedor) contenedor.classList.add('campo--error');
      if (salida) salida.textContent = mensaje;
    } else {
      input.removeAttribute('aria-invalid');
      if (contenedor) contenedor.classList.remove('campo--error');
      if (salida) salida.textContent = '';
    }
  }

  function validarCampo(formulario, nombre) {
    var input = campoDe(formulario, nombre);
    var regla = REGLAS[nombre];
    if (!input || !regla) return true;

    // Una casilla no tiene valor de texto: lo que importa es si está marcada.
    if (regla.casilla) {
      if (regla.requerido && !input.checked) {
        pintarError(formulario, nombre, regla.mensajeVacio || 'Marque esta casilla.');
        return false;
      }
      pintarError(formulario, nombre, '');
      return true;
    }

    var valor = String(input.value || '').trim();

    if (regla.requerido && !valor) {
      pintarError(formulario, nombre, 'Este campo es obligatorio.');
      return false;
    }
    var resultado = regla.validar(valor);
    if (resultado === true) {
      pintarError(formulario, nombre, '');
      return true;
    }
    pintarError(formulario, nombre, resultado);
    return false;
  }

  var formularioPie = document.getElementById('formulario-pie');

  if (formularioPie) {
    var estadoPie = formularioPie.querySelector('.formulario__estado');
    var CAMPOS = ['nombre', 'telefono', 'modelo', 'consentimiento'];

    CAMPOS.forEach(function (nombre) {
      var input = campoDe(formularioPie, nombre);
      if (!input) return;
      var regla = REGLAS[nombre];

      // La casilla no dispara «blur» en todos los navegadores: se escucha
      // «change», que es su evento natural.
      if (regla && regla.casilla) {
        input.addEventListener('change', function () {
          validarCampo(formularioPie, nombre);
        });
        return;
      }

      input.addEventListener('blur', function () { validarCampo(formularioPie, nombre); });
      input.addEventListener('input', function () {
        if (input.getAttribute('aria-invalid') === 'true') {
          validarCampo(formularioPie, nombre);
        }
      });
    });

    formularioPie.addEventListener('submit', function (evento) {
      evento.preventDefault();

      // Trampa antibots: si viene rellena, se ignora el envío en silencio.
      var trampa = campoDe(formularioPie, 'sitio-web');
      if (trampa && trampa.value) return;

      var primerFallo = null;
      CAMPOS.forEach(function (nombre) {
        if (!validarCampo(formularioPie, nombre) && !primerFallo) {
          primerFallo = campoDe(formularioPie, nombre);
        }
      });

      if (primerFallo) {
        if (estadoPie) {
          estadoPie.dataset.tipo = 'error';
          estadoPie.textContent = 'Revise los campos marcados antes de enviar.';
        }
        primerFallo.focus();
        return;
      }

      var asunto = 'Solicitud de revisión — ' + limpiar(campoDe(formularioPie, 'nombre').value);
      var cuerpo = [
        'Nombre: ' + limpiar(campoDe(formularioPie, 'nombre').value),
        'Teléfono: ' + limpiar(campoDe(formularioPie, 'telefono').value),
        'Modelo del auto: ' + limpiar(campoDe(formularioPie, 'modelo').value),
        'Consentimiento del aviso de datos: otorgado',
        '',
        'Solicita agendar una revisión y un diagnóstico sin costo.',
        '',
        '— Enviado desde zonapitsmotors.com'
      ].join('\n');

      window.location.href = 'mailto:' + CORREO_DESTINO +
                             '?subject=' + encodeURIComponent(asunto) +
                             '&body=' + encodeURIComponent(cuerpo);

      if (estadoPie) {
        estadoPie.dataset.tipo = 'ok';
        estadoPie.textContent = 'Abriendo su gestor de correo con la solicitud lista para enviar…';
      }
      formularioPie.reset();
    });
  }

  /* ------------------------------------ 6. Reseñas de Google (Elfsight) */
  /* El widget NO se carga aquí: lo inyecta consentimiento.js y solo después de
     que el visitante acepte las cookies de terceros. Este bloque únicamente
     retira el aviso de respaldo cuando el widget ya ha pintado algo.

     Por qué un observador y no un evento del propio Elfsight: es un script de
     terceros y no publica ningún callback documentado con el que avisar. Mirar el
     DOM es lo único que no ata el sitio a su API interna, que puede cambiar sin
     aviso. Se observa childList y subtree porque Elfsight no mete el iframe
     directamente en la caja, sino dentro de un envoltorio que crea él.

     Si el visitante no acepta, esto no se dispara nunca y el aviso se queda donde
     está: es exactamente lo que tiene que pasar. */
  var cajaResenas = document.querySelector('[data-resenas-app]');
  var moduloResenas = document.querySelector('[data-resenas]');

  if (cajaResenas && moduloResenas) {
    var observadorResenas = null;

    var marcarResenas = function () {
      if (!cajaResenas.childElementCount) return;
      moduloResenas.classList.add('resenas--cargadas');
      if (observadorResenas) observadorResenas.disconnect();
    };

    /* Reserva del alto del widget. Se sabe que va a llegar cuando hay
       consentimiento, y hay dos caminos hasta aquí:
         - que ya estuviera decidido de una visita anterior, que se consulta ahora
           (consentimiento.js se carga antes que este archivo: los dos van con defer
           y en ese orden);
         - que el visitante acepte durante esta visita, que llega por el evento.
       En los dos casos se reserva ANTES de que Elfsight dibuje, y eso importa:
       el widget es perezoso y no se monta hasta que entra en pantalla, así que
       cuando el visitante llegue a la sección el hueco ya está puesto. */
    var reservarResenas = function () {
      moduloResenas.classList.add('resenas--previstas');
    };

    if (window.ZPMConsentimiento && window.ZPMConsentimiento.aceptado()) {
      reservarResenas();
    }

    document.addEventListener('zpm:consentimiento', function (evento) {
      if (evento.detail && evento.detail.aceptado) reservarResenas();
    });

    if ('MutationObserver' in window) {
      observadorResenas = new MutationObserver(marcarResenas);
      observadorResenas.observe(cajaResenas, { childList: true, subtree: true });
    } else {
      /* Sin MutationObserver queda el sondeo. Se rinde a los 30 s: si Elfsight no
         ha pintado para entonces no va a pintar, y no tiene sentido dejar un
         temporizador girando durante toda la sesión. */
      var intentosResenas = 0;
      var relojResenas = window.setInterval(function () {
        intentosResenas += 1;
        if (cajaResenas.childElementCount) {
          window.clearInterval(relojResenas);
          marcarResenas();
        } else if (intentosResenas > 60) {
          window.clearInterval(relojResenas);
        }
      }, 500);
    }
  }
})();
