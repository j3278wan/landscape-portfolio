/* Small, optional interactions for the two case studies. */
'use strict';

// The source HTML shows both images. Only hide a panel after its tabs work.
document.querySelectorAll('[data-view-tabs]').forEach((group) => {
  const controls = group.querySelector('[data-tab-controls]');
  const tabs = [...controls.querySelectorAll('button')];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
  if (!tabs.length || panels.some((panel) => !panel)) return;

  function selectView(index, moveFocus = false) {
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
    if (moveFocus) tabs[index].focus();
    // Switching between tall and wide views can change the reading distance.
    requestAnimationFrame(scheduleReadingUpdate);
  }

  controls.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => selectView(index));
    tab.addEventListener('keydown', (event) => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === undefined) return;
      event.preventDefault();
      selectView(nextIndex, true);
    });
  });

  group.classList.add('is-enhanced');
  selectView(0);
  controls.hidden = false;
  group.querySelector('[data-tab-hint]').hidden = false;
});

// A quiet progress line follows normal page scrolling; it never controls it.
const readingLine = document.createElement('div');
readingLine.className = 'case-reading-progress';
readingLine.setAttribute('aria-hidden', 'true');
document.body.append(readingLine);

const chapterLinks = [...document.querySelectorAll('.project-jump-links a')];
const chapters = chapterLinks.map((link) => document.querySelector(link.getAttribute('href')));
let updatePending = false;

function updateReadingPosition() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
  readingLine.style.transform = `scaleX(${progress})`;
  let active = -1;
  chapters.forEach((chapter, index) => {
    if (chapter && chapter.getBoundingClientRect().top < window.innerHeight * .42) active = index;
  });
  chapterLinks.forEach((link, index) => {
    if (index === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  updatePending = false;
}

function scheduleReadingUpdate() {
  if (updatePending) return;
  updatePending = true;
  requestAnimationFrame(updateReadingPosition);
}

window.addEventListener('scroll', scheduleReadingUpdate, { passive: true });
window.addEventListener('resize', scheduleReadingUpdate);
// Metadata and lazy images can alter the document height after the first paint.
window.addEventListener('load', scheduleReadingUpdate);
document.addEventListener('load', scheduleReadingUpdate, true);
scheduleReadingUpdate();
