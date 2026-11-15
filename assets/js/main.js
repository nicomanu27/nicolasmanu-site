// WhatsApp (el HTML ya trae el enlace completo; esto lo mantiene en un solo lugar)
  const WHATSAPP_NUMBER = "573503462481";
  const WHATSAPP_MSG = "Hola Nicolás, vi tu página y me gustaría conversar sobre tus servicios, gracias!";
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`;
  ["wa-nav", "wa-nav-mobile", "wa-hero", "wa-footer"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = waLink;
  });

  // Menú mobile
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  menuBtn.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Abrir menú');
  }));

  // Video: autoplay + parallax al scroll, salvo que la persona pida menos movimiento
  const video = document.getElementById('heroVideo');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      video.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      ticking = false;
    });
  }

  function applyMotion() {
    if (reduceMotion.matches) {
      video.removeAttribute('autoplay');
      video.pause();
      window.removeEventListener('scroll', onScroll);
      video.style.transform = '';
    } else {
      video.muted = true;
      video.play().catch(() => {});
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  applyMotion();
  reduceMotion.addEventListener('change', applyMotion);
