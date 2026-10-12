/* ==========================================================================
   Zona Pits Motors — Consentimiento de cookies y carga diferida de terceros
   Sin dependencias. Degrada correctamente si el JavaScript falla.

   Qué hace:
     1. Muestra un banner la primera vez y guarda la decisión (aceptar o
        rechazar) en localStorage.
     2. NO carga ningún recurso de terceros hasta que el visitante acepta.
        Los terceros se declaran en REGISTRO con su categoría y la función que
        los inyecta. Hoy hay dos dados de alta: Elfsight, que sirve el widget de
        reseñas de Google, y Google Maps, que sirve el mapa de la sección de
        contacto.
     3. Expone window.ZPMConsentimiento para poder cambiar la decisión desde el
        enlace «Preferencias de cookies» del pie.

   Por qué el banner se construye desde JavaScript y no está en el HTML: así el
   texto legal es legible para cualquiera, incluso con JavaScript desactivado, y
   el banner no ocupa espacio en el documento para quien ya decidió.
   ========================================================================== */
(function () {
  'use strict';

  var CLAVE = 'zpm-consentimiento';
  /* VERSION 2 (07/10/2026): se dio de alta Elfsight.
     VERSION 3 (07/10/2026): se dio de alta Google Maps (el mapa de la sección de
     contacto). Cada subida invalida a propósito las decisiones guardadas: un «sí»
     anterior solo cubría los terceros que había entonces, y no puede heredarse
     para uno nuevo. */
  var VERSION = 3;

  /* --------------------------------------------------- 1. Estado guardado */
  function leer() {
    try {
      var crudo = window.localStorage.getItem(CLAVE);
      if (!crudo) return null;
      var datos = JSON.parse(crudo);
      // Una decisión de una versión anterior no sirve: los terceros cambiaron.
      if (!datos || datos.version !== VERSION) return null;
      return datos;
    } catch (error) {
      // Modo privado o almacenamiento bloqueado: se trata como «sin decidir».
      return null;
    }
  }

  function guardar(aceptado) {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify({
        version: VERSION,
        aceptado: !!aceptado,
        fecha: new Date().toISOString()
      }));
    } catch (error) {
      /* Si no se puede guardar, la decisión vale para esta visita. */
    }
  }

  /* ------------------------------------------- 2. Terceros y su carga */
  /* Nada de esto se ejecuta sin consentimiento. Para dar de alta un proveedor
     nuevo basta añadir una entrada aquí y subir VERSION. */
  var REGISTRO = [
    {
      nombre: 'Elfsight (reseñas de Google)',
      categoria: 'terceros',
      /* La URL es la que reparte el panel de Elfsight para este widget. Estuvo
         apuntada a static.elfsight.com/platform/platform.js, el host antiguo; se
         usa el que da el panel hoy. */
      cargar: function () {
        var s = document.createElement('script');
        s.src = 'https://elfsightcdn.com/platform.js';
        s.async = true;
        document.head.appendChild(s);
      }
    },
    {
      nombre: 'Google Maps (mapa de la ubicación)',
      categoria: 'terceros',
      /* Este no inyecta un <script> como Elfsight, sino el <iframe> del mapa en el
         hueco que index.html deja al final de la sección de contacto. Hasta que
         esto corre no sale ni una petición a google.com por el mapa: en el HTML
         solo hay un párrafo de aviso y el botón «Cómo llegar», que es un enlace y
         no instala nada. */
      cargar: function () {
        var lienzo = document.querySelector('[data-mapa-lienzo]');
        if (!lienzo) return;

        var iframe = document.createElement('iframe');
        iframe.src = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3364.144558809374!2d-117.07683572627948!3d32.522285873771104!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d94b6b20fd6f57%3A0xd0a00e7aed1853da!2sZONA%20PITS%20MOTORS!5e0!3m2!1ses-419!2smx!4v1791443476233!5m2!1ses-419!2smx';
        /* El título no es decorativo: un <iframe> sin él se anuncia como «marco»
           a quien use lector de pantalla, sin decir de qué. */
        iframe.title = 'Mapa con la ubicación de Zona Pits Motors en Tijuana';
        /* Perezoso: el mapa está al final de la página y no tiene sentido bajarlo
           para quien no llega hasta ahí. */
        iframe.loading = 'lazy';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        lienzo.appendChild(iframe);

        /* La clase es la que hace que el marco reserve la proporción del mapa y
           que se active la capa táctil. Se pone aquí, con el iframe, para que el
           hueco y el mapa aparezcan en el mismo fotograma. */
        var modulo = lienzo.closest('[data-mapa]');
        if (modulo) modulo.classList.add('mapa--cargado');
      }
    }
  ];

  function cargarTerceros() {
    REGISTRO.forEach(function (proveedor) {
      if (proveedor.categoria !== 'esencial') {
        try { proveedor.cargar(); } catch (error) { /* un tercero caído no rompe la página */ }
      }
    });
  }

  /* ------------------------------------------------------- 3. El banner */
  var banner = null;
  var observadorAlto = null;

  /* Publica la altura real del banner en la variable CSS --banner-alto, para que
     el botón flotante de WhatsApp se apoye justo encima. Se mide en lugar de
     fijar un número: en móvil el banner es bastante más alto porque los botones
     se apilan, y un valor fijo dejaba el botón tapado. */
  function publicarAlto() {
    if (!banner || banner.hidden) return;
    var alto = banner.offsetHeight;
    if (alto > 0) {
      document.documentElement.style.setProperty('--banner-alto', alto + 'px');
    }
  }

  /* Si el banner cambia de tamaño (rotar el teléfono, cambiar el ancho de la
     ventana), la altura publicada deja de servir. */
  function vigilarAlto() {
    if (observadorAlto || typeof ResizeObserver !== 'function') return;
    observadorAlto = new ResizeObserver(publicarAlto);
    observadorAlto.observe(banner);
  }

  function construirBanner() {
    if (banner) return banner;

    banner = document.createElement('div');
    banner.className = 'consentimiento';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'consentimiento-titulo');
    banner.hidden = true;
    banner.innerHTML =
      '<div class="contenedor consentimiento__interior">' +
        '<div class="consentimiento__texto">' +
          '<p id="consentimiento-titulo">' +
            'Usamos cookies y almacenamiento del navegador. Las necesarias hacen ' +
            'que el sitio funcione. Con tu permiso usaríamos también cookies de ' +
            'terceros para mostrar reseñas de Google. ' +
            '<a href="politica-de-cookies.html">Ver la política de cookies</a>.' +
          '</p>' +
        '</div>' +
        '<div class="consentimiento__acciones">' +
          '<button type="button" class="boton boton--fantasma" data-consentimiento="rechazar">' +
            'Solo las necesarias' +
          '</button>' +
          '<button type="button" class="boton boton--primario" data-consentimiento="aceptar">' +
            'Aceptar todas' +
          '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(banner);

    banner.addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-consentimiento]');
      if (!boton) return;
      decidir(boton.getAttribute('data-consentimiento') === 'aceptar');
    });

    return banner;
  }

  function mostrarBanner() {
    construirBanner().hidden = false;
    // El botón flotante de WhatsApp vive en la misma franja inferior que el
    // banner: sin esto queda tapado y no se puede pulsar. La clase la consume el
    // CSS para subirlo, usando la altura que se publica aquí.
    document.body.classList.add('con-banner-cookies');
    publicarAlto();
    vigilarAlto();
    // El foco entra en el diálogo: sin esto, quien navega con teclado tendría
    // que recorrer toda la página para encontrarlo.
    var primero = banner.querySelector('[data-consentimiento]');
    if (primero) primero.focus();
  }

  function ocultarBanner() {
    if (banner) banner.hidden = true;
    document.body.classList.remove('con-banner-cookies');
    if (observadorAlto) {
      observadorAlto.disconnect();
      observadorAlto = null;
    }
  }

  function decidir(aceptado) {
    guardar(aceptado);
    ocultarBanner();
    anunciar(aceptado);
    if (aceptado) cargarTerceros();
  }

  /* Avisa a quien lo escuche de que el visitante acaba de decidir. Lo usa main.js
     para reservar el alto del widget de reseñas en cuanto hay consentimiento: si
     esperase a que Elfsight dibujase, el hueco se reservaría tarde y la sección de
     contacto daría un salto. */
  function anunciar(aceptado) {
    try {
      document.dispatchEvent(new CustomEvent('zpm:consentimiento', {
        detail: { aceptado: !!aceptado }
      }));
    } catch (error) {
      /* Sin CustomEvent el aviso no sale: el widget aparecerá sin hueco reservado
         y el sitio sigue funcionando igual. */
    }
  }

  /* ------------------------------------------------------- 4. Arranque */
  function iniciar() {
    var decision = leer();
    if (decision) {
      if (decision.aceptado) cargarTerceros();
      return;   // ya decidió: no se le vuelve a preguntar
    }
    mostrarBanner();
  }

  /* API pública: la usa el enlace «Preferencias de cookies» del pie. */
  window.ZPMConsentimiento = {
    abrir: mostrarBanner,
    aceptado: function () {
      var d = leer();
      return !!(d && d.aceptado);
    },
    /* Para probar el banner sin borrar el almacenamiento a mano. */
    revocar: function () {
      try { window.localStorage.removeItem(CLAVE); } catch (error) {}
      mostrarBanner();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
