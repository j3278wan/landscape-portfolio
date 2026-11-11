/* Keep native video controls, including seeking on hosts without byte-range support. */
'use strict';

document.querySelectorAll('[data-seekable-video]').forEach((video) => {
  const source = video.querySelector('source');
  if (!source) return;
  const sourceURL = new URL(source.src, document.baseURI);
  // Local files and the bundled offline preview already support native seeking.
  if (!['http:', 'https:'].includes(sourceURL.protocol)) return;

  let loading = false;
  let prepared = false;
  let objectURL;
  const controller = new AbortController();
  const status = document.createElement('p');
  status.className = 'video-status muted';
  status.setAttribute('role', 'status');
  status.hidden = true;
  video.after(status);

  async function prepareVideo() {
    if (loading || prepared) return;
    // A server with full seek support needs no extra download or source swap.
    if (video.duration > 0 && video.seekable.length &&
        video.seekable.end(video.seekable.length - 1) >= video.duration - 0.1) {
      prepared = true;
      return;
    }

    loading = true;
    status.textContent = 'Loading video…';
    status.hidden = false;
    try {
      const response = await fetch(sourceURL.href, { signal: controller.signal });
      if (!response.ok) throw new Error('Video download failed');
      const bytes = await response.blob();
      // A Blob is a complete copy in browser memory: the timeline can seek
      // through it without asking the host for a particular byte range.
      objectURL = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
      const resumeTime = video.currentTime;
      const wasPlaying = !video.paused && !video.ended;
      video.addEventListener('loadedmetadata', () => {
        video.currentTime = Math.min(resumeTime, video.duration);
        status.hidden = true;
        if (wasPlaying) video.play().catch(() => {
          // Native Play remains available if the browser requires another tap.
        });
      }, { once: true });
      video.src = objectURL;
      video.load();
      prepared = true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        status.textContent = 'The full video could not load. Press Play to retry.';
        // Keep the original source available when the connection fails.
      }
    } finally {
      loading = false;
    }
  }

  // Prepare only when the video is nearby or the visitor interacts with it.
  video.addEventListener('play', prepareVideo);
  video.addEventListener('pointerdown', prepareVideo);
  video.addEventListener('focus', prepareVideo);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      prepareVideo();
    }, { rootMargin: '400px' });
    observer.observe(video);
  }

  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    controller.abort();
    if (objectURL) URL.revokeObjectURL(objectURL);
  });
});
