/**
 * quotes.js — Frases motivacionales en español
 * Colección de más de 20 frases con animación de cambio
 */

(function () {
  'use strict';

  // --- Elementos del DOM ---
  const quoteText = document.getElementById('quote-text');
  const quoteAuthor = document.getElementById('quote-author');
  const newQuoteBtn = document.getElementById('new-quote-btn');

  // --- Colección de frases motivacionales en español ---
  const FRASES = [
    { texto: 'El único modo de hacer un gran trabajo es amar lo que haces.', autor: 'Steve Jobs' },
    { texto: 'La vida es lo que pasa mientras estás ocupado haciendo otros planes.', autor: 'John Lennon' },
    { texto: 'El futuro pertenece a quienes creen en la belleza de sus sueños.', autor: 'Eleanor Roosevelt' },
    { texto: 'No es la montaña lo que conquistamos, sino a nosotros mismos.', autor: 'Edmund Hillary' },
    { texto: 'El éxito no es definitivo, el fracaso no es fatal: es el coraje para continuar lo que cuenta.', autor: 'Winston Churchill' },
    { texto: 'Cree que puedes y ya estarás a medio camino.', autor: 'Theodore Roosevelt' },
    { texto: 'La mejor manera de predecir el futuro es crearlo.', autor: 'Peter Drucker' },
    { texto: 'La disciplina es el puente entre las metas y los logros.', autor: 'Jim Rohn' },
    { texto: 'No cuentes los días, haz que los días cuenten.', autor: 'Muhammad Ali' },
    { texto: 'El conocimiento es poder.', autor: 'Francis Bacon' },
    { texto: 'La creatividad es la inteligencia divirtiéndose.', autor: 'Albert Einstein' },
    { texto: 'Todo lo que puedes imaginar es real.', autor: 'Pablo Picasso' },
    { texto: 'El límite solo existe en tu mente.', autor: 'Anónimo' },
    { texto: 'Haz lo que puedas, con lo que tengas, donde estés.', autor: 'Theodore Roosevelt' },
    { texto: 'La perseverancia es la madre de la buena suerte.', autor: 'Miguel de Cervantes' },
    { texto: 'Un viaje de mil kilómetros comienza con un solo paso.', autor: 'Lao Tzu' },
    { texto: 'La educación es el arma más poderosa para cambiar el mundo.', autor: 'Nelson Mandela' },
    { texto: 'Sé el cambio que quieres ver en el mundo.', autor: 'Mahatma Gandhi' },
    { texto: 'La simplicidad es la máxima sofisticación.', autor: 'Leonardo da Vinci' },
    { texto: 'El que no arriesga, no gana.', autor: 'Refrán popular' },
    { texto: 'Cada día es una nueva oportunidad para cambiar tu vida.', autor: 'Anónimo' },
    { texto: 'La felicidad no es algo hecho. Viene de tus propias acciones.', autor: 'Dalai Lama' },
    { texto: 'El dolor que no sientes te hace más fuerte.', autor: 'Nietzsche' },
    { texto: 'Solo aquellos que se arriesgan a ir demasiado lejos pueden descubrir hasta dónde pueden llegar.', autor: 'T.S. Eliot' },
    { texto: 'Tu tiempo es limitado, no lo malgastes viviendo la vida de otro.', autor: 'Steve Jobs' }
  ];

  // Índice de la última frase mostrada (para no repetir)
  let ultimoIndice = -1;

  /**
   * Obtiene un índice aleatorio diferente al último
   * @returns {number} Índice de la frase
   */
  function obtenerIndiceAleatorio() {
    let indice;
    do {
      indice = Math.floor(Math.random() * FRASES.length);
    } while (indice === ultimoIndice && FRASES.length > 1);
    ultimoIndice = indice;
    return indice;
  }

  /**
   * Muestra una nueva frase con animación de desvanecimiento
   */
  function mostrarFrase() {
    const frase = FRASES[obtenerIndiceAleatorio()];

    // Animación de salida
    quoteText.style.opacity = '0';
    quoteAuthor.style.opacity = '0';

    setTimeout(() => {
      quoteText.textContent = frase.texto;
      quoteAuthor.textContent = '— ' + frase.autor;

      // Animación de entrada
      quoteText.style.opacity = '1';
      quoteAuthor.style.opacity = '1';
    }, 300);
  }

  // --- Eventos ---
  newQuoteBtn.addEventListener('click', mostrarFrase);

  // --- Inicialización ---
  function init() {
    // Configurar transición para autor
    quoteAuthor.style.transition = 'opacity 0.3s ease';

    // Mostrar frase inicial
    mostrarFrase();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
