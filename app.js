/**
 * Mabl Synthetic Test Data Generator
 * app.js — core application logic
 *
 * Workflow:
 *   Step 1 → Input & Schema Extraction
 *   Step 2 → Combination Calculation & Limit Selection
 *   Step 3 → CSV Generation & Download
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_ROWS_HARD_LIMIT = 1_000_000;   // absolute browser safety ceiling
const CHUNK_SIZE = 20_000;               // rows processed per async tick

// ─── State ────────────────────────────────────────────────────────────────────
let confirmedSchema = null;   // [{name, values[]}]
let generationAborted = false;

// ─── DOM references ───────────────────────────────────────────────────────────
const fieldsContainer   = document.getElementById('fields-container');
const addFieldBtn       = document.getElementById('add-field-btn');
const analyzeBtn        = document.getElementById('analyze-btn');

const step2Section      = document.getElementById('step2-section');
const schemaTableBody   = document.getElementById('schema-table-body');
const editSchemaBtn     = document.getElementById('edit-schema-btn');
const confirmSchemaBtn  = document.getElementById('confirm-schema-btn');

const step3Section      = document.getElementById('step3-section');
const comboNumber       = document.getElementById('combo-number');
const comboFormula      = document.getElementById('combo-formula');
const comboWarning      = document.getElementById('combo-warning');
const optionAll         = document.getElementById('option-all');
const optionCap         = document.getElementById('option-cap');
const capInputGroup     = document.getElementById('cap-input-group');
const capInput          = document.getElementById('cap-input');
const generateBtn       = document.getElementById('generate-btn');

const step4Section      = document.getElementById('step4-section');
const progressStatus    = document.getElementById('progress-status');
const progressBar       = document.getElementById('progress-bar');
const downloadSection   = document.getElementById('download-section');
const downloadLink      = document.getElementById('download-link');
const dlRowCount        = document.getElementById('dl-row-count');
const dlFileSize        = document.getElementById('dl-file-size');
const restartBtn        = document.getElementById('restart-btn');

// ─── Step progress bar references ────────────────────────────────────────────
const stepItems = document.querySelectorAll('.step-item');

// ═════════════════════════════════════════════════════════════════════════════
// Step management
// ═════════════════════════════════════════════════════════════════════════════

function setActiveStep(n) {
  stepItems.forEach((el, i) => {
    el.classList.remove('active', 'completed');
    const idx = i + 1;
    if (idx < n)  el.classList.add('completed');
    if (idx === n) el.classList.add('active');
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 1 — Field input
// ═════════════════════════════════════════════════════════════════════════════

let fieldCounter = 0;

function createFieldRow(fieldName = '', fieldValues = '') {
  fieldCounter++;
  const id = fieldCounter;

  const row = document.createElement('div');
  row.className = 'field-row';
  row.dataset.id = id;

  row.innerHTML = `
    <div class="input-group">
      <label for="fname-${id}">Field Name</label>
      <input type="text" id="fname-${id}" class="field-name" placeholder="e.g. Browser" value="${escapeAttr(fieldName)}">
    </div>
    <div class="input-group">
      <label for="fvals-${id}">Possible Values <span class="text-muted text-sm">(comma-separated)</span></label>
      <input type="text" id="fvals-${id}" class="field-values" placeholder="e.g. Chrome, Firefox, Safari">
    </div>
    <button class="btn btn-danger remove-btn" title="Remove field" aria-label="Remove field">✕</button>
  `;

  // Pre-fill values text (needs separate assignment to avoid HTML injection)
  row.querySelector('.field-values').value = fieldValues;

  row.querySelector('.remove-btn').addEventListener('click', () => {
    if (fieldsContainer.querySelectorAll('.field-row').length > 1) {
      row.remove();
    } else {
      showInlineError('At least one field is required.');
    }
  });

  return row;
}

function addField(name = '', values = '') {
  fieldsContainer.appendChild(createFieldRow(name, values));
}

// Seed with two blank rows on first load
addField();
addField();

addFieldBtn.addEventListener('click', () => addField());

// ─── Analyze Schema ───────────────────────────────────────────────────────────

analyzeBtn.addEventListener('click', () => {
  clearInlineError();

  const rows = fieldsContainer.querySelectorAll('.field-row');
  const schema = [];

  for (const row of rows) {
    const name   = row.querySelector('.field-name').value.trim();
    const rawVals = row.querySelector('.field-values').value;

    if (!name) {
      showInlineError('Every field must have a name. Please fill in all Field Name boxes.');
      row.querySelector('.field-name').focus();
      return;
    }

    const values = parseValues(rawVals);
    if (values.length === 0) {
      showInlineError(`Field "${name}" has no values. Please provide at least one value.`);
      row.querySelector('.field-values').focus();
      return;
    }

    // Check for duplicate field names
    if (schema.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      showInlineError(`Duplicate field name: "${name}". Each field must have a unique name.`);
      row.querySelector('.field-name').focus();
      return;
    }

    schema.push({ name, values });
  }

  renderSchemaTable(schema);
  step2Section.classList.remove('hidden');
  step2Section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setActiveStep(2);
});

// ─── Parse comma-separated values (trims, removes empty, deduplicates) ────────

function parseValues(raw) {
  return [...new Set(
    raw.split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0)
  )];
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 2 — Schema confirmation
// ═════════════════════════════════════════════════════════════════════════════

function renderSchemaTable(schema) {
  schemaTableBody.innerHTML = '';

  schema.forEach(field => {
    const tr = document.createElement('tr');
    const tagsHtml = field.values
      .map(v => `<span class="value-tag">${escapeHtml(v)}</span>`)
      .join('');

    tr.innerHTML = `
      <td><strong>${escapeHtml(field.name)}</strong></td>
      <td>${field.values.length}</td>
      <td><div class="value-tags">${tagsHtml}</div></td>
    `;
    schemaTableBody.appendChild(tr);
  });
}

// Edit schema — go back to step 1
editSchemaBtn.addEventListener('click', () => {
  step2Section.classList.add('hidden');
  step3Section.classList.add('hidden');
  step4Section.classList.add('hidden');
  setActiveStep(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Confirm schema — proceed to combination calculation
confirmSchemaBtn.addEventListener('click', () => {
  // Re-parse the current field rows (they may not have changed, but this
  // keeps confirmedSchema in sync with what is displayed)
  const rows = fieldsContainer.querySelectorAll('.field-row');
  const schema = [];

  for (const row of rows) {
    const name   = row.querySelector('.field-name').value.trim();
    const rawVals = row.querySelector('.field-values').value;
    const values = parseValues(rawVals);
    schema.push({ name, values });
  }

  confirmedSchema = schema;
  renderCombinationInfo(schema);

  step3Section.classList.remove('hidden');
  step4Section.classList.add('hidden');
  downloadSection.classList.add('hidden');
  step3Section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setActiveStep(3);
});

// ═════════════════════════════════════════════════════════════════════════════
// Step 3 — Combination count & limit selection
// ═════════════════════════════════════════════════════════════════════════════

function renderCombinationInfo(schema) {
  const counts  = schema.map(f => f.values.length);
  const total   = counts.reduce((a, b) => a * b, 1);
  const formula = counts.join(' × ') + ' = ' + total.toLocaleString();

  comboNumber.textContent = total.toLocaleString();
  comboFormula.textContent = formula;

  // Update "Generate ALL" label
  optionAll.parentElement.querySelector('.option-label').textContent =
    `Option A — Generate ALL ${total.toLocaleString()} combinations`;

  // Warn when total exceeds hard limit
  if (total > MAX_ROWS_HARD_LIMIT) {
    comboWarning.classList.remove('hidden');
    comboWarning.textContent =
      `⚠ The total (${total.toLocaleString()}) exceeds the ${MAX_ROWS_HARD_LIMIT.toLocaleString()}-row browser limit. ` +
      `You must use Option B and cap the output at or below ${MAX_ROWS_HARD_LIMIT.toLocaleString()} rows.`;
    optionAll.disabled = true;
    optionCap.checked = true;
    selectLimitOption('cap');
  } else {
    comboWarning.classList.add('hidden');
    optionAll.disabled = false;
    // Default to "all"
    optionAll.checked = true;
    selectLimitOption('all');
  }
}

function selectLimitOption(type) {
  document.querySelectorAll('.limit-option').forEach(el => el.classList.remove('selected'));
  if (type === 'all') {
    optionAll.closest('.limit-option').classList.add('selected');
    capInputGroup.classList.add('hidden');
  } else {
    optionCap.closest('.limit-option').classList.add('selected');
    capInputGroup.classList.remove('hidden');
  }
}

optionAll.addEventListener('change', () => selectLimitOption('all'));
optionCap.addEventListener('change', () => selectLimitOption('cap'));

// ─── Generate ─────────────────────────────────────────────────────────────────

generateBtn.addEventListener('click', async () => {
  clearStep4();

  // Determine row limit
  let limit;
  if (optionAll.checked) {
    const total = confirmedSchema.map(f => f.values.length).reduce((a, b) => a * b, 1);
    limit = total;
  } else {
    const raw = parseInt(capInput.value, 10);
    if (!raw || raw < 1) {
      capInput.focus();
      showInlineError3('Please enter a valid number of rows (≥ 1).');
      return;
    }
    if (raw > MAX_ROWS_HARD_LIMIT) {
      showInlineError3(`Cap cannot exceed the ${MAX_ROWS_HARD_LIMIT.toLocaleString()}-row browser limit.`);
      return;
    }
    limit = raw;
  }

  step4Section.classList.remove('hidden');
  step4Section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setActiveStep(4);
  generateBtn.disabled = true;
  generationAborted = false;

  try {
    await runGeneration(confirmedSchema, limit);
  } finally {
    generateBtn.disabled = false;
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Step 4 — Chunked generation & CSV compilation
// ═════════════════════════════════════════════════════════════════════════════

async function runGeneration(schema, limit) {
  const headers = schema.map(f => f.name);
  const valueSets = schema.map(f => f.values);

  setProgress('Status: Initialising generator...', 0);
  await tick();

  // ── Collect rows in chunks ────────────────────────────────────────────────
  const csvParts = [csvEscape(headers).join(',') + '\r\n'];
  let rowCount = 0;

  for await (const row of cartesianGenerator(valueSets)) {
    if (generationAborted) {
      setProgress('Status: Aborted.', 0);
      return;
    }

    csvParts.push(csvEscape(row).join(',') + '\r\n');
    rowCount++;

    if (rowCount >= limit) break;

    // Yield to UI every CHUNK_SIZE rows
    if (rowCount % CHUNK_SIZE === 0) {
      const pct = Math.round((rowCount / limit) * 100);
      setProgress(`Status: Compiling rows... [${rowCount.toLocaleString()} / ${limit.toLocaleString()} rows compiled]`, pct);
      await tick();
    }
  }

  setProgress(`Status: Finalising file... [100% complete]`, 100);
  await tick();

  // ── Build blob & download link ────────────────────────────────────────────
  const csvContent = csvParts.join('');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename  = `test-data-${timestamp}.csv`;

  downloadLink.href = url;
  downloadLink.download = filename;
  downloadLink.textContent = `⬇ Download ${filename}`;

  dlRowCount.textContent = `${rowCount.toLocaleString()} rows  ·  ${headers.length} columns`;
  dlFileSize.textContent = `File size: ${formatBytes(blob.size)}`;

  downloadSection.classList.remove('hidden');

  // Auto-trigger download
  downloadLink.click();
}

// ─── Cartesian-product generator (lazy, memory-efficient) ─────────────────────

async function* cartesianGenerator(arrays) {
  if (arrays.length === 0) return;

  // Use iterative index-increment approach — no recursion, no storing all rows
  const lengths = arrays.map(a => a.length);
  const indices = new Array(arrays.length).fill(0);

  while (true) {
    yield indices.map((idx, col) => arrays[col][idx]);

    // Increment indices right-to-left (like an odometer)
    let col = arrays.length - 1;
    while (col >= 0) {
      indices[col]++;
      if (indices[col] < lengths[col]) break;
      indices[col] = 0;
      col--;
    }
    if (col < 0) break;  // All combinations exhausted
  }
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

function setProgress(message, pct) {
  progressStatus.textContent = message;
  progressBar.style.width = `${pct}%`;
}

function clearStep4() {
  setProgress('Status: Initialising...', 0);
  downloadSection.classList.add('hidden');
  clearInlineError3();
}

// ─── Restart ──────────────────────────────────────────────────────────────────

restartBtn.addEventListener('click', () => {
  generationAborted = true;
  confirmedSchema = null;

  // Clear fields back to 2 blank rows
  fieldsContainer.innerHTML = '';
  fieldCounter = 0;
  addField();
  addField();

  step2Section.classList.add('hidden');
  step3Section.classList.add('hidden');
  step4Section.classList.add('hidden');
  clearInlineError();
  clearInlineError3();
  setActiveStep(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ═════════════════════════════════════════════════════════════════════════════
// CSV utilities
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Escape an array of cell values for CSV (RFC 4180).
 * Wraps values containing comma, double-quote, or newline in double-quotes.
 */
function csvEscape(cells) {
  return cells.map(cell => {
    const s = String(cell);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Inline error helpers
// ═════════════════════════════════════════════════════════════════════════════

const inlineError1 = document.getElementById('inline-error-1');
const inlineError3 = document.getElementById('inline-error-3');

function showInlineError(msg)  { inlineError1.textContent = msg; inlineError1.classList.remove('hidden'); }
function clearInlineError()    { inlineError1.textContent = '';  inlineError1.classList.add('hidden'); }
function showInlineError3(msg) { inlineError3.textContent = msg; inlineError3.classList.remove('hidden'); }
function clearInlineError3()   { inlineError3.textContent = '';  inlineError3.classList.add('hidden'); }

// ═════════════════════════════════════════════════════════════════════════════
// Misc utilities
// ═════════════════════════════════════════════════════════════════════════════

/** Yield control to the browser for one event-loop tick. */
function tick() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function formatBytes(bytes) {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
