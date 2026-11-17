const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav');

toggle.addEventListener('click', () => {
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
  toggle.setAttribute('aria-label', expanded ? 'Open menu' : 'Close menu');
  nav.classList.toggle('is-open', !expanded);
});

nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
  nav.classList.remove('is-open');
}));

document.querySelector('#year').textContent = new Date().getFullYear();
