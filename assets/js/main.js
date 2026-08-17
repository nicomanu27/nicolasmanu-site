// WhatsApp
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
  menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));

  // Video: autoplay + parallax al scroll
  const video = document.getElementById('heroVideo');
  video.muted = true;
  video.play().catch(() => {});

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      video.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      ticking = false;
    });
  }, { passive: true });
