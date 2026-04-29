/**
 * tips.js — Modal de Tips y Atajos
 */

(function () {
  'use strict';

  var tipsBtn = document.getElementById('tips-btn');
  var tipsModal = document.getElementById('tips-modal');
  var tipsClose = document.getElementById('tips-close');

  function openTips() {
    tipsModal.style.display = '';
  }

  function closeTips() {
    tipsModal.style.display = 'none';
  }

  if (tipsBtn) tipsBtn.addEventListener('click', openTips);
  if (tipsClose) tipsClose.addEventListener('click', closeTips);

  tipsModal.addEventListener('click', function (e) {
    if (e.target === tipsModal) closeTips();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && tipsModal.style.display !== 'none') {
      closeTips();
    }
  });
})();
