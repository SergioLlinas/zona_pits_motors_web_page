/* ==========================================================================
   Zona Pits Motors — Animación de titulares con GSAP SplitText (por palabra)
   Requiere js/vendor/gsap.min.js y js/vendor/SplitText.min.js.

   Principios:
   - Si GSAP no carga o falla, los titulares quedan intactos y visibles.
   - Con "prefers-reduced-motion" activo no se toca nada.
   - El estado inicial se fija con gsap.set y se revela con gsap.to. Usar
     gsap.from después de un gsap.set con los mismos valores dejaría el texto
     oculto para siempre: el tween animaría hacia el propio estado inicial.

   Sobre la duración: la primera versión duraba 0,9 s con un retardo de 0,055 s
   entre palabras, y el titular se terminaba de armar en poco más de un segundo.
   Se percibía como un parpadeo, no como una entrada. Ahora el H1 se toma ~2,4 s
   y los H2 ~1,8 s, que es lo que hace que el efecto se pueda ver.
   ========================================================================== */
(function () {
  'use strict';

  var gsap = window.gsap;
  var SplitText = window.SplitText;

  // Sin librería no hay animación: el contenido ya es visible por defecto.
  if (!gsap || !SplitText) return;

  // Respeto a la preferencia del sistema por menos movimiento.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(SplitText);

  // Los h2 del pie son etiquetas pequeñas de navegación: no se animan.
  var titulares = gsap.utils.toArray('h1, h2:not(.pie__titulo)');
  if (!titulares.length) return;

  /* ------------------------------------------------------------ Ajustes */
  // El H1 es el titular sobre el vídeo: se lleva la entrada más larga y
  // aparatosa. Los H2 se repiten por toda la página, así que van más sobrios,
  // que si no la página entera se siente lenta.
  var H1 = {
    duracion: 1.5,      // por palabra
    retardo: 0.11,      // entre palabras: marca el ritmo de la cascada
    desenfoque: 14      // px de blur inicial, de 0 a nítido
  };
  var H2 = {
    duracion: 0.9,
    retardo: 0.06,
    desenfoque: 8
  };

  /* Ciertos H2 llevan la animación completa, igual que el H1. No es una
     excepción por capricho: «Adiós a los talleres que "adivinan"» es el titular
     de la sección de confianza, el que responde a la objeción principal del
     buyer persona, y funciona como un segundo golpe visual. El resto de H2 son
     encabezados de apoyo y mantenerlos sobrios evita que la página pese.
     Se marca en el HTML con data-animacion="destacada", no por índice ni por
     texto: así el día que cambie el copy la animación no se muda a otro sitio
     sin que nadie se entere. */
  var DESTACADO = '[data-animacion="destacada"]';

  function ajustesDe(titular) {
    if (titular.tagName === 'H1') return H1;
    if (titular.matches(DESTACADO)) return H1;
    return H2;
  }

  // El navegador tarda el doble en animar el desenfoque que en mover el texto.
  // En móvil, que es donde peor se nota, se reduce; y si el sistema pide menos
  // movimiento, la preferencia ya se respetó arriba y no se llega aquí.
  var ES_MOVIL = window.matchMedia('(max-width: 880px)').matches;
  var BLUR_ACTIVO = !ES_MOVIL;

  /* Estado inicial. yPercent 110 es lo que hace que la palabra venga desde
     debajo de su propia máscara: el CSS la deja sin desbordar la línea. */
  function estadoInicial(cfg) {
    var desde = { yPercent: 110, opacity: 0 };
    if (BLUR_ACTIVO) {
      desde.filter = 'blur(' + cfg.desenfoque + 'px)';
      desde.scale = 0.96;
    }
    return desde;
  }

  // Titulares ocultos a la espera de entrar en pantalla (red de seguridad).
  var enEspera = [];

  function revelar(titular, palabras, cfg) {
    var indice = enEspera.indexOf(titular);
    if (indice > -1) enEspera.splice(indice, 1);

    var hacia = {
      yPercent: 0,
      opacity: 1,
      duration: cfg.duracion,
      /* power4.out frena más tarde y más fuerte que power3: el texto entra
         rápido y se posa, en vez de frenar de forma uniforme. Es lo que hace
         que se lea como una entrada y no como un simple desplazamiento. */
      ease: 'power4.out',
      stagger: cfg.retardo,
      overwrite: true,
      // transform (y no filter) en clearProps: si se limpiara el filter, cada
      // palabra se quedaría con el suyo y el titular con 10 filtros activos.
      clearProps: 'transform'
    };
    if (BLUR_ACTIVO) {
      hacia.filter = 'blur(0px)';
      hacia.scale = 1;
    }

    gsap.to(palabras, hacia);
  }

  function dividir(titular) {
    var dividido;
    try {
      dividido = SplitText.create(titular, {
        type: 'words',
        // Enmascara cada palabra para que se descubra desde su propia linea en
        // vez de viajar por encima del parrafo siguiente (skill, seccion 8.2).
        mask: 'words',
        wordsClass: 'palabra',
        aria: 'auto'          // el lector de pantalla lee la frase completa
      });
    } catch (error) {
      return null;            // el titular se queda tal cual estaba
    }
    var palabras = dividido.words;
    return palabras && palabras.length ? palabras : null;
  }

  function iniciar() {
    if (iniciar.hecho) return;
    iniciar.hecho = true;

    titulares.forEach(function (titular) {
      var palabras = dividir(titular);
      if (!palabras) return;

      var esH1 = titular.tagName === 'H1';
      var cfg = ajustesDe(titular);

      // El degradado metálico del contenedor no sobrevive al troceado:
      // se traslada a cada palabra desde el CSS.
      if (titular.classList.contains('metalico')) {
        titular.classList.add('metalico--palabras');
      }

      // Estado inicial idéntico para todos, y luego se revela.
      gsap.set(palabras, estadoInicial(cfg));

      /* El H1 no se revela de golpe al cargar. Antes se lanzaba en cuanto
         había tipografías y para cuando el visitante levantaba la vista ya
         había terminado. Ahora arranca con un compás de espera corto, que es
         lo que permite VERLO empezar, y así la entrada se lee como una
         secuencia y no como un parpadeo del que solo se ve el final. */
      if (esH1) {
        gsap.delayedCall(0.35, function () { revelar(titular, palabras, cfg); });
        return;
      }

      // Los H2 esperan a entrar en pantalla.
      if (!('IntersectionObserver' in window)) {
        revelar(titular, palabras, cfg);
        return;
      }

      enEspera.push(titular);

      /* threshold 0.35 y no 0.2: el titular arranca cuando ya está bien
         metido en pantalla. Con 0.2 empezaba a animarse con el borde superior
         justo asomando, así que media animación ocurría fuera de la vista y el
         visitante solo veía el final. */
      var observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          observador.unobserve(titular);
          revelar(titular, palabras, cfg);
        });
      }, { threshold: 0.35, rootMargin: '0px 0px -80px 0px' });

      observador.observe(titular);
    });

    // Red de seguridad: nada debe quedarse invisible. Se usan los ajustes que le
    // corresponden a cada titular, no los del H2: si el destacado se quedara sin
    // disparar, debe entrar con su animación, no con una que no le toca.
    window.setTimeout(function () {
      enEspera.slice().forEach(function (titular) {
        var palabras = titular.querySelectorAll('.palabra');
        if (palabras.length) revelar(titular, palabras, ajustesDe(titular));
      });
    }, 7000);
  }

  function arrancar() {
    // Se espera a las tipografías para que el troceado no cambie después.
    var tipografias = (document.fonts && document.fonts.ready)
      ? document.fonts.ready
      : Promise.resolve();

    Promise.resolve(tipografias).then(iniciar, iniciar);

    // Si document.fonts se atasca, se anima igualmente.
    window.setTimeout(iniciar, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();
