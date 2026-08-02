import './style.css';
import './app.css';

import {
    ListAdjectives,
    CreateAdjective,
    UpdateAdjective,
    DeleteAdjective,
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

// Columns shown (and filterable/sortable) in the table.
const COLUMNS = FIELDS.slice(0, 5);

let editingId = null;
let allEntries = [];
const filters = Object.fromEntries(COLUMNS.map(c => [c.key, '']));
let sortKey = 'adjective';
let sortDir = 'asc';

document.querySelector('#app').innerHTML = `
    <h1>Illusive Adjectives</h1>
    <div class="toolbar">
        <button id="add-btn">+ Add adjective</button>
    </div>
    <table>
        <thead>
            <tr>
                ${COLUMNS.map(c => `
                    <th class="sortable" data-key="${c.key}">
                        <span class="th-label">${c.label}</span>
                        <span class="sort-indicator" id="sort-${c.key}"></span>
                    </th>
                `).join('')}
                <th class="col-actions"></th>
            </tr>
            <tr class="filter-row">
                ${COLUMNS.map(c => `
                    <th>
                        <input type="text" class="filter-input" data-key="${c.key}" placeholder="Filter..." autocomplete="off" />
                    </th>
                `).join('')}
                <th class="col-actions"></th>
            </tr>
        </thead>
        <tbody id="rows"></tbody>
    </table>
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

const rowsEl = document.getElementById('rows');
const dialogEl = document.getElementById('dialog');
const dialogTitleEl = document.getElementById('dialog-title');
const formEl = document.getElementById('form');

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

function updateSortIndicators() {
    for (const c of COLUMNS) {
        const el = document.getElementById(`sort-${c.key}`);
        el.textContent = c.key === sortKey ? (sortDir === 'asc' ? '▲' : '▼') : '';
    }
}

function visibleEntries() {
    let entries = allEntries.filter(e =>
        COLUMNS.every(c => {
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

function render() {
    updateSortIndicators();
    const entries = visibleEntries();

    if (entries.length === 0) {
        rowsEl.innerHTML = `<tr><td colspan="${COLUMNS.length + 1}" class="empty">No adjectives found.</td></tr>`;
        return;
    }
    rowsEl.innerHTML = entries.map(e => `
        <tr data-id="${e.id}">
            ${COLUMNS.map(c => `<td>${escapeHtml(e[c.key])}</td>`).join('')}
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
        rowsEl.innerHTML = `<tr><td colspan="${COLUMNS.length + 1}" class="empty">Failed to load: ${escapeHtml(String(err))}</td></tr>`;
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

document.querySelectorAll('th.sortable').forEach(th => {
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

document.querySelectorAll('.filter-input').forEach(input => {
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('input', () => {
        filters[input.dataset.key] = input.value;
        render();
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

refresh();
