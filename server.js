const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set up multer storage for audio files
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const audioDir = path.join(__dirname, 'audio');
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);
    cb(null, audioDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: audioStorage });

app.get('/api/data', async (req, res) => {
  try {
    // Read data from data.json
    const data = await fs.promises.readFile('./data.json', 'utf-8');
    const jsonData = JSON.parse(data);

    // Read transcription data from audioText.json
    const audioTextData = await fs.promises.readFile('./audioText.json', 'utf-8');
    const transcriptionData = JSON.parse(audioTextData);

    // Combine both audio data and transcription text for each audio entry
    Object.keys(jsonData.audio).forEach((key) => {
      // If transcription exists, append it to the corresponding entry in data
      if (transcriptionData[key]) {
        jsonData.audio[key] = {
          ...jsonData.audio[key],
          transcription: transcriptionData[key]
        };
      }
    });

    // Send the updated data with transcriptions appended
    res.json(jsonData);
  } catch (err) {
    console.error('Error reading files:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/api/data', (req, res) => {
  fs.writeFile('./data.json', JSON.stringify(req.body, null, 2), err => {
    if (err) return res.status(500).send('Error saving data');
    res.send('Data saved');
  });
});

app.get('/api/questions', (req, res) => {
  fs.readFile('./questions.json', 'utf-8', (err, data) => {
    if (err) return res.status(500).send('Error loading questions');
    res.json(JSON.parse(data));
  });
});

app.use('/audio', express.static(path.join(__dirname, 'audio')));

app.post('/api/upload-audio', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');

  const originalPath = path.join(__dirname, 'audio', req.file.filename);
  const originalName = path.parse(req.file.originalname).name;  // Key
  const basePath = path.join(path.dirname(originalPath), `${req.file.filename}`);
  const wavPath = `${basePath}.wav`;
  const outputTextPath = `${basePath}.txt`;
  const savedPath = `/audio/${req.file.filename}`;

  try {
    // Convert the audio file to WAV format
    const ffmpegCmd = `ffmpeg -y -i "${originalPath}" "${wavPath}"`;
    console.log(`Running: ${ffmpegCmd}`);
    await execPromise(ffmpegCmd);

    // Run whisper model to get the transcription from audio
    const whisperCmd = `/Users/mac/Documents/projects/roadmap/whisper.cpp/build/bin/whisper-cli -m "/Users/mac/Documents/projects/roadmap/whisper.cpp/models/ggml-base.en.bin" -f "${wavPath}" -otxt -of "${basePath}"`;
    console.log(`Running: ${whisperCmd}`);
    await execPromise(whisperCmd);

    // Read the transcription text
    const transcript = await fs.promises.readFile(outputTextPath, 'utf-8');

    // Read the existing data.json file (for audio metadata), or start fresh if it doesn't exist
    let jsonData = { audio: {}, completed: {}, answers: {} };
    try {
      const data = await fs.promises.readFile('./data.json', 'utf-8');
      jsonData = JSON.parse(data);
    } catch (err) {
      console.log('data.json missing or invalid, starting fresh.');
    }

    // Save the audio metadata (audio path) in data.json
    jsonData.audio[originalName] = savedPath;

    // Write updated audio metadata to data.json
    await fs.promises.writeFile('./data.json', JSON.stringify(jsonData, null, 2));
    console.log(`✅ Audio saved for ID: ${originalName}`);
    console.log(savedPath);

    // Read the existing audioText.json file (for transcriptions), or start fresh if it doesn't exist
    let audioTextData = {};
    try {
      const audioTextFile = await fs.promises.readFile('./audioText.json', 'utf-8');
      audioTextData = JSON.parse(audioTextFile);
    } catch (err) {
      console.log('audioText.json missing or invalid, starting fresh.');
    }

    // Save the transcription text in audioText.json
    audioTextData[originalName] = transcript.trim();

    // Write updated transcription text to audioText.json
    await fs.promises.writeFile('./audioText.json', JSON.stringify(audioTextData, null, 2));
    console.log(`✅ Transcription saved for ID: ${originalName}`);

    // Send response with the saved audio path and transcription text
    res.json({ path: savedPath, text: transcript.trim() });

  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).send('Internal server error');
  }
});


function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

app.post('/api/prune-audio', (req, res) => {
  pruneAudioFiles();
  res.send('Pruning process started...');
});

function pruneAudioFiles() {
  fs.readFile('./data.json', 'utf-8', (err, data) => {
    if (err) return console.error('Error reading data.json:', err);
    const dataJson = JSON.parse(data);
    const referencedAudioFiles = new Set(Object.values(dataJson.audio || {}));
    const audioDir = path.join(__dirname, 'audio');

    fs.readdir(audioDir, (err, files) => {
      if (err) return console.error('Error reading audio directory:', err);

      files.forEach(file => {
        const filePath = path.join(audioDir, file);
        if (!referencedAudioFiles.has(`/audio/${file}`)) {
          fs.unlink(filePath, err => {
            if (err) console.error('Error deleting file:', err);
            else console.log(`Deleted unreferenced audio file: ${file}`);
          });
        }
      });
    });
  });
}

app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
