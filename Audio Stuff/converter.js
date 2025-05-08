document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('convertButton').addEventListener('click', () => {
    const format = document.getElementById('outputFormat').value;
    const audioPlayer = document.getElementById('audioPlayer');
    const videoPlayer = document.getElementById('videoPlayer');
    const convertedFileDiv = document.getElementById('convertedFile');

    // Check if video is playing and convert accordingly
    const mediaPlayer = audioPlayer.style.display === 'block' ? audioPlayer : videoPlayer;

    const blob = new Blob([mediaPlayer.src], { type: mediaPlayer instanceof HTMLVideoElement ? `video/${format}` : `audio/${format}` });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `converted-file.${format}`;
    downloadLink.click();

    convertedFileDiv.innerHTML = `Conversion to ${format} triggered. File will be downloaded automatically.`;
  });
});