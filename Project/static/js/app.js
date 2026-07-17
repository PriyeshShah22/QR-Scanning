let sessionUser = null;
let activeRecord = null;
let scannerRunning = false;
let currentPreviewUrl = null;
let videoElement = null;
let canvasElement = null;
let scanInterval = null;

const $ = (id) => document.getElementById(id);

function setError(msg = '') {
  const el = $('formError');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resetForm() {
  $('transactionForm').reset();
  $('qrText').value = '';
  $('qrLabel').value = '';
  $('imageUpload').value = '';
  setError('');
  clearPreview();
}

function clearPreview() {
  const img = $('imagePreview');
  const placeholder = $('previewPlaceholder');
  img.src = '';
  img.style.display = 'none';
  placeholder.style.display = 'block';

  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }
}

function showCard() {
  $('transactionCard').classList.remove('hidden');
  $('historyPlaceholder').classList.add('hidden');
  $('recordsTableCard').classList.add('hidden');
}

async function showDefaultPanel() {
  $('transactionCard').classList.add('hidden');
  $('recordsTableCard').classList.add('hidden');
  $('panelTitle').textContent = 'Records Directory';
  stopScanner();

  if (!sessionUser) {
    $('historyPlaceholder').classList.add('hidden');
    return;
  }

  try {
    const records = await fetchTransactions();
    if (records.length) {
      await showRecordsTable(records);
    } else {
      $('historyPlaceholder').classList.remove('hidden');
    }
  } catch (_error) {
    $('historyPlaceholder').classList.remove('hidden');
  }
}

function showFormState(mode) {
  showCard();
  $('transactionForm').classList.remove('hidden');
  $('transactionView').classList.add('hidden');

  if (mode === 'new') {
    $('panelTitle').textContent = 'New Transaction Entry';
    $('submitActionBtn').textContent = 'Save Entry';
    activeRecord = null;
    resetForm();
    startScanner();
    return;
  }

  if (mode === 'edit' && activeRecord) {
    $('panelTitle').textContent = 'Edit Transaction Entry';
    $('submitActionBtn').textContent = 'Update Entry';
    $('qrLabel').value = activeRecord.qr_label || '';
    $('qrText').value = activeRecord.qr_text || '';
    setError('');
    clearPreview();

    if (activeRecord.image_url) {
      const img = $('imagePreview');
      img.src = activeRecord.image_url;
      img.style.display = 'block';
      $('previewPlaceholder').style.display = 'none';
    }

    startScanner();
  }
}

function renderReadOnlyView() {
  $('panelTitle').textContent = 'Live Verification View';
  $('transactionForm').classList.add('hidden');
  $('transactionView').classList.remove('hidden');
  $('historyPlaceholder').classList.add('hidden');
  $('recordsTableCard').classList.add('hidden');

  $('viewLabel').textContent = activeRecord?.qr_label || '--';
  $('viewText').textContent = activeRecord?.qr_text || '--';

  const viewImage = $('viewImage');
  if (activeRecord?.image_url) {
    viewImage.innerHTML = `
      <a class="table-thumb-link" href="${activeRecord.image_url}" target="_blank" rel="noopener noreferrer">
        <img class="table-thumb" src="${activeRecord.image_url}" alt="${escapeHtml(activeRecord.qr_label || 'Transaction image')}" />
      </a>
    `;
  } else {
    viewImage.textContent = 'No Image';
  }

  stopScanner();
}

