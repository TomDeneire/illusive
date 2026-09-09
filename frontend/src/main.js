import './style.css';
import './app.css';

import {
    ListAdjectives,
    CreateAdjective,
    UpdateAdjective,
    DeleteAdjective,
    LoadUIConfig,
    SaveUIConfig,
} from '../wailsjs/go/main/App';

const FIELDS = [
    { key: 'root', label: 'Root' },
    { key: 'adjective', label: 'Adjective' },
    { key: 'derivedAdverb', label: 'Derived adverb' },
    { key: 'translationLiteral', label: 'Translation (literally)' },
    { key: 'translationFigurative', label: 'Translation (figuratively)' },
    { key: 'exampleLiteral', label: 'Example (literally)' },
    { key: 'exampleFigurative', label: 'Example (figuratively)' },
];

// Default column widths, as a percentage of the table width, used for any
// column without a saved width yet.
const DEFAULT_WIDTH_PCT = {
    root: 6,
    adjective: 9,
    derivedAdverb: 8,
    translationLiteral: 17,
    translationFigurative: 17,
    exampleLiteral: 17,
    exampleFigurative: 17,
    actions: 9,
};
const MIN_COLUMN_WIDTH = 60;

let editingId = null;
let allEntries = [];
const filters = Object.fromEntries(FIELDS.map(f => [f.key, '']));
let sortKey = 'adjective';
let sortDir = 'asc';
const colWidths = {};
// Columns hidden by default until the user opts in via the Columns menu.
const DEFAULT_HIDDEN_COLUMNS = ['root', 'derivedAdverb'];
const visibleColumns = Object.fromEntries(FIELDS.map(f => [f.key, !DEFAULT_HIDDEN_COLUMNS.includes(f.key)]));

function visibleFields() {
    return FIELDS.filter(f => visibleColumns[f.key]);
}

document.querySelector('#app').innerHTML = `
    <h1>Elusive Adjectives</h1>
    <div class="toolbar">
        <div class="columns-menu">
            <button type="button" class="secondary" id="columns-btn">Columns ▾</button>
            <div class="columns-panel" id="columns-panel" hidden>
                ${FIELDS.map(f => `
                    <label class="columns-panel-item">
                        <input type="checkbox" data-key="${f.key}" checked />
                        ${f.label}
                    </label>
                `).join('')}
            </div>
        </div>
        <button id="add-btn">+ Add adjective</button>
    </div>
    <div class="table-wrap">
        <div id="table-container"></div>
    </div>
    <dialog id="dialog">
        <h2 id="dialog-title">Add adjective</h2>
        <form id="form">
            ${FIELDS.map(f => `
                <div class="field">
                    <label for="f-${f.key}">${f.label}</label>
                    <input id="f-${f.key}" name="${f.key}" type="text" autocomplete="off" />
                </div>
            `).join('')}
            <div class="dialog-actions">
                <button type="button" class="secondary" id="cancel-btn">Cancel</button>
                <button type="submit">Save</button>
            </div>
        </form>
    </dialog>
`;

const tableContainerEl = document.getElementById('table-container');
const tableWrapEl = document.querySelector('.table-wrap');
const dialogEl = document.getElementById('dialog');
const dialogTitleEl = document.getElementById('dialog-title');
const formEl = document.getElementById('form');
const columnsBtn = document.getElementById('columns-btn');
const columnsPanel = document.getElementById('columns-panel');

let rowsEl;
let tableEl;
let colEls;

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

function saveUIConfig() {
    SaveUIConfig({ columnWidths: colWidths, visibleColumns }).catch(err => {
        console.error('Failed to save UI config:', err);
    });
}

function applyColumnWidths() {
    const columnKeys = [...visibleFields().map(f => f.key), 'actions'];
    let total = 0;
    for (const key of columnKeys) {
        colEls[key].style.width = `${colWidths[key]}px`;
        total += colWidths[key];
    }
    tableEl.style.width = `${total}px`;
}

function ensureColumnWidth(key) {
    if (colWidths[key] != null) return;
    const wrapWidth = tableWrapEl.clientWidth;
    colWidths[key] = Math.max(
        MIN_COLUMN_WIDTH,
        Math.round((DEFAULT_WIDTH_PCT[key] / 100) * wrapWidth)
    );
}

