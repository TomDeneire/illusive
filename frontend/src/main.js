import './style.css';
import './app.css';

import {
    ListAdjectives,
    SearchAdjectives,
    CreateAdjective,
    UpdateAdjective,
    DeleteAdjective,
} from '../wailsjs/go/main/App';

const FIELDS = [
    { key: 'word', label: 'Word' },
    { key: 'adjective', label: 'Adjective' },
    { key: 'derivedAdverb', label: 'Derived adverb' },
    { key: 'translationLiteral', label: 'Translation (literally)' },
    { key: 'translationFigurative', label: 'Translation (figuratively)' },
    { key: 'exampleLiteral', label: 'Example (literally)' },
    { key: 'exampleFigurative', label: 'Example (figuratively)' },
];

let editingId = null;

document.querySelector('#app').innerHTML = `
    <h1>Illusive Adjectives</h1>
    <div class="toolbar">
        <input id="search" type="text" placeholder="Search adjectives, translations..." autocomplete="off" />
        <button id="add-btn">+ Add adjective</button>
    </div>
    <table>
        <thead>
            <tr>
                <th>Word</th>
                <th>Adjective</th>
                <th>Derived adverb</th>
                <th>Translation (literally)</th>
                <th>Translation (figuratively)</th>
                <th></th>
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
const searchEl = document.getElementById('search');
const dialogEl = document.getElementById('dialog');
const dialogTitleEl = document.getElementById('dialog-title');
const formEl = document.getElementById('form');

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

function renderRows(entries) {
    if (!entries || entries.length === 0) {
        rowsEl.innerHTML = `<tr><td colspan="6" class="empty">No adjectives found.</td></tr>`;
        return;
    }
    rowsEl.innerHTML = entries.map(e => `
        <tr data-id="${e.id}">
            <td>${escapeHtml(e.word)}</td>
            <td>${escapeHtml(e.adjective)}</td>
            <td>${escapeHtml(e.derivedAdverb)}</td>
            <td>${escapeHtml(e.translationLiteral)}</td>
            <td>${escapeHtml(e.translationFigurative)}</td>
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
    const query = searchEl.value.trim();
    try {
        const entries = query ? await SearchAdjectives(query) : await ListAdjectives();
        renderRows(entries);
    } catch (err) {
        rowsEl.innerHTML = `<tr><td colspan="6" class="empty">Failed to load: ${escapeHtml(String(err))}</td></tr>`;
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

let searchTimer;
searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refresh, 200);
});

refresh();