async function startScanner() {
  if (scannerRunning) return;
  if (typeof jsQR === 'undefined') {
    $('scannerStatus').textContent = 'QR library not loaded.';
    return;
  }

  stopScanner(); // ensure clean state

  const readerDiv = $('reader');
  readerDiv.innerHTML = '';
  $('scannerStatus').textContent = 'Requesting camera...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    videoElement = document.createElement('video');
    videoElement.srcObject = stream;
    videoElement.setAttribute('playsinline', 'true');
    videoElement.style.width = '100%';
    videoElement.style.maxWidth = '320px';
    videoElement.style.display = 'block';
    videoElement.setAttribute('autoplay', 'true');

    canvasElement = document.createElement('canvas');
    // size will be set once video metadata loads

    readerDiv.appendChild(videoElement);

    await new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        resolve();
      };
      videoElement.play();
    });

    scannerRunning = true;
    $('scannerStatus').textContent = 'Scanning... (point camera at QR)';

    const ctx = canvasElement.getContext('2d');

    const scanFrame = () => {
      if (!scannerRunning || !videoElement || videoElement.paused || videoElement.ended) {
        return;
      }

      ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
      const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        const decodedText = code.data || '';
        if (decodedText) {
          $('qrText').value = decodedText;
          if (!$('qrLabel').value) {
            $('qrLabel').value = 'Scanned Item Receipt';
          }
          stopScanner();
          return;
        }
      }

      scanInterval = requestAnimationFrame(scanFrame);
    };

    scanFrame();
  } catch (err) {
    console.error(err);
    $('scannerStatus').textContent = 'Camera access denied or unavailable. You can still upload an image manually.';
  }
}

function stopScanner() {
  scannerRunning = false;

  if (scanInterval) {
    cancelAnimationFrame(scanInterval);
    scanInterval = null;
  }

  if (videoElement && videoElement.srcObject) {
    const tracks = videoElement.srcObject.getTracks();
    tracks.forEach((t) => t.stop());
    videoElement.srcObject = null;
  }

  if (videoElement) {
    videoElement.remove();
    videoElement = null;
  }

  if (canvasElement) {
    canvasElement = null;
  }

  const readerDiv = $('reader');
  if (readerDiv) {
    readerDiv.innerHTML = '';
  }

  const statusEl = $('scannerStatus');
  if (statusEl) {
    statusEl.textContent = '';
  }
}

function updateSessionDisplay() {
  $('displayMobile').textContent = 'Mobile Session: ' + (sessionUser?.mobile_no || '--');
  $('displayUID').textContent = 'System Authorization ID: ' + (sessionUser?.user_id || '--');
}

function showAuthenticatedApp() {
  updateSessionDisplay();
  $('loginPage').classList.add('hidden');
  $('transactionPage').classList.remove('hidden');
}

function showLoginScreen() {
  sessionUser = null;
  activeRecord = null;
  $('authForm').reset();
  resetForm();
  stopScanner();
  $('transactionCard').classList.add('hidden');
  $('recordsTableCard').classList.add('hidden');
  $('historyPlaceholder').classList.add('hidden');
  $('transactionPage').classList.add('hidden');
  $('loginPage').classList.remove('hidden');
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
  });

  const payload = await response.json().catch(() => ({ success: false, message: 'Invalid server response.' }));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload;
}

async function fetchTransactions() {
  const payload = await fetchJson('/api/transactions');
  return payload.transactions || [];
}

async function handleAuth(e) {
  e.preventDefault();
  const mobile = $('mobileNo').value.trim();
  const password = $('password').value;

  try {
    const payload = await fetchJson('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobileNo: mobile, password }),
    });

    sessionUser = payload.user;
    showAuthenticatedApp();
    await showDefaultPanel();
  } catch (error) {
    alert(error.message);
  }
}

async function handleLogout() {
  try {
    await fetchJson('/api/logout', { method: 'POST' });
  } catch (_error) {
    // Even if the server session has already expired, move back to login state.
  }
  showLoginScreen();
}

async function executeSaveOrUpdate() {
  const label = $('qrLabel').value.trim();
  const text = $('qrText').value.trim();
  const file = $('imageUpload').files[0];

  if (!text) {
    setError('Please scan or enter a QR payload before saving.');
    return;
  }

  if (!sessionUser) {
    setError('Please login first.');
    return;
  }

  if (file && !file.type.startsWith('image/')) {
    setError('Please select a valid image file.');
    return;
  }

  if (file && file.size > 2 * 1024 * 1024) {
    setError('Image must be less than 2 MB.');
    return;
  }

  const formData = new FormData();
  formData.append('qr_label', label);
  formData.append('qr_text', text);
  if (file) {
    formData.append('image', file);
  }

  try {
    const isEdit = Boolean(activeRecord?.transaction_id);
    const payload = await fetchJson(
      isEdit ? `/api/transactions/${activeRecord.transaction_id}` : '/api/transactions',
      {
        method: isEdit ? 'PUT' : 'POST',
        body: formData,
      }
    );

    activeRecord = payload.transaction;
    clearPreview();
    $('imageUpload').value = '';
    await showRecordsTable();
  } catch (error) {
    setError(error.message);
  }
}