function initResizers() {
    tableEl.querySelectorAll('.resizer').forEach(handle => {
        const key = handle.dataset.key;
        handle.addEventListener('click', (e) => e.stopPropagation());
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const startX = e.clientX;
            const startWidth = colWidths[key];

            function onMouseMove(moveEvent) {
                colWidths[key] = Math.max(MIN_COLUMN_WIDTH, startWidth + (moveEvent.clientX - startX));
                applyColumnWidths();
            }
            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                saveUIConfig();
            }
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

function updateSortIndicators() {
    for (const c of visibleFields()) {
        const el = document.getElementById(`sort-${c.key}`);
        if (el) el.textContent = c.key === sortKey ? (sortDir === 'asc' ? '▲' : '▼') : '';
    }
}

function visibleEntries() {
    const columns = visibleFields();
    let entries = allEntries.filter(e =>
        columns.every(c => {
            const needle = filters[c.key].trim().toLowerCase();
            if (!needle) return true;
            return (e[c.key] ?? '').toLowerCase().includes(needle);
        })
    );
    entries = entries.slice().sort((a, b) => {
        const cmp = (a[sortKey] ?? '').localeCompare(b[sortKey] ?? '', undefined, { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
    });
    return entries;
}

// Rebuilds the whole table (columns, headers, resizers) — needed because
// the set of visible columns can change at runtime.
function buildTable() {
    const columns = visibleFields();
    const columnKeys = [...columns.map(c => c.key), 'actions'];
    columnKeys.forEach(ensureColumnWidth);

    tableContainerEl.innerHTML = `
        <table>
            <colgroup>
                ${columnKeys.map(key => `<col data-key="${key}" />`).join('')}
            </colgroup>
            <thead>
                <tr>
                    ${columns.map(c => `
                        <th class="sortable" data-key="${c.key}">
                            <span class="th-label">${c.label}</span>
                            <span class="sort-indicator" id="sort-${c.key}"></span>
                            <span class="resizer" data-key="${c.key}"></span>
                        </th>
                    `).join('')}
                    <th class="col-actions">
                        <span class="resizer" data-key="actions"></span>
                    </th>
                </tr>
                <tr class="filter-row">
                    ${columns.map(c => `
                        <th>
                            <input type="text" class="filter-input" data-key="${c.key}" placeholder="Filter..." autocomplete="off" />
                        </th>
                    `).join('')}
                    <th class="col-actions"></th>
                </tr>
            </thead>
            <tbody id="rows"></tbody>
        </table>
    `;

    tableEl = tableContainerEl.querySelector('table');
    rowsEl = document.getElementById('rows');
    colEls = Object.fromEntries(
        columnKeys.map(key => [key, tableEl.querySelector(`col[data-key="${key}"]`)])
    );

    tableEl.querySelectorAll('.filter-input').forEach(input => {
        input.value = filters[input.dataset.key];
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('input', () => {
            filters[input.dataset.key] = input.value;
            render();
        });
    });

    tableEl.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.key;
            if (sortKey === key) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortKey = key;
                sortDir = 'asc';
            }
            render();
        });
    });

    applyColumnWidths();
    initResizers();
    render();
}

function render() {
    updateSortIndicators();
    const columns = visibleFields();
    const entries = visibleEntries();

    if (entries.length === 0) {
        rowsEl.innerHTML = `<tr><td colspan="${columns.length + 1}" class="empty">No adjectives found.</td></tr>`;
        return;
    }
    rowsEl.innerHTML = entries.map(e => `
        <tr data-id="${e.id}">
            ${columns.map(c => `<td>${escapeHtml(e[c.key])}</td>`).join('')}
            <td class="actions">
                <button class="secondary edit-btn">Edit</button>
                <button class="danger delete-btn">Delete</button>
            </td>
        </tr>
    `).join('');

    rowsEl.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = Number(btn.closest('tr').dataset.id);
            const entry = entries.find(e => e.id === id);
            openDialog(entry);
        });
    });
    rowsEl.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = Number(btn.closest('tr').dataset.id);
            const entry = entries.find(e => e.id === id);
            if (!confirm(`Delete "${entry.adjective}"?`)) return;
            try {
                await DeleteAdjective(id);
                await refresh();
            } catch (err) {
                alert(`Failed to delete: ${err}`);
            }
        });
    });
}

async function refresh() {
    try {
        allEntries = await ListAdjectives();
        render();
    } catch (err) {
        rowsEl.innerHTML = `<tr><td colspan="${visibleFields().length + 1}" class="empty">Failed to load: ${escapeHtml(String(err))}</td></tr>`;
    }
}

function openDialog(entry) {
    editingId = entry ? entry.id : null;
    dialogTitleEl.textContent = entry ? `Edit "${entry.adjective}"` : 'Add adjective';
    for (const f of FIELDS) {
        formEl.elements[f.key].value = entry ? (entry[f.key] ?? '') : '';
    }
    dialogEl.showModal();
    formEl.elements['adjective'].focus();
}

document.getElementById('add-btn').addEventListener('click', () => openDialog(null));
document.getElementById('cancel-btn').addEventListener('click', () => dialogEl.close());

columnsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    columnsPanel.hidden = !columnsPanel.hidden;
});
document.addEventListener('click', (e) => {
    if (!columnsPanel.hidden && !columnsPanel.contains(e.target) && e.target !== columnsBtn) {
        columnsPanel.hidden = true;
    }
});
columnsPanel.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        visibleColumns[checkbox.dataset.key] = checkbox.checked;
        buildTable();
        saveUIConfig();
    });
});

formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const entry = { id: editingId ?? 0 };
    for (const f of FIELDS) {
        entry[f.key] = formEl.elements[f.key].value.trim();
    }
    if (!entry.adjective) {
        alert('Adjective is required.');
        return;
    }
    try {
        if (editingId) {
            await UpdateAdjective(entry);
        } else {
            await CreateAdjective(entry);
        }
        dialogEl.close();
        await refresh();
    } catch (err) {
        alert(`Failed to save: ${err}`);
    }
});

async function init() {
    let cfg = {};
    try {
        cfg = await LoadUIConfig();
    } catch (err) {
        console.error('Failed to load UI config:', err);
    }
    Object.assign(colWidths, cfg.columnWidths ?? {});
    const savedVisible = cfg.visibleColumns ?? {};
    for (const f of FIELDS) {
        if (savedVisible[f.key] != null) {
            visibleColumns[f.key] = savedVisible[f.key];
        }
    }
    for (const checkbox of columnsPanel.querySelectorAll('input[type="checkbox"]')) {
        checkbox.checked = visibleColumns[checkbox.dataset.key];
    }
    buildTable();
    await refresh();
}

init();
