/**
 * Block Blast! Game Engine
 * Core mechanics: 8x8 Board, Smart Dock generation, Drag & Drop + Tap & Place,
 * Line Blast, Combo System & Particle Effects
 */

(function () {
  'use strict';

  // --- Game Constants & Shape Definitions ---
  const BOARD_SIZE = 8;

  const COLOR_PALETTES = [
    'color-cyan',
    'color-green',
    'color-blue',
    'color-purple',
    'color-orange',
    'color-red',
    'color-yellow',
    'color-magenta'
  ];

  // Authentic Block Blast shapes (matrices of 1s and 0s)
  const SHAPE_TEMPLATES = [
    // 1x1 Dot
    { name: 'dot', matrix: [[1]] },

    // 2-blocks
    { name: 'h2', matrix: [[1, 1]] },
    { name: 'v2', matrix: [[1], [1]] },

    // 3-blocks Line
    { name: 'h3', matrix: [[1, 1, 1]] },
    { name: 'v3', matrix: [[1], [1], [1]] },

    // 4-blocks Line
    { name: 'h4', matrix: [[1, 1, 1, 1]] },
    { name: 'v4', matrix: [[1], [1], [1], [1]] },

    // 5-blocks Line
    { name: 'h5', matrix: [[1, 1, 1, 1, 1]] },
    { name: 'v5', matrix: [[1], [1], [1], [1], [1]] },

    // 2x2 Square
    { name: 'sq2', matrix: [[1, 1], [1, 1]] },

    // 3x3 Square
    { name: 'sq3', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },

    // Small L-Corners (2x2)
    { name: 'corner_bl', matrix: [[1, 0], [1, 1]] },
    { name: 'corner_br', matrix: [[0, 1], [1, 1]] },
    { name: 'corner_tl', matrix: [[1, 1], [1, 0]] },
    { name: 'corner_tr', matrix: [[1, 1], [0, 1]] },

    // Standard L (3x2)
    { name: 'L1', matrix: [[1, 0], [1, 0], [1, 1]] },
    { name: 'L2', matrix: [[0, 1], [0, 1], [1, 1]] },
    { name: 'L3', matrix: [[1, 1], [1, 0], [1, 0]] },
    { name: 'L4', matrix: [[1, 1], [0, 1], [0, 1]] },

    // Standard L rotated (2x3)
    { name: 'L5', matrix: [[1, 1, 1], [1, 0, 0]] },
    { name: 'L6', matrix: [[1, 1, 1], [0, 0, 1]] },
    { name: 'L7', matrix: [[1, 0, 0], [1, 1, 1]] },
    { name: 'L8', matrix: [[0, 0, 1], [1, 1, 1]] },

    // T-shapes (3x2 / 2x3)
    { name: 'T_down', matrix: [[1, 1, 1], [0, 1, 0]] },
    { name: 'T_up',   matrix: [[0, 1, 0], [1, 1, 1]] },
    { name: 'T_right', matrix: [[1, 0], [1, 1], [1, 0]] },
    { name: 'T_left',  matrix: [[0, 1], [1, 1], [0, 1]] },

    // Z & S shapes
    { name: 'Z1', matrix: [[1, 1, 0], [0, 1, 1]] },
    { name: 'S1', matrix: [[0, 1, 1], [1, 1, 0]] },
    { name: 'Z2', matrix: [[0, 1], [1, 1], [1, 0]] },
    { name: 'S2', matrix: [[1, 0], [1, 1], [0, 1]] },

    // Big Corner (3x3)
    { name: 'big_c_bl', matrix: [[1, 0, 0], [1, 0, 0], [1, 1, 1]] },
    { name: 'big_c_br', matrix: [[0, 0, 1], [0, 0, 1], [1, 1, 1]] },
    { name: 'big_c_tl', matrix: [[1, 1, 1], [1, 0, 0], [1, 0, 0]] },
    { name: 'big_c_tr', matrix: [[1, 1, 1], [0, 0, 1], [0, 0, 1]] },

    // Plus (+) shape
    { name: 'plus', matrix: [[0, 1, 0], [1, 1, 1], [0, 1, 0]] }
  ];

  // --- Main Game Engine ---
  class BlockBlastGame {
    constructor() {
      this.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
      this.dock = [null, null, null];
      this.score = 0;
      this.highScore = parseInt(localStorage.getItem('block_blast_high_score') || '0', 10);
      this.comboCount = 0;
      this.isGameOver = false;
      this.isClearingAnimation = false;

      // Pointer / Drag / Tap State
      this.draggedSlot = null;
      this.draggedPiece = null;
      this.selectedSlot = null; // for tap-to-select mode
      this.hoverGridPos = null;
      this.pointerStartX = 0;
      this.pointerStartY = 0;
      this.isDragging = false;
      this.touchOffsetY = 0;

      // DOM Elements
      this.boardEl = document.getElementById('board');
      this.boardWrapperEl = document.querySelector('.board-wrapper');
      this.currentScoreEl = document.getElementById('current-score');
      this.highScoreEl = document.getElementById('high-score');
      this.comboBannerEl = document.getElementById('combo-banner');
      this.comboTextEl = document.getElementById('combo-text');
      this.dragGhostEl = document.getElementById('drag-ghost');
      this.gameOverModalEl = document.getElementById('game-over-modal');
      this.finalScoreEl = document.getElementById('final-score');
      this.finalBestEl = document.getElementById('final-best');
      this.newRecordBadgeEl = document.getElementById('new-record-badge');
      this.soundToggleBtn = document.getElementById('sound-toggle-btn');
      this.soundIconEl = document.getElementById('sound-icon');
      this.restartBtn = document.getElementById('restart-btn');
      this.modalRestartBtn = document.getElementById('modal-restart-btn');
      this.slotEls = [
        document.getElementById('slot-0'),
        document.getElementById('slot-1'),
        document.getElementById('slot-2')
      ];

      // Visual FX Engine
      this.initFX();

      // Bind all UI & pointer listeners
      this.bindEvents();

      // Start the game!
      this.startNewGame();
    }

    // --- Particle Effects System ---
    initFX() {
      this.fxCanvas = document.getElementById('fx-canvas');
      this.fxCtx = this.fxCanvas.getContext('2d');
      this.particles = [];
      this.floatingTexts = [];

      const resize = () => {
        const rect = this.boardWrapperEl.getBoundingClientRect();
        this.fxCanvas.width = rect.width;
        this.fxCanvas.height = rect.height;
      };
      resize();
      window.addEventListener('resize', resize);

      const loop = () => {
        this.updateAndRenderFX();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    createParticles(x, y, colorHex = '#00d2d3', count = 18) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5.5;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          size: 3 + Math.random() * 4,
          alpha: 1,
          decay: 0.022 + Math.random() * 0.03,
          color: colorHex
        });
      }
    }

    createFloatingText(x, y, text, color = '#fbc531') {
      this.floatingTexts.push({
        x,
        y,
        text,
        color,
        alpha: 1,
        vy: -2,
        scale: 1.2
      });
    }

    updateAndRenderFX() {
      this.fxCtx.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);

      // Render Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.16; // gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        this.fxCtx.save();
        this.fxCtx.globalAlpha = Math.max(0, p.alpha);
        this.fxCtx.fillStyle = p.color;
        this.fxCtx.shadowColor = p.color;
        this.fxCtx.shadowBlur = 8;
        this.fxCtx.beginPath();
        this.fxCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.fxCtx.fill();
        this.fxCtx.restore();
      }

      // Render Floating Text
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.024;

        if (ft.alpha <= 0) {
          this.floatingTexts.splice(i, 1);
          continue;
        }

        this.fxCtx.save();
        this.fxCtx.globalAlpha = Math.max(0, ft.alpha);
        this.fxCtx.font = `bold ${Math.round(20 * ft.scale)}px Fredoka, 'Noto Sans KR', sans-serif`;
        this.fxCtx.fillStyle = ft.color;
        this.fxCtx.textAlign = 'center';
        this.fxCtx.shadowColor = 'rgba(0,0,0,0.85)';
        this.fxCtx.shadowBlur = 6;
        this.fxCtx.fillText(ft.text, ft.x, ft.y);
        this.fxCtx.restore();
      }
    }

    // --- Game Initialization & Reset ---
    startNewGame() {
      this.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
      this.score = 0;
      this.comboCount = 0;
      this.isGameOver = false;
      this.isClearingAnimation = false;
      this.draggedSlot = null;
      this.draggedPiece = null;
      this.selectedSlot = null;
      this.isDragging = false;
      this.hoverGridPos = null;

      this.updateScoreDisplay();
      this.highScoreEl.textContent = this.highScore;
      this.hideComboBanner();
      this.gameOverModalEl.classList.add('hidden');

      this.renderBoard();
      this.spawnDockPieces();
      this.updateDockPlaceableState();
      this.updateSoundIcon();
    }

    // --- Board Rendering ---
    renderBoard() {
      this.boardEl.innerHTML = '';
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const cellEl = document.createElement('div');
          cellEl.className = 'cell';
          cellEl.dataset.row = r;
          cellEl.dataset.col = c;

          const color = this.board[r][c];
          if (color) {
            cellEl.classList.add('filled', color);
          }
          this.boardEl.appendChild(cellEl);
        }
      }
    }

    getCellElement(row, col) {
      return this.boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    }

    // --- Dock Management & Fairness Algorithm ---
    spawnDockPieces() {
      for (let i = 0; i < 3; i++) {
        this.dock[i] = this.generateRandomPiece();
      }

      // Fairness check: Ensure at least one piece can fit on the current board
      let attempts = 0;
      while (!this.hasAnyValidPlacement() && attempts < 25) {
        for (let i = 0; i < 3; i++) {
          this.dock[i] = this.generateRandomPiece();
        }
        attempts++;
      }

      this.renderDock();
    }

    generateRandomPiece() {
      const template = SHAPE_TEMPLATES[Math.floor(Math.random() * SHAPE_TEMPLATES.length)];
      const color = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
      return {
        name: template.name,
        matrix: template.matrix,
        color: color
      };
    }

    renderDock() {
      for (let i = 0; i < 3; i++) {
        const slotEl = this.slotEls[i];
        slotEl.innerHTML = '';
        slotEl.classList.remove('empty', 'selected', 'unplaceable');
        slotEl.style.opacity = '1';

        const piece = this.dock[i];
        if (!piece) {
          slotEl.classList.add('empty');
          continue;
        }

        const pieceEl = this.createPieceElement(piece);
        pieceEl.dataset.slot = i;
        slotEl.appendChild(pieceEl);
      }
      this.updateDockPlaceableState();
    }

    createPieceElement(piece) {
      const pieceEl = document.createElement('div');
      pieceEl.className = 'block-piece';
      const rows = piece.matrix.length;
      const cols = piece.matrix[0].length;

      // Dynamically compute tile size so larger shapes (5-block line, 3x3) fit nicely
      const maxDim = Math.max(rows, cols);
      let tileSize = 22;
      if (maxDim >= 5) tileSize = 15;
      else if (maxDim === 4) tileSize = 18;
      else if (maxDim === 3) tileSize = 20;

      pieceEl.style.gridTemplateRows = `repeat(${rows}, ${tileSize}px)`;
      pieceEl.style.gridTemplateColumns = `repeat(${cols}, ${tileSize}px)`;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tile = document.createElement('div');
          tile.style.width = `${tileSize}px`;
          tile.style.height = `${tileSize}px`;
          if (piece.matrix[r][c] === 1) {
            tile.className = `block-tile ${piece.color}`;
          } else {
            tile.style.visibility = 'hidden';
          }
          pieceEl.appendChild(tile);
        }
      }
      return pieceEl;
    }

    updateDockPlaceableState() {
      for (let i = 0; i < 3; i++) {
        const slotEl = this.slotEls[i];
        const piece = this.dock[i];
        if (!piece) continue;

        const canPlace = this.canPieceFitAnywhere(piece);
        if (!canPlace) {
          slotEl.classList.add('unplaceable');
        } else {
          slotEl.classList.remove('unplaceable');
        }
      }
    }

    canPieceFitAnywhere(piece) {
      const rows = piece.matrix.length;
      const cols = piece.matrix[0].length;

      for (let r = 0; r <= BOARD_SIZE - rows; r++) {
        for (let c = 0; c <= BOARD_SIZE - cols; c++) {
          if (this.canPlacePiece(piece, r, c)) {
            return true;
          }
        }
      }
      return false;
    }

    hasAnyValidPlacement() {
      return this.dock.some(piece => piece && this.canPieceFitAnywhere(piece));
    }

    // --- Placement Validation & Execution ---
    canPlacePiece(piece, startRow, startCol) {
      if (!piece) return false;
      const rows = piece.matrix.length;
      const cols = piece.matrix[0].length;

      if (startRow < 0 || startCol < 0 || startRow + rows > BOARD_SIZE || startCol + cols > BOARD_SIZE) {
        return false;
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (piece.matrix[r][c] === 1) {
            if (this.board[startRow + r][startCol + c] !== null) {
              return false;
            }
          }
        }
      }
      return true;
    }

    placePiece(piece, startRow, startCol) {
      const rows = piece.matrix.length;
      const cols = piece.matrix[0].length;
      let tilesPlaced = 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (piece.matrix[r][c] === 1) {
            this.board[startRow + r][startCol + c] = piece.color;
            tilesPlaced++;

            const cellEl = this.getCellElement(startRow + r, startCol + c);
            if (cellEl) {
              cellEl.className = `cell filled ${piece.color} place-anim`;
            }
          }
        }
      }

      // Add base score for placed tiles
      this.addScore(tilesPlaced * 10);

      // Check line clears
      this.checkAndClearLines();
    }

    // --- Line Clear Blast & Combo Calculation ---
    checkAndClearLines() {
      const rowsToClear = [];
      const colsToClear = [];

      // Check horizontal rows
      for (let r = 0; r < BOARD_SIZE; r++) {
        let full = true;
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (this.board[r][c] === null) {
            full = false;
            break;
          }
        }
        if (full) rowsToClear.push(r);
      }

      // Check vertical columns
      for (let c = 0; c < BOARD_SIZE; c++) {
        let full = true;
        for (let r = 0; r < BOARD_SIZE; r++) {
          if (this.board[r][c] === null) {
            full = false;
            break;
          }
        }
        if (full) colsToClear.push(c);
      }

      const totalLines = rowsToClear.length + colsToClear.length;

      if (totalLines > 0) {
        this.isClearingAnimation = true;
        this.comboCount++;

        // Sound
        window.soundEngine.playClear(totalLines, this.comboCount);

        // Shake Board if multi-line or combo >= 2
        if (totalLines >= 2 || this.comboCount >= 2) {
          this.shakeBoard();
        }

        // Show Combo Banner
        this.showComboBanner(this.comboCount, totalLines);

        // Collect all distinct cleared cells
        const clearedCells = new Set();
        rowsToClear.forEach(r => {
          for (let c = 0; c < BOARD_SIZE; c++) clearedCells.add(`${r},${c}`);
        });
        colsToClear.forEach(c => {
          for (let r = 0; r < BOARD_SIZE; r++) clearedCells.add(`${r},${c}`);
        });

        // Trigger blast animation & particles
        const boardRect = this.boardEl.getBoundingClientRect();
        const cellWidth = boardRect.width / BOARD_SIZE;
        const cellHeight = boardRect.height / BOARD_SIZE;

        clearedCells.forEach(coord => {
          const [r, c] = coord.split(',').map(Number);
          const cellEl = this.getCellElement(r, c);
          if (cellEl) {
            cellEl.classList.add('blast-anim');
          }

          const px = c * cellWidth + cellWidth / 2;
          const py = r * cellHeight + cellHeight / 2;
          this.createParticles(px, py, '#ffffff', 14);
        });

        // Calculate score with combo multiplier
        const lineBasePoints = (totalLines * (totalLines + 1) / 2) * 100;
        const comboMultiplier = 1 + (this.comboCount - 1) * 0.5;
        const earnedScore = Math.round(lineBasePoints * comboMultiplier);

        this.addScore(earnedScore);

        // Center floating score
        const centerPos = boardRect.width / 2;
        this.createFloatingText(centerPos, centerPos, `+${earnedScore}`, '#fbc531');

        setTimeout(() => {
          clearedCells.forEach(coord => {
            const [r, c] = coord.split(',').map(Number);
            this.board[r][c] = null;
          });

          this.renderBoard();
          this.isClearingAnimation = false;
          this.postPlacementStep();
        }, 320);

      } else {
        // No line clear: reset combo streak
        this.comboCount = 0;
        this.hideComboBanner();
        window.soundEngine.playPlace();
        this.postPlacementStep();
      }
    }

    postPlacementStep() {
      // If dock empty, generate 3 new pieces
      if (this.dock.every(piece => piece === null)) {
        this.spawnDockPieces();
      } else {
        this.updateDockPlaceableState();
      }

      // Check for Game Over
      if (!this.hasAnyValidPlacement()) {
        this.triggerGameOver();
      }
    }

    shakeBoard() {
      this.boardWrapperEl.style.animation = 'none';
      void this.boardWrapperEl.offsetWidth;
      this.boardWrapperEl.style.animation = 'shake 0.35s ease';
      setTimeout(() => {
        this.boardWrapperEl.style.animation = '';
      }, 350);
    }

    showComboBanner(combo, lines) {
      let text = 'LINE CLEAR!';
      if (combo > 1) {
        text = `COMBO x${combo}! 🔥`;
      } else if (lines >= 3) {
        text = 'SUPER BLAST! 💥';
      } else if (lines === 2) {
        text = 'DOUBLE BLAST! ✨';
      }

      this.comboTextEl.textContent = text;
      this.comboBannerEl.classList.remove('hidden');

      if (combo >= 4) {
        this.comboBannerEl.style.background = 'linear-gradient(135deg, #a55eea, #eb3b5a)';
      } else if (combo >= 2) {
        this.comboBannerEl.style.background = 'linear-gradient(135deg, #ff9f43, #ee5253)';
      } else {
        this.comboBannerEl.style.background = 'linear-gradient(135deg, #00d2d3, #2e86de)';
      }
    }

    hideComboBanner() {
      this.comboBannerEl.classList.add('hidden');
    }

    // --- Score Management ---
    addScore(points) {
      this.score += points;
      this.updateScoreDisplay();

      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.highScoreEl.textContent = this.highScore;
        localStorage.setItem('block_blast_high_score', this.highScore);
      }
    }

    updateScoreDisplay() {
      this.currentScoreEl.textContent = this.score;
      this.currentScoreEl.classList.remove('bump');
      void this.currentScoreEl.offsetWidth;
      this.currentScoreEl.classList.add('bump');
    }

    // --- Game Over ---
    triggerGameOver() {
      this.isGameOver = true;
      window.soundEngine.playGameOver();

      this.finalScoreEl.textContent = this.score;
      this.finalBestEl.textContent = this.highScore;

      if (this.score >= this.highScore && this.score > 0) {
        this.newRecordBadgeEl.classList.remove('hidden');
      } else {
        this.newRecordBadgeEl.classList.add('hidden');
      }

      setTimeout(() => {
        this.gameOverModalEl.classList.remove('hidden');
      }, 500);
    }

    // --- Drag and Drop & Touch Handling ---
    bindEvents() {
      // Sound Toggle
      this.soundToggleBtn.addEventListener('click', () => {
        const isMuted = window.soundEngine.toggleMute();
        this.soundIconEl.textContent = isMuted ? '🔇' : '🔊';
      });

      // Restart Buttons
      this.restartBtn.addEventListener('click', () => {
        window.soundEngine.playClick();
        this.startNewGame();
      });

      this.modalRestartBtn.addEventListener('click', () => {
        window.soundEngine.playClick();
        this.startNewGame();
      });

      // Pointer interactions on dock slots
      this.slotEls.forEach((slotEl, slotIndex) => {
        slotEl.addEventListener('pointerdown', (e) => this.onSlotPointerDown(e, slotIndex));
      });

      window.addEventListener('pointermove', (e) => this.onWindowPointerMove(e));
      window.addEventListener('pointerup', (e) => this.onWindowPointerUp(e));
      window.addEventListener('pointercancel', (e) => this.onWindowPointerCancel(e));

      // Board hover & click events (for tap-to-place mode)
      this.boardEl.addEventListener('pointermove', (e) => this.onBoardPointerMove(e));
      this.boardEl.addEventListener('pointerleave', () => {
        if (!this.isDragging) this.clearGhostHighlights();
      });
      this.boardEl.addEventListener('click', (e) => this.onBoardClick(e));
    }

    updateSoundIcon() {
      this.soundIconEl.textContent = window.soundEngine.isMuted ? '🔇' : '🔊';
    }

    onSlotPointerDown(e, slotIndex) {
      if (this.isGameOver || this.isClearingAnimation) return;

      const piece = this.dock[slotIndex];
      if (!piece) return;

      // Audio trigger on user gesture
      window.soundEngine.init();

      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
      this.draggedSlot = slotIndex;
      this.draggedPiece = piece;
      this.isDragging = false;

      // Touch offset for mobile (so finger doesn't block the piece)
      const isTouch = e.pointerType === 'touch';
      this.touchOffsetY = isTouch ? 65 : 0;
    }

    setupDragGhost(piece) {
      this.dragGhostEl.innerHTML = '';
      this.dragGhostEl.classList.remove('hidden');

      const rows = piece.matrix.length;
      const cols = piece.matrix[0].length;
      const boardRect = this.boardEl.getBoundingClientRect();
      const cellSize = Math.floor(boardRect.width / BOARD_SIZE) - 5;

      this.dragGhostEl.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
      this.dragGhostEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tile = document.createElement('div');
          tile.style.width = `${cellSize}px`;
          tile.style.height = `${cellSize}px`;
          if (piece.matrix[r][c] === 1) {
            tile.className = `block-tile ${piece.color}`;
          } else {
            tile.style.visibility = 'hidden';
          }
          this.dragGhostEl.appendChild(tile);
        }
      }
    }

    updateDragGhostPosition(clientX, clientY) {
      const targetY = clientY - this.touchOffsetY;
      this.dragGhostEl.style.left = `${clientX}px`;
      this.dragGhostEl.style.top = `${targetY}px`;
    }

    onWindowPointerMove(e) {
      if (!this.draggedPiece) return;

      const dist = Math.hypot(e.clientX - this.pointerStartX, e.clientY - this.pointerStartY);

      if (!this.isDragging && dist > 7) {
        // Drag officially began!
        this.isDragging = true;
        window.soundEngine.playPickup();
        this.setupDragGhost(this.draggedPiece);
        this.slotEls[this.draggedSlot].style.opacity = '0.3';

        // Clear any previous selection
        this.clearSelection();
      }

      if (this.isDragging) {
        this.updateDragGhostPosition(e.clientX, e.clientY);
        this.updateBoardGhostHighlight(e.clientX, e.clientY - this.touchOffsetY, this.draggedPiece);
      }
    }

    updateBoardGhostHighlight(targetX, targetY, piece) {
      this.clearGhostHighlights();

      const boardRect = this.boardEl.getBoundingClientRect();
      const cellWidth = boardRect.width / BOARD_SIZE;
      const cellHeight = boardRect.height / BOARD_SIZE;

      const rows = piece.matrix.length;
      const cols = piece.matrix[0].length;
      const piecePixelWidth = cols * cellWidth;
      const piecePixelHeight = rows * cellHeight;

      // Align piece center with cursor/pointer
      const pieceLeft = targetX - (piecePixelWidth / 2);
      const pieceTop = targetY - (piecePixelHeight / 2);

      const col = Math.round((pieceLeft - boardRect.left) / cellWidth);
      const row = Math.round((pieceTop - boardRect.top) / cellHeight);

      if (this.canPlacePiece(piece, row, col)) {
        this.hoverGridPos = { row, col };
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (piece.matrix[r][c] === 1) {
              const cellEl = this.getCellElement(row + r, col + c);
              if (cellEl) {
                cellEl.classList.add('ghost-valid', piece.color);
              }
            }
          }
        }
      } else {
        this.hoverGridPos = null;
      }
    }

    clearGhostHighlights() {
      const ghostCells = this.boardEl.querySelectorAll('.ghost-valid');
      ghostCells.forEach(cell => {
        cell.classList.remove('ghost-valid');
        const r = parseInt(cell.dataset.row, 10);
        const c = parseInt(cell.dataset.col, 10);
        if (!this.board[r][c]) {
          COLOR_PALETTES.forEach(color => cell.classList.remove(color));
        }
      });
    }

    onWindowPointerUp(e) {
      if (this.draggedSlot === null) return;

      const slotIndex = this.draggedSlot;
      const piece = this.draggedPiece;

      if (!this.isDragging) {
        // Tap / Click detected on slot! Toggle selection mode
        if (this.selectedSlot === slotIndex) {
          this.clearSelection();
        } else {
          this.selectSlot(slotIndex);
        }
      } else {
        // Drag released!
        this.dragGhostEl.classList.add('hidden');
        this.slotEls[slotIndex].style.opacity = '1';

        if (this.hoverGridPos && this.canPlacePiece(piece, this.hoverGridPos.row, this.hoverGridPos.col)) {
          const { row, col } = this.hoverGridPos;
          this.clearGhostHighlights();

          this.dock[slotIndex] = null;
          this.slotEls[slotIndex].innerHTML = '';
          this.slotEls[slotIndex].classList.add('empty');
          this.clearSelection();

          this.placePiece(piece, row, col);
        } else {
          this.clearGhostHighlights();
        }
      }

      this.draggedPiece = null;
      this.draggedSlot = null;
      this.isDragging = false;
      this.hoverGridPos = null;
    }

    onWindowPointerCancel() {
      if (this.draggedSlot !== null) {
        this.slotEls[this.draggedSlot].style.opacity = '1';
      }
      this.dragGhostEl.classList.add('hidden');
      this.clearGhostHighlights();
      this.draggedPiece = null;
      this.draggedSlot = null;
      this.isDragging = false;
      this.hoverGridPos = null;
    }

    // --- Tap-To-Place Support ---
    selectSlot(slotIndex) {
      this.clearSelection();
      this.selectedSlot = slotIndex;
      this.slotEls[slotIndex].classList.add('selected');
      window.soundEngine.playPickup();
    }

    clearSelection() {
      this.selectedSlot = null;
      this.slotEls.forEach(s => s.classList.remove('selected'));
      this.clearGhostHighlights();
    }

    onBoardPointerMove(e) {
      // In tap-to-place mode: preview piece on board hover
      if (this.selectedSlot !== null && !this.isDragging) {
        const piece = this.dock[this.selectedSlot];
        if (piece) {
          this.updateBoardGhostHighlight(e.clientX, e.clientY, piece);
        }
      }
    }

    onBoardClick(e) {
      if (this.isGameOver || this.isClearingAnimation) return;

      if (this.selectedSlot !== null) {
        const piece = this.dock[this.selectedSlot];
        if (!piece) return;

        // Determine target position from click
        const cell = e.target.closest('.cell');
        let targetRow = this.hoverGridPos ? this.hoverGridPos.row : -1;
        let targetCol = this.hoverGridPos ? this.hoverGridPos.col : -1;

        if (cell && (targetRow === -1 || !this.canPlacePiece(piece, targetRow, targetCol))) {
          targetRow = parseInt(cell.dataset.row, 10);
          targetCol = parseInt(cell.dataset.col, 10);
        }

        if (targetRow !== -1 && this.canPlacePiece(piece, targetRow, targetCol)) {
          const slot = this.selectedSlot;
          this.dock[slot] = null;
          this.slotEls[slot].innerHTML = '';
          this.slotEls[slot].classList.add('empty');
          this.clearSelection();

          this.placePiece(piece, targetRow, targetCol);
        }
      }
    }
  }

  // --- Start Game on Page Load ---
  window.addEventListener('DOMContentLoaded', () => {
    window.game = new BlockBlastGame();
  });
})();