async function executeDelete() {
  if (!activeRecord) return;
  if (!confirm('Delete this record?')) return;

  try {
    await fetchJson(`/api/transactions/${activeRecord.transaction_id}`, {
      method: 'DELETE',
    });
    activeRecord = null;
    await showRecordsTable();
  } catch (error) {
    alert(error.message);
  }
}

function buildImageCell(record) {
  if (!record.image_url) {
    return '<span class="no-image">No Image</span>';
  }

  return `
    <a class="table-thumb-link" href="${record.image_url}" target="_blank" rel="noopener noreferrer">
      <img class="table-thumb" src="${record.image_url}" alt="${escapeHtml(record.qr_label || 'Transaction image')}" />
    </a>
  `;
}

async function showRecordsTable(prefetchedRecords = null) {
  try {
    const records = prefetchedRecords || await fetchTransactions();

    $('recordsTableCard').classList.remove('hidden');
    $('transactionCard').classList.add('hidden');
    $('historyPlaceholder').classList.add('hidden');
    $('panelTitle').textContent = 'Records Directory';
    stopScanner();

    const tbody = $('recordsTableBody');
    tbody.innerHTML = '';

    if (!records.length) {
      $('historyPlaceholder').classList.remove('hidden');
      $('recordsTableCard').classList.add('hidden');
      return;
    }

    records.forEach((record) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(record.qr_label || '--')}</td>
        <td style="word-break: break-all; font-family: monospace;">${escapeHtml(record.qr_text || '--')}</td>
        <td>${buildImageCell(record)}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="btn btn-primary" data-action="edit" title="Edit">✏️</button>
            <button type="button" class="btn btn-danger" data-action="delete" title="Delete">🗑️</button>
          </div>
        </td>
      `;

      tr.querySelector('[data-action="edit"]').addEventListener('click', () => {
        activeRecord = record;
        showFormState('edit');
      });

      tr.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        activeRecord = record;
        await executeDelete();
      });

      tbody.appendChild(tr);
    });
  } catch (error) {
    alert(error.message);
  }
}

$('authForm').addEventListener('submit', handleAuth);
$('logoutBtn').addEventListener('click', handleLogout);
$('addNewBtn').addEventListener('click', () => showFormState('new'));
$('viewRecordsBtn').addEventListener('click', () => showRecordsTable());
$('cancelBtn').addEventListener('click', () => showDefaultPanel());
$('submitActionBtn').addEventListener('click', executeSaveOrUpdate);
$('editBtn').addEventListener('click', () => showFormState('edit'));
$('deleteBtn').addEventListener('click', executeDelete);
$('dismissBtn').addEventListener('click', () => showDefaultPanel());

$('imageUpload').addEventListener('change', function () {
  const file = this.files[0];
  const img = $('imagePreview');
  const placeholder = $('previewPlaceholder');

  clearPreview();
  setError('');

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    setError('Please select a valid image file.');
    this.value = '';
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    setError('Image must be less than 2 MB.');
    this.value = '';
    return;
  }

  currentPreviewUrl = URL.createObjectURL(file);
  img.src = currentPreviewUrl;
  img.style.display = 'block';
  placeholder.style.display = 'none';
});

window.addEventListener('load', async () => {
  try {
    const payload = await fetchJson('/api/session');
    if (payload.authenticated) {
      sessionUser = payload.user;
      showAuthenticatedApp();
      await showDefaultPanel();
    } else {
      showLoginScreen();
    }
  } catch (_error) {
    showLoginScreen();
  }
});