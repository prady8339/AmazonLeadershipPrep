let serverData = { notes: {}, progress: [] };

async function fetchData() {
  const res = await fetch('/api/data');
  serverData = await res.json();
  renderList();
}

async function saveData() {
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serverData)
  });
}

function renderList() {
  const listElement = document.getElementById('problem-list');
  listElement.innerHTML = '';

  for (let i = 0; i < 150; i++) {
    const problem = `Problem ${i + 1}`;
    const li = document.createElement('li');
    const span = document.createElement('span');
    const noteButton = document.createElement('button');
    const markButton = document.createElement('button');
    const noteSection = document.createElement('div');
    const textarea = document.createElement('textarea');
    const saveNoteButton = document.createElement('button');

    span.textContent = problem;
    noteButton.textContent = 'Note';
    markButton.textContent = serverData.progress.includes(i) ? 'Done' : 'Mark as Done';
    if (serverData.progress.includes(i)) {
      span.classList.add('completed');
      markButton.classList.add('completed');
    }

    noteSection.style.display = 'none';
    noteSection.classList.add('note-section');
    textarea.placeholder = "Write your notes here...";
    textarea.value = serverData.notes[i] || '';
    saveNoteButton.textContent = 'Save Note';

    noteButton.addEventListener('click', () => {
      noteSection.style.display = noteSection.style.display === 'none' ? 'flex' : 'none';
    });

    saveNoteButton.addEventListener('click', async () => {
      serverData.notes[i] = textarea.value;
      await saveData();
      alert('Note saved!');
    });

    markButton.addEventListener('click', async () => {
      if (serverData.progress.includes(i)) {
        serverData.progress = serverData.progress.filter(n => n !== i);
      } else {
        serverData.progress.push(i);
      }
      await saveData();
      renderList();
    });

    noteSection.appendChild(textarea);
    noteSection.appendChild(saveNoteButton);
    li.appendChild(span);
    li.appendChild(noteButton);
    li.appendChild(markButton);
    li.appendChild(noteSection);
    listElement.appendChild(li);
  }
}

fetchData();


async function loadQuestions() {
  const res = await fetch('/questions.json');
  const questions = await res.json();
  const container = document.getElementById('lp-container');

  Object.entries(questions).forEach(([category, items], index) => {
    const section = document.createElement('section');
    section.className = 'lp-section';
    const title = document.createElement('h2');
    title.textContent = category;

    const ul = document.createElement('ul');
    items.forEach(question => {
      const li = document.createElement('li');
      li.textContent = question;
      ul.appendChild(li);
    });

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Write your personal story here...';
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Story';

    saveButton.addEventListener('click', async () => {
      serverData.stories = serverData.stories || {};
      serverData.stories[category] = textarea.value;
      await saveData();
      alert('Story saved!');
    });

    section.appendChild(title);
    section.appendChild(ul);
    section.appendChild(textarea);
    section.appendChild(saveButton);
    container.appendChild(section);
  });
}
