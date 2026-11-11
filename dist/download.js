/* Assemble the unchanged source ZIP from small, same-origin static files. */
(() => {
  'use strict';
  const button = document.querySelector('#download-button');
  const status = document.querySelector('#download-status');
  const progress = document.querySelector('#download-progress');
  const error = document.querySelector('#download-error');
  const saveLink = document.querySelector('#download-save');
  const manifestURL = new URL('downloads/source-manifest.json', document.baseURI);
  let downloadURL;

  const megabytes = bytes => `${(bytes / 1000000).toFixed(1)} MB`;
  const digest = async bytes => {
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  };
  const fetchFile = async url => {
    const response = await fetch(url, {credentials:'same-origin', cache:'no-store'});
    if (!response.ok) throw new Error(`Download request failed (${response.status}).`);
    return response;
  };

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Preparing…';
    error.hidden = true;
    saveLink.hidden = true;
    progress.hidden = true;
    progress.value = 0;
    status.textContent = 'Preparing your complete portfolio…';
    if (downloadURL) URL.revokeObjectURL(downloadURL);
    downloadURL = undefined;

    try {
      if (location.protocol === 'file:') throw new Error('Open this page from the private preview link to download the ZIP.');
      if (!globalThis.crypto?.subtle) throw new Error('Please open the secure preview link in a current browser.');
      const manifest = await (await fetchFile(manifestURL)).json();
      const validHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
      if (!Number.isSafeInteger(manifest.size) || manifest.size <= 0 || !validHash(manifest.sha256) || !Array.isArray(manifest.chunks) || !manifest.chunks.length) {
        throw new Error('The download information is incomplete. Please try again.');
      }
      if (!manifest.chunks.every(chunk => /^[a-zA-Z0-9._-]+\.bin$/.test(chunk.file) && Number.isSafeInteger(chunk.size) && chunk.size > 0 && chunk.size < 25 * 1024 * 1024 && validHash(chunk.sha256)) || manifest.chunks.reduce((sum, chunk) => sum + chunk.size, 0) !== manifest.size) {
        throw new Error('The download information could not be verified. Please try again.');
      }

      const parts = [];
      let received = 0;
      progress.max = manifest.size;
      progress.hidden = false;
      button.textContent = 'Downloading…';
      for (let index = 0; index < manifest.chunks.length; index++) {
        const chunk = manifest.chunks[index];
        status.textContent = `Downloading part ${index + 1} of ${manifest.chunks.length} · ${megabytes(received)} of ${megabytes(manifest.size)}`;
        const bytes = await (await fetchFile(new URL(chunk.file, manifestURL))).arrayBuffer();
        if (bytes.byteLength !== chunk.size || await digest(bytes) !== chunk.sha256) {
          throw new Error('A download part was incomplete. Please try again.');
        }
        parts.push(bytes);
        received += bytes.byteLength;
        progress.value = received;
      }

      status.textContent = 'Checking your complete ZIP…';
      const zip = new Blob(parts, {type:'application/zip'});
      if (zip.size !== manifest.size || await digest(await zip.arrayBuffer()) !== manifest.sha256) {
        throw new Error('The ZIP could not be verified. Please try again.');
      }
      downloadURL = URL.createObjectURL(zip);
      saveLink.href = downloadURL;
      saveLink.hidden = false;
      status.textContent = `Ready · ${megabytes(zip.size)}. Your browser will save Jessie-Portfolio.zip. If it does not start, select “Save ZIP again”.`;
      saveLink.click();
      button.textContent = 'Download again';
    } catch (problem) {
      progress.hidden = true;
      status.textContent = 'The download did not finish.';
      error.textContent = problem instanceof TypeError ? 'Check your internet connection, then select “Retry download”.' : (problem.message || 'Please select “Retry download” to try again.');
      error.hidden = false;
      button.textContent = 'Retry download';
    } finally {
      button.disabled = false;
    }
  });
})();
