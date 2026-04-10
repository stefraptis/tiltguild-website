// ── Nav burger menu ──
const burger = document.getElementById('navBurger');
const mobile = document.getElementById('navMobile');
if (burger && mobile) {
  burger.addEventListener('click', () => {
    const isOpen = burger.classList.toggle('open');
    mobile.classList.toggle('open');
    document.body.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', isOpen);
    mobile.setAttribute('aria-hidden', !isOpen);
  });
  // Close on mobile link click
  mobile.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      burger.classList.remove('open');
      mobile.classList.remove('open');
      document.body.classList.remove('nav-open');
    });
  });
}

// ── Auto footer year ──
document.querySelectorAll('.footer-year').forEach(el => {
  el.textContent = new Date().getFullYear();
});
