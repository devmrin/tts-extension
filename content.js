// TTS state
let currentUtterance = null;
let currentText = '';
let isPaused = false;
let isPlaying = false;
let currentElement = null;
let currentSpeed = 1.5;
let currentCharIndex = 0;
let playerWidget = null;

// Highlight the current word being spoken and its surrounding line
function highlightText(element, charIndex, length) {
  if (!element || !element.textContent) return;
  
  // Remove previous highlights
  const existingHighlight = document.querySelector('.tts-highlight');
  const existingLineHighlight = document.querySelector('.tts-line-highlight');
  
  if (existingHighlight) {
    const parent = existingHighlight.parentNode;
    parent.replaceChild(document.createTextNode(existingHighlight.textContent), existingHighlight);
    parent.normalize();
  }
  
  if (existingLineHighlight) {
    const parent = existingLineHighlight.parentNode;
    parent.replaceChild(document.createTextNode(existingLineHighlight.textContent), existingLineHighlight);
    parent.normalize();
  }
  
  const text = element.textContent;
  
  // Find the line boundaries (5-10 word groups)
  const words = text.split(' ');
  let currentWordIndex = 0;
  let currentCharPos = 0;
  
  // Find which word we're currently at
  for (let i = 0; i < words.length; i++) {
    if (currentCharPos + words[i].length + (i > 0 ? 1 : 0) > charIndex) {
      currentWordIndex = i;
      break;
    }
    currentCharPos += words[i].length + (i > 0 ? 1 : 0);
  }
  
  // Calculate line boundaries (5-10 words around current word)
  const lineStart = Math.max(0, currentWordIndex - 2);
  const lineEnd = Math.min(words.length, currentWordIndex + 8);
  
  // Calculate character positions for the line
  let lineStartChar = 0;
  let lineEndChar = 0;
  
  for (let i = 0; i < lineStart; i++) {
    lineStartChar += words[i].length + (i > 0 ? 1 : 0);
  }
  
  for (let i = 0; i < lineEnd; i++) {
    lineEndChar += words[i].length + (i > 0 ? 1 : 0);
  }
  
  // Create line highlight (subtle background)
  const beforeLine = text.substring(0, lineStartChar);
  const lineText = text.substring(lineStartChar, lineEndChar);
  const afterLine = text.substring(lineEndChar);
  
  const lineSpan = document.createElement('span');
  lineSpan.className = 'tts-line-highlight';
  lineSpan.textContent = lineText;
  
  // Create word highlight (bright highlight)
  const before = text.substring(0, charIndex);
  const highlight = text.substring(charIndex, charIndex + length);
  const after = text.substring(charIndex + length);
  
  const wordSpan = document.createElement('span');
  wordSpan.className = 'tts-highlight';
  wordSpan.textContent = highlight;
  
  // Rebuild the element with both highlights
  element.textContent = '';
  element.appendChild(document.createTextNode(beforeLine));
  element.appendChild(lineSpan);
  element.appendChild(document.createTextNode(afterLine));
  
  // Insert word highlight within the line highlight
  const lineTextBefore = lineText.substring(0, charIndex - lineStartChar);
  const lineTextAfter = lineText.substring(charIndex - lineStartChar + length);
  
  lineSpan.textContent = lineTextBefore;
  lineSpan.appendChild(wordSpan);
  lineSpan.appendChild(document.createTextNode(lineTextAfter));
  
  // Auto-scroll to keep highlighted line in view
  scrollToHighlight(lineSpan);
}

// Smooth scroll to keep highlighted text in viewport
function scrollToHighlight(highlightElement) {
  if (!highlightElement) return;
  
  const rect = highlightElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  // Check if element is out of viewport
  const isOutOfView = rect.bottom < 0 || rect.top > viewportHeight || 
                     rect.right < 0 || rect.left > viewportWidth;
  
  if (isOutOfView) {
    // Calculate scroll position to center the element
    const elementTop = highlightElement.offsetTop;
    const elementHeight = rect.height;
    const scrollTop = elementTop - (viewportHeight / 2) + (elementHeight / 2);
    
    // Smooth scroll to the calculated position
    window.scrollTo({
      top: Math.max(0, scrollTop),
      behavior: 'smooth'
    });
  }
}

