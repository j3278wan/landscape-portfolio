/* Progressive enhancement: the pages, links, and images also work without JS. */
'use strict';

document.documentElement.classList.add('js-enabled');

// 1. Mobile navigation: keep the button state in sync with the visible menu.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');

function closeMenu() {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
}

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
  window.matchMedia('(min-width: 721px)').addEventListener('change', closeMenu);
}

// 2. One reusable image viewer for every button with the data-lightbox attribute.
// Native <dialog>.showModal() keeps keyboard focus inside the viewer.
const lightbox = document.createElement('dialog');
lightbox.className = 'lightbox';
lightbox.setAttribute('aria-label', 'Enlarged project image');
lightbox.setAttribute('aria-describedby', 'lightbox-caption');
lightbox.innerHTML = `
  <div class="lightbox-header">
    <span>Project image</span>
    <button class="lightbox-close" type="button" autofocus aria-label="Close image viewer">Close ×</button>
  </div>
  <img class="lightbox-image" alt="">
  <p class="lightbox-error" hidden role="status">This image could not be loaded. Please close the viewer and try again.</p>
  <p class="lightbox-caption" id="lightbox-caption"></p>
`;
document.body.append(lightbox);

const expandedImage = lightbox.querySelector('.lightbox-image');
const imageCaption = lightbox.querySelector('.lightbox-caption');
const imageError = lightbox.querySelector('.lightbox-error');
let previousFocus = null;

expandedImage.addEventListener('error', () => {
  expandedImage.hidden = true;
  imageError.hidden = false;
});

document.querySelectorAll('[data-lightbox]').forEach((button) => {
  const thumbnail = button.querySelector('img');
  if (!thumbnail) return;
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-label', `Enlarge image: ${thumbnail.alt}`);
  button.addEventListener('click', () => {
    previousFocus = button;
    expandedImage.hidden = false;
    imageError.hidden = true;
    expandedImage.alt = thumbnail.alt;
    expandedImage.src = button.dataset.src || thumbnail.src;
    imageCaption.textContent = button.dataset.caption || thumbnail.alt;
    lightbox.showModal();
    document.body.classList.add('dialog-open');
  });
});

lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());

// A click outside the dialog closes it. Native Esc also triggers the close event.
lightbox.addEventListener('click', (event) => {
  if (event.target !== lightbox) return;
  const bounds = lightbox.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) lightbox.close();
});

lightbox.addEventListener('close', () => {
  document.body.classList.remove('dialog-open');
  expandedImage.removeAttribute('src');
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
});

// 3. A small example of updating text from JavaScript.
document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});
