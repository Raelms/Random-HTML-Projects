document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const audioPlayer = document.getElementById('audioPlayer');
  const videoPlayer = document.getElementById('videoPlayer');
  const fileInfo = document.getElementById('fileInfo');
  const metadataDiv = document.getElementById('metadata');
  const dropZone = document.getElementById('dropZone');
  const playbackRateSlider = document.getElementById('playbackRate');
  const rateLabel = document.getElementById('rateLabel');

  let audioCtx = null;
  let analyser = null;
  let animationId = null;

  const waveform = WaveSurfer.create({
    container: '#waveform',
    waveColor: 'violet',
    progressColor: 'purple',
    interact: false,
    backend: 'MediaElement',
    mediaControls: false,
    media: audioPlayer
  });

  // --- ACCESSIBILITY
  dropZone.setAttribute('role', 'button');
  dropZone.setAttribute('tabindex', '0');
  dropZone.setAttribute('aria-label', 'Drop audio or video files here');

  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });

  // --- DRAG & DROP HANDLING
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  // --- FILE HANDLING
  function handleFiles(fileList) {
    if (!fileList || !fileList.length) return;
    const files = Array.from(fileList);

    fileInfo.innerHTML = '';
    files.forEach((file, index) => {
      const fileItem = document.createElement('button');
      fileItem.textContent = file.name;
      fileItem.className = 'file-button';
      fileItem.setAttribute('aria-label', `Play file: ${file.name}`);
      fileItem.addEventListener('click', () => loadFile(file));
      fileInfo.appendChild(fileItem);

      // Auto-load first file
      if (index === 0) loadFile(file);
    });
  }

  // --- LOAD FILE
  async function loadFile(file) {
    const url = URL.createObjectURL(file);
    const isAudio = file.type.startsWith('audio');
    const isVideo = file.type.startsWith('video');

    if (isAudio) {
      audioPlayer.src = url;
      audioPlayer.style.display = 'block';
      videoPlayer.style.display = 'none';
      waveform.load(url);
    } else if (isVideo) {
      videoPlayer.src = url;
      videoPlayer.style.display = 'block';
      audioPlayer.style.display = 'none';
    }

    // Display metadata
    fileInfo.innerHTML = `
      <p><strong>File:</strong> ${file.name}</p>
      <p><strong>Size:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
    `;

    new jsmediatags.Reader(file).read({
      onSuccess: ({ tags }) => {
        const data = {
          title: tags.title || tags["©nam"] || "N/A",
          artist: tags.artist || "N/A",
          album: tags.album || "N/A",
          encodingTool: tags["©too"] || "Unknown",
          description: tags.description || "No Description"
        };
        metadataDiv.textContent = JSON.stringify(data, null, 2);
      },
      onError: (err) => {
        metadataDiv.textContent = 'Failed to read metadata: ' + err.message;
      }
    });

    if (isAudio) {
      const buffer = await file.arrayBuffer();
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(buffer);
      drawSpectrogram(audioBuffer);
    }
  }

  // --- DRAW SPECTROGRAM
  function drawSpectrogram(audioBuffer) {
    const canvas = document.getElementById('spectrogramCanvas');
    const ctx = canvas.getContext('2d');
    const data = audioBuffer.getChannelData(0);
    const step = 512;

    canvas.width = Math.ceil(data.length / step);
    canvas.height = 100;

    for (let i = 0; i < data.length; i += step) {
      const slice = data.slice(i, i + step);
      const avg = slice.reduce((sum, val) => sum + Math.abs(val), 0) / step;
      const intensity = Math.min(255, Math.floor(avg * 5000));
      ctx.fillStyle = `rgb(${intensity}, 0, 0)`;
      ctx.fillRect(i / step, 0, 1, canvas.height);
    }
  }

  // --- SETUP FREQUENCY ANALYSIS
  function setupFrequencyAnalyzer() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!analyser) {
      const source = audioCtx.createMediaElementSource(audioPlayer);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;

      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    }

    const canvas = document.getElementById('frequencyCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 100;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i];
        ctx.fillStyle = 'lime';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    }

    draw();
  }

  // --- PLAYBACK EVENTS
  audioPlayer.addEventListener('play', async () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    setupFrequencyAnalyzer();
  });

  audioPlayer.addEventListener('pause', () => {
    cancelAnimationFrame(animationId);
  });

  // --- PLAYBACK RATE CONTROL
  playbackRateSlider.addEventListener('input', (e) => {
    const rate = parseFloat(e.target.value);
    rateLabel.textContent = `${rate.toFixed(1)}x`;
    if (audioPlayer.style.display === 'block') {
      audioPlayer.playbackRate = rate;
    } else if (videoPlayer.style.display === 'block') {
      videoPlayer.playbackRate = rate;
    }
  });
});