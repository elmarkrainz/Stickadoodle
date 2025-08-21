(function() {
  const STORAGE_KEY = 'stickadoodle.v1';

  const columnIds = ['todo', 'inprogress', 'done'];

  const boardEl = document.getElementById('board');
  const addForm = document.getElementById('add-form');
  const noteInput = document.getElementById('note-input');
  const noteColor = document.getElementById('note-color');
  const clearBtn = document.getElementById('clear-board');
  const boardTitleInput = document.getElementById('board-title');
  const teamNameInput = document.getElementById('team-name');

  let state = loadState();

  function initialState() {
    return {
      meta: {
        title: 'Stickadoodle',
        teamName: ''
      },
      columns: {
        todo: [],
        inprogress: [],
        done: []
      }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return initialState();
      let parsed = JSON.parse(raw);
      if (!parsed || !parsed.columns) parsed = initialState();
      parsed.meta = parsed.meta || { title: 'Stickadoodle', teamName: '' };
      parsed.meta.title = String(parsed.meta.title || 'Stickadoodle');
      parsed.meta.teamName = String(parsed.meta.teamName || '');
      for (const id of columnIds) {
        if (!Array.isArray(parsed.columns[id])) parsed.columns[id] = [];
      }
      return parsed;
    } catch (e) {
      console.warn('Failed to load state, resetting.', e);
      return initialState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function generateId() {
    return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function addNote(text, color, columnId = 'todo') {
    const note = {
      id: generateId(),
      text,
      color,
      createdAt: Date.now()
    };
    state.columns[columnId].push(note);
    saveState();
    renderBoard();
  }

  function updateNote(noteId, updater) {
    for (const colId of columnIds) {
      const idx = state.columns[colId].findIndex(n => n.id === noteId);
      if (idx !== -1) {
        const updated = { ...state.columns[colId][idx], ...updater };
        state.columns[colId].splice(idx, 1, updated);
        saveState();
        return { note: updated, columnId: colId, index: idx };
      }
    }
    return null;
  }

  function removeNote(noteId) {
    for (const colId of columnIds) {
      const idx = state.columns[colId].findIndex(n => n.id === noteId);
      if (idx !== -1) {
        state.columns[colId].splice(idx, 1);
        saveState();
        return true;
      }
    }
    return false;
  }

  function moveNote(noteId, toColumnId) {
    if (!columnIds.includes(toColumnId)) return;
    let found = null;
    for (const colId of columnIds) {
      const idx = state.columns[colId].findIndex(n => n.id === noteId);
      if (idx !== -1) {
        found = state.columns[colId].splice(idx, 1)[0];
        break;
      }
    }
    if (found) {
      state.columns[toColumnId].push(found);
      saveState();
    }
  }

  function createNoteElement(note) {
    const el = document.createElement('article');
    el.className = 'note';
    el.setAttribute('draggable', 'true');
    el.dataset.noteId = note.id;
    el.style.background = note.color || '#fff475';

    const text = document.createElement('div');
    text.className = 'note-text';
    text.contentEditable = 'true';
    text.spellcheck = true;
    text.textContent = note.text;

    const toolbar = document.createElement('div');
    toolbar.className = 'note-toolbar';

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.title = 'Delete note';
    delBtn.setAttribute('aria-label', 'Delete note');
    delBtn.innerHTML = '🗑️';

    toolbar.appendChild(delBtn);

    el.appendChild(text);
    el.appendChild(toolbar);

    text.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        text.blur();
      }
    });

    text.addEventListener('blur', () => {
      const newText = text.textContent.trim();
      updateNote(note.id, { text: newText });
    });

    delBtn.addEventListener('click', () => {
      removeNote(note.id);
      renderBoard();
    });

    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', note.id);
      setDragImage(e, el);
      el.classList.add('dragging');
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
    });

    el.addEventListener('dblclick', () => {
      text.focus();
      document.execCommand && document.execCommand('selectAll', false, null);
      window.getSelection && window.getSelection().collapseToEnd();
    });

    return el;
  }

  function setDragImage(e, el) {
    try {
      const clone = el.cloneNode(true);
      clone.style.position = 'absolute';
      clone.style.top = '-1000px';
      clone.style.left = '-1000px';
      clone.style.width = getComputedStyle(el).width;
      document.body.appendChild(clone);
      e.dataTransfer.setDragImage(clone, 20, 20);
      setTimeout(() => document.body.removeChild(clone), 0);
    } catch (_) {}
  }

  function renderBoard() {
    const zones = document.querySelectorAll('.column-content');
    zones.forEach(zone => {
      zone.innerHTML = '';
      const colId = zone.dataset.columnId;
      for (const note of state.columns[colId]) {
        zone.appendChild(createNoteElement(note));
      }
    });
  }

  function renderMeta() {
    if (boardTitleInput) boardTitleInput.value = state.meta.title || '';
    if (teamNameInput) teamNameInput.value = state.meta.teamName || '';
  }

  function setupDnD() {
    const zones = document.querySelectorAll('.dropzone');

    zones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const noteId = e.dataTransfer.getData('text/plain');
        const toColumnId = zone.dataset.columnId;
        if (!noteId || !toColumnId) return;
        moveNote(noteId, toColumnId);
        renderBoard();
      });
    });
  }

  function attachFormHandlers() {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = noteInput.value.trim();
      const color = noteColor.value || '#fff475';
      if (!text) return;
      addNote(text, color, 'todo');
      noteInput.value = '';
      noteInput.focus();
    });

    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all notes?')) {
        const keepMeta = state.meta;
        state = initialState();
        state.meta = keepMeta;
        saveState();
        renderBoard();
        renderMeta();
      }
    });
  }

  function attachMetaHandlers() {
    if (boardTitleInput) {
      boardTitleInput.addEventListener('input', (e) => {
        state.meta.title = e.target.value;
        saveState();
      });
    }
    if (teamNameInput) {
      teamNameInput.addEventListener('input', (e) => {
        state.meta.teamName = e.target.value;
        saveState();
      });
    }
  }

  // Init
  attachFormHandlers();
  attachMetaHandlers();
  setupDnD();
  renderBoard();
  renderMeta();
})(); 