// Clear highlights
function clearHighlights() {
  const highlights = document.querySelectorAll('.tts-highlight, .tts-line-highlight');
  highlights.forEach(h => {
    const parent = h.parentNode;
    parent.replaceChild(document.createTextNode(h.textContent), h);
    parent.normalize();
  });
}

// Show player widget
function showPlayerWidget() {
  if (!playerWidget) {
    createPlayerWidget();
  }
  if (playerWidget) {
    playerWidget.style.display = 'block';
    updatePlayerState();
  }
}

// Hide player widget
function hidePlayerWidget() {
  if (playerWidget) {
    // Stop any current playback
    if (isPlaying || isPaused) {
      stopTTS();
    }
    playerWidget.style.display = 'none';
  }
}

// Create persistent floating player widget
function createPlayerWidget() {
  if (playerWidget) return;
  
  playerWidget = document.createElement('div');
  playerWidget.id = 'tts-player-widget';
  playerWidget.innerHTML = `
    <div class="tts-player">
      <div class="tts-header">
        <span class="tts-title">TTS Reader</span>
        <button id="tts-dismiss" class="tts-dismiss">×</button>
      </div>
      <div class="tts-status" id="tts-status">No text selected</div>
      <div class="tts-controls">
        <button id="tts-play" disabled>▶</button>
        <button id="tts-pause" disabled>⏸</button>
        <button id="tts-stop" disabled>⏹</button>
      </div>
      <div class="tts-voice">
        <label>Voice:</label>
        <select id="tts-voice-select" disabled>
          <option value="">Loading voices...</option>
        </select>
      </div>
      <div class="tts-speed">
        <label>Speed:</label>
        <input type="range" id="tts-speed-slider" min="0.5" max="2.5" step="0.1" value="1.5" disabled>
        <span id="tts-speed-value">1.5x</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(playerWidget);
  
  // Add event listeners
  setupPlayerEventListeners();
  
  // Populate voice dropdown
  populateVoiceDropdown();
}

// Setup player event listeners
function setupPlayerEventListeners() {
  const playBtn = document.getElementById('tts-play');
  const pauseBtn = document.getElementById('tts-pause');
  const stopBtn = document.getElementById('tts-stop');
  const dismissBtn = document.getElementById('tts-dismiss');
  const speedSlider = document.getElementById('tts-speed-slider');
  const speedValue = document.getElementById('tts-speed-value');
  const voiceSelect = document.getElementById('tts-voice-select');
  
  playBtn.addEventListener('click', playTTS);
  pauseBtn.addEventListener('click', pauseTTS);
  stopBtn.addEventListener('click', stopTTS);
  
  // Dismiss button functionality
  dismissBtn.addEventListener('click', () => {
    hidePlayerWidget();
  });
  
  speedSlider.addEventListener('input', (e) => {
    const newSpeed = parseFloat(e.target.value);
    currentSpeed = newSpeed;
    speedValue.textContent = `${currentSpeed}x`;
    
    // Update rate for future speech only (not during current speech)
    if (currentUtterance && !isPlaying && !isPaused) {
      currentUtterance.rate = currentSpeed;
    }
  });
  
  voiceSelect.addEventListener('change', (e) => {
    // Don't allow voice changes during speech
    if (isPlaying || isPaused) {
      e.preventDefault();
      return;
    }
    
    const selectedVoice = e.target.value;
    if (selectedVoice && currentUtterance) {
      const voices = speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === selectedVoice);
      if (voice) {
        currentUtterance.voice = voice;
      }
    }
  });
}

// Populate voice dropdown
function populateVoiceDropdown() {
  const voiceSelect = document.getElementById('tts-voice-select');
  if (!voiceSelect) return;
  
  const voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = '';
  
  if (voices.length === 0) {
    voiceSelect.innerHTML = '<option value="">Loading voices...</option>';
    return;
  }
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Default Voice';
  voiceSelect.appendChild(defaultOption);
  
  // Add voice options
  voices.forEach(voice => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });
  
  voiceSelect.disabled = false;
}

// Update player widget state
function updatePlayerState() {
  if (!playerWidget) return;
  
  const statusEl = document.getElementById('tts-status');
  const playBtn = document.getElementById('tts-play');
  const pauseBtn = document.getElementById('tts-pause');
  const stopBtn = document.getElementById('tts-stop');
  const quickPlayBtn = document.getElementById('tts-quick-play');
  const speedSlider = document.getElementById('tts-speed-slider');
  const voiceSelect = document.getElementById('tts-voice-select');
  
  // Update status text
  if (currentText) {
    const shortText = currentText.length > 50 ? currentText.substring(0, 50) + '...' : currentText;
    statusEl.textContent = `Selected: ${shortText}`;
  } else {
    statusEl.textContent = 'No text selected';
  }
  
  // Enable/disable controls based on text selection
  const hasText = currentText && currentText.trim().length > 0;
  playBtn.disabled = !hasText || isPlaying;
  pauseBtn.disabled = !hasText || !isPlaying;
  stopBtn.disabled = !hasText || (!isPlaying && !isPaused);
  
  // Update quick play button icon and state (now in the text content)
  if (quickPlayBtn) {
    quickPlayBtn.disabled = !hasText;
    if (hasText) {
      if (isPlaying) {
        quickPlayBtn.textContent = '⏸';
        quickPlayBtn.title = 'Pause';
      } else {
        quickPlayBtn.textContent = '▶';
        quickPlayBtn.title = 'Play';
      }
    }
  }
  
  // Speed slider should be disabled during speech and pause
  speedSlider.disabled = !hasText || isPlaying || isPaused;
  
  // Voice selection is disabled during speech or when no text selected
  voiceSelect.disabled = !hasText || isPlaying || isPaused;
  
  // Update button states for playback
  if (isPlaying) {
    playBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
  } else if (isPaused) {
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = false;
  }
}

// Update status (legacy function for compatibility)
function updateStatus(status, playing = false, paused = false) {
  updatePlayerState();
}

// Stop TTS
function stopTTS() {
  if (currentUtterance) {
    speechSynthesis.cancel();
    currentUtterance = null;
  }
  clearHighlights();
  isPlaying = false;
  isPaused = false;
  currentCharIndex = 0;
  updatePlayerState();
}

// Play TTS
function playTTS() {
  if (!currentText) {
    updatePlayerState();
    return;
  }
  
  if (isPaused) {
    // When resuming, ensure the current utterance has the updated speed
    if (currentUtterance) {
      currentUtterance.rate = currentSpeed;
    }
    speechSynthesis.resume();
    isPaused = false;
    isPlaying = true;
    updatePlayerState();
    return;
  }
  
  // Check if voices are available
  const voices = speechSynthesis.getVoices();
  
  if (voices.length === 0) {
    // Try to trigger voice loading
    speechSynthesis.getVoices();
  }
  
  // Cancel any existing speech
  speechSynthesis.cancel();
  
  // Create new utterance
  currentUtterance = new SpeechSynthesisUtterance(currentText);
  currentUtterance.rate = currentSpeed;
  currentUtterance.volume = 1.0;
  currentUtterance.pitch = 1.0;
  
  // Set voice from dropdown if selected
  const voiceSelect = document.getElementById('tts-voice-select');
  if (voiceSelect && voiceSelect.value && voices.length > 0) {
    const selectedVoice = voices.find(v => v.name === voiceSelect.value);
    if (selectedVoice) {
      currentUtterance.voice = selectedVoice;
    }
  }
  
  // Track word boundaries for highlighting
  currentUtterance.onboundary = (event) => {
    if (event.name === 'word' && currentElement) {
      currentCharIndex = event.charIndex;
      const word = currentText.substring(event.charIndex).split(' ')[0];
      highlightText(currentElement, event.charIndex, word.length);
    }
  };
  
  currentUtterance.onstart = () => {
    isPlaying = true;
    isPaused = false;
    updatePlayerState();
  };
  
  currentUtterance.onend = () => {
    isPlaying = false;
    isPaused = false;
    clearHighlights();
    updatePlayerState();
  };
  
  currentUtterance.onerror = (event) => {
    isPlaying = false;
    isPaused = false;
    
    // Handle different error types gracefully
    switch (event.error) {
      case 'interrupted':
        // Speech was interrupted (user stopped, new speech started, etc.)
        // This is normal behavior - just reset state silently
        updatePlayerState();
        return;
        
      case 'not-allowed':
        // Browser blocked speech (user interaction required)
        // Reset state and let user try again
        updatePlayerState();
        return;
        
      case 'audio-busy':
        // Audio system is busy
        // Reset state and let user try again
        updatePlayerState();
        return;
        
      default:
        // Other errors - reset state silently
        updatePlayerState();
        return;
    }
  };
  
  // Start speaking
  speechSynthesis.speak(currentUtterance);
}

// Pause TTS
function pauseTTS() {
  if (isPlaying) {
    speechSynthesis.pause();
    isPaused = true;
    isPlaying = false;
    updatePlayerState();
  }
}

// Handle clicks on page elements
document.addEventListener('click', (e) => {
  // Don't capture clicks on our TTS widget
  if (e.target.closest('#tts-player-widget')) {
    return;
  }
  
  // Don't capture clicks on the quick play button
  if (e.target.id === 'tts-quick-play' || e.target.closest('#tts-quick-play')) {
    return;
  }
  
  // Only capture if the element has text content
  const element = e.target;
  const text = element.textContent?.trim();
  
  if (text && text.length > 0) {
    // Stop any current playback
    if (isPlaying || isPaused) {
      stopTTS();
    }
    
    // Clear previous selection highlight
    clearSelectionHighlight();
    
    // Set new selection
    currentText = text;
    currentElement = element;
    
    // Add visual feedback for selected text
    addSelectionHighlight(element);
    
    // Update player state
    updatePlayerState();
  }
}, true);

// Add visual highlight for selected text
function addSelectionHighlight(element) {
  if (!element) return;
  
  // Remove any existing selection highlight
  clearSelectionHighlight();
  
  // Add selection highlight class
  element.classList.add('tts-selected');
  
  // Add quick play button at the beginning of the text
  addQuickPlayButton(element);
}

// Add quick play button to the beginning of selected text
function addQuickPlayButton(element) {
  // Remove any existing quick play button
  removeQuickPlayButton();
  
  // Create quick play button
  const quickPlayBtn = document.createElement('button');
  quickPlayBtn.id = 'tts-quick-play';
  quickPlayBtn.className = 'tts-quick-play-btn';
  quickPlayBtn.textContent = '▶';
  quickPlayBtn.title = 'Play';
  quickPlayBtn.disabled = false;
  
  // Add event listener for the quick play button
  quickPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering the text selection
    if (isPlaying) {
      pauseTTS();
    } else {
      playTTS();
    }
  });
  
  // Insert the button at the beginning of the element
  element.insertBefore(quickPlayBtn, element.firstChild);
}

// Remove quick play button
function removeQuickPlayButton() {
  const existingBtn = document.getElementById('tts-quick-play');
  if (existingBtn) {
    existingBtn.remove();
  }
}

// Clear selection highlight
function clearSelectionHighlight() {
  const selected = document.querySelector('.tts-selected');
  if (selected) {
    selected.classList.remove('tts-selected');
  }
  
  // Also remove the quick play button
  removeQuickPlayButton();
}

// Initialize the player widget when content script loads
function initializePlayer() {
  // Check if speech synthesis is available
  if (!('speechSynthesis' in window)) {
    return;
  }
  
  // Load voices and wait for them to be available
  loadVoices();
  
  // Don't create widget automatically - wait for extension icon click
}

// Load and wait for voices to be available
function loadVoices() {
  const voices = speechSynthesis.getVoices();
  
  if (voices.length === 0) {
    // Wait for voices to load
    speechSynthesis.onvoiceschanged = () => {
      speechSynthesis.onvoiceschanged = null; // Remove the listener
    };
    
    // Fallback: try again after a delay
    setTimeout(() => {
      const voicesAfterDelay = speechSynthesis.getVoices();
      if (voicesAfterDelay.length > 0) {
        // Voices loaded successfully
      }
    }, 1000);
  }
}

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch(message.action) {
    case 'toggle':
      // Toggle widget visibility when extension icon is clicked
      if (playerWidget && playerWidget.style.display !== 'none') {
        hidePlayerWidget();
      } else {
        showPlayerWidget();
      }
      break;
    case 'getStatus':
      sendResponse({
        status: currentText ? `Selected: ${currentText.substring(0, 50)}${currentText.length > 50 ? '...' : ''}` : 'No text selected',
        playing: isPlaying,
        paused: isPaused
      });
      break;
  }
  return true;
});

// Initialize when content script loads (but don't create widget)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePlayer);
} else {
  initializePlayer();
}