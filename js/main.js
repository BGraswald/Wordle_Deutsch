document.addEventListener("DOMContentLoaded", () => {
  createSquares();

  let guessedWords = [[]];
  let availableSpace = 1;

  let word;
  let guessedWordCount = 0;

  const keys = document.querySelectorAll(".keyboard-row button");

  // --- LOCAL STORAGE KEYS ---
  const LS_STATS = "wordle_stats_v2"; // Changed version to reset stats for new format or we migrate
  const LS_WORD_MODS = "wordle_modifications"; // { added: [], removed: [] }
  const LS_GAME_STATE = "wordle_state";

  // --- LOADING WORD LIST ---
  let wordList = [];

  function loadWordList() {
    fetch('wordle_german_final.txt')
      .then(response => response.text())
      .then(data => {
        wordList = data.split('\n').map(word => word.trim().toUpperCase()).filter(word => word.length > 0);
        console.log(`Loaded ${wordList.length} words.`);
        getNewWord();
      })
      .catch(err => console.error(err));
  }

  loadWordList();

  function getNewWord() {
    if (wordList.length > 0) {
      word = wordList[Math.floor(Math.random() * wordList.length)];
      console.log(word);
    }
  }

  // --- MODALS LOGIN ---
  const modalOverlay = document.getElementById('modal-overlay');
  const modals = document.querySelectorAll('.modal');
  const closeButtons = document.querySelectorAll('.close-modal');

  function openModal(modalId) {
    modalOverlay.classList.remove('hidden');
    document.getElementById(modalId).classList.remove('hidden');
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
    modals.forEach(modal => modal.classList.add('hidden'));
  }

  closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
  modalOverlay.addEventListener('click', closeModal);

  // Header Icons
  document.querySelector('.menu-left .material-icons').addEventListener('click', () => openModal('help-modal'));
  document.querySelector('.menu-right .material-icons:nth-child(1)').addEventListener('click', () => {
    updateStatsUI();
    openModal('stats-modal');
  });
  document.querySelector('.menu-right .material-icons:nth-child(2)').addEventListener('click', () => openModal('settings-modal'));

  // --- STATS LOGIC ---
  let stats = JSON.parse(localStorage.getItem(LS_STATS)) || {
    gamesPlayed: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0], // Index 0 = 1 guess, Index 5 = 6 guesses
    solutionHistory: {} // word -> count
  };

  // Patch for existing users without guessDistribution or solutionHistory
  if (!stats.guessDistribution) stats.guessDistribution = [0, 0, 0, 0, 0, 0];
  if (!stats.solutionHistory) stats.solutionHistory = {};

  function updateStats(won, guessCount, winningWord) {
    stats.gamesPlayed++;
    if (won) {
      stats.wins++;
      stats.currentStreak++;
      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak;
      }
      if (guessCount >= 1 && guessCount <= 6) {
        stats.guessDistribution[guessCount - 1]++;
      }
      // Update History
      if (winningWord) {
        stats.solutionHistory[winningWord] = (stats.solutionHistory[winningWord] || 0) + 1;
      }
    } else {
      stats.currentStreak = 0;
    }
    localStorage.setItem(LS_STATS, JSON.stringify(stats));
  }

  function updateStatsUI(highlightIndex = -1) {
    document.getElementById('games-played').textContent = stats.gamesPlayed;
    document.getElementById('win-pct').textContent = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
    document.getElementById('current-streak').textContent = stats.currentStreak;
    document.getElementById('max-streak').textContent = stats.maxStreak;

    // Render Graph
    const distContainer = document.getElementById('guess-distribution');
    distContainer.innerHTML = '';

    const maxVal = Math.max(...stats.guessDistribution, 1); // Avoid div by zero

    stats.guessDistribution.forEach((count, index) => {
      const row = document.createElement('div');
      row.className = 'graph-row';

      // Column 1: Attempt Number
      const label = document.createElement('div');
      label.className = 'graph-label';
      label.textContent = index + 1;

      // Column 2: Bar
      const barContainer = document.createElement('div');
      barContainer.className = 'graph-bar-container';

      const bar = document.createElement('div');
      bar.className = 'graph-bar';
      const percentage = (count / maxVal) * 100;
      bar.style.width = `${Math.max(percentage, 0)}%`; // Ensure visible logic handled by min-width or just allow 0 width

      // Highlight logic
      if (index === highlightIndex) {
        bar.classList.add('highlight');
      }

      barContainer.appendChild(bar);

      // Column 3: Count (Amount)
      const countLabel = document.createElement('div');
      countLabel.className = 'graph-count';
      countLabel.textContent = count;

      // Append all to row
      row.appendChild(label);
      row.appendChild(barContainer);
      row.appendChild(countLabel);

      distContainer.appendChild(row);
    });
  }

  function updateHistoryUI() {
    const container = document.getElementById('history-list');
    container.innerHTML = '';

    // Sort: Most frequent first, then alphabetical
    const entries = Object.entries(stats.solutionHistory);
    if (entries.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 20px; color: #818384;">Noch keine Siege.</div>';
      return;
    }

    entries.sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]; // Frequency desc
      return a[0].localeCompare(b[0]); // Alphabetical asc
    });

    entries.forEach(([word, count]) => {
      const row = document.createElement('div');
      row.className = 'history-row';

      const wordDiv = document.createElement('div');
      wordDiv.textContent = word;

      const countDiv = document.createElement('div');
      countDiv.textContent = count;

      row.appendChild(wordDiv);
      row.appendChild(countDiv);
      container.appendChild(row);
    });
  }

  // --- SHARING LOGIC ---
  document.getElementById('share-button').addEventListener('click', () => {
    let shareText = `Wordle Deutsch ${guessedWordCount}/6\n\n`;
    const board = document.getElementById("board");
    for (let i = 0; i < guessedWordCount; i++) {
      for (let j = 0; j < 5; j++) {
        const square = board.children[i * 5 + j];
        const color = square.style.backgroundColor;
        if (color === "rgb(83, 141, 78)") shareText += "🟩";
        else if (color === "rgb(181, 159, 59)") shareText += "🟨";
        else shareText += "⬛";
      }
      shareText += "\n";
    }
    navigator.clipboard.writeText(shareText).then(() => {
      alert("Ergebnis in die Zwischenablage kopiert!");
    });
  });


  document.getElementById('history-button').addEventListener('click', () => {
    updateHistoryUI();
    openModal('history-modal');
  });

  document.getElementById('new-game-button').addEventListener('click', () => {
    resetGame();
  });

  function resetGame() {
    closeModal();

    // Reset variables
    guessedWords = [[]];
    availableSpace = 1;
    guessedWordCount = 0;

    // Pick new word
    getNewWord();

    // Reset Grid
    const board = document.getElementById("board");
    board.innerHTML = '';
    createSquares();

    // Reset Keyboard Colors
    keys.forEach(key => {
      key.style.backgroundColor = '';
    });

    // Reset Animations on Keyboard
    // (If we had specific animation classes on keys, we'd remove them here too)
  }

  // --- GAME LOGIC ---

  function getCurrentWordArr() {
    const numberOfGuessedWords = guessedWords.length;
    return guessedWords[numberOfGuessedWords - 1];
  }

  function handleSubmitWord() {
    const currentWordArr = getCurrentWordArr();
    if (currentWordArr.length !== 5) {
      shakeRow(guessedWordCount);
      return;
    }

    const currentWord = currentWordArr.join("").toUpperCase();

    if (!wordList.includes(currentWord)) {
      shakeRow(guessedWordCount);
      alert("Wort nicht gefunden!");
      return;
    }

    const tileColors = getTileColors(currentWord);
    const firstLetterId = guessedWordCount * 5 + 1;
    const interval = 200;

    currentWordArr.forEach((letter, index) => {
      setTimeout(() => {
        const tileColor = tileColors[index];
        const letterId = firstLetterId + index;
        const letterEl = document.getElementById(letterId);
        letterEl.classList.add("animate__flipInX");
        letterEl.style = `background-color:${tileColor};border-color:${tileColor}`;
        updateKeyboardColor(letter, tileColor);
      }, interval * index);
    });

    guessedWordCount += 1;

    if (currentWord === word) {
      updateStats(true, guessedWordCount, word); // Pass winning word
      setTimeout(() => {
        bounceRow(guessedWordCount - 1);
        setTimeout(() => {
          updateStatsUI(guessedWordCount - 1); // Pass 0-based index for highlighting
          openModal('stats-modal');
        }, 1500);
      }, interval * 5 + 100);
    } else if (guessedWords.length === 6) {
      updateStats(false, 0, null);
      setTimeout(() => {
        alert(`Schade! Das Wort war ${word}.`);
        updateStatsUI();
        openModal('stats-modal');
      }, interval * 5 + 100);
    }

    guessedWords.push([]);
  }

  function updateGuessedWords(letter) {
    const currentWordArr = getCurrentWordArr();

    if (currentWordArr && currentWordArr.length < 5) {
      currentWordArr.push(letter);

      const availableSpaceEl = document.getElementById(String(availableSpace));

      availableSpace = availableSpace + 1;
      availableSpaceEl.textContent = letter;
    }
  }

  function getTileColors(guessWord) {
    const result = Array(5).fill("rgb(58, 58, 60)");
    const targetWord = word.split('');
    const guessChars = guessWord.split('');
    const targetLetterCounts = {};
    targetWord.forEach(letter => targetLetterCounts[letter] = (targetLetterCounts[letter] || 0) + 1);

    guessChars.forEach((letter, index) => {
      if (letter === targetWord[index]) {
        result[index] = "rgb(83, 141, 78)";
        targetLetterCounts[letter]--;
        guessChars[index] = null;
        targetWord[index] = null;
      }
    });

    guessChars.forEach((letter, index) => {
      if (letter !== null && targetLetterCounts[letter] > 0) {
        result[index] = "rgb(181, 159, 59)";
        targetLetterCounts[letter]--;
      }
    });
    return result;
  }

  function shakeRow(rowIndex) {
    const startId = rowIndex * 5 + 1;
    for (let i = 0; i < 5; i++) {
      const el = document.getElementById(startId + i);
      el.classList.remove("animate__shake");
      void el.offsetWidth; // trigger reflow
      el.classList.add("animate__shake");
    }
  }

  function bounceRow(rowIndex) {
    const startId = rowIndex * 5 + 1;
    const interval = 100;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const el = document.getElementById(startId + i);
        el.classList.add("animate__bounce");
      }, i * interval);
    }
  }

  function updateKeyboardColor(letter, color) {
    const keyButton = document.querySelector(`[data-key="${letter.toLowerCase()}"]`);
    if (!keyButton) return;
    const currentColor = keyButton.style.backgroundColor;

    if (color === "rgb(83, 141, 78)") { // Green
      keyButton.style.backgroundColor = color;
    } else if (color === "rgb(181, 159, 59)" && currentColor !== "rgb(83, 141, 78)") { // Yellow
      keyButton.style.backgroundColor = color;
    } else if (currentColor !== "rgb(83, 141, 78)" && currentColor !== "rgb(181, 159, 59)") { // Grey
      keyButton.style.backgroundColor = color;
    }
  }

  function createSquares() {
    const gameBoard = document.getElementById("board");
    for (let index = 0; index < 30; index++) {
      let square = document.createElement("div");
      square.classList.add("square");
      square.classList.add("animate__animated");
      square.setAttribute("id", index + 1);
      gameBoard.appendChild(square);
    }
  }

  function handleDeleteLetter() {
    const currentWordArr = getCurrentWordArr();
    if (currentWordArr.length > 0) {
      currentWordArr.pop();
      guessedWords[guessedWords.length - 1] = currentWordArr;
      const lastLetterEl = document.getElementById(String(availableSpace - 1));
      lastLetterEl.textContent = "";
      availableSpace = availableSpace - 1;
    }
  }

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('modal-overlay').classList.contains('hidden')) return;

    const key = e.key.toLowerCase();
    if (key === 'enter') {
      handleSubmitWord();
      return;
    }
    if (key === 'backspace') {
      handleDeleteLetter();
      return;
    }
    if (/^[a-z]$/.test(key)) {
      updateGuessedWords(key);
    }
  });

  for (let i = 0; i < keys.length; i++) {
    keys[i].onclick = ({ target }) => {
      const letter = target.getAttribute("data-key");
      if (letter === "enter") {
        handleSubmitWord();
        return;
      }
      if (letter === "del") {
        handleDeleteLetter();
        return;
      }
      updateGuessedWords(letter);
    };
  }
});
