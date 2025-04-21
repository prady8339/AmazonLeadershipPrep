const express = require('express');
const fs = require('fs');
const path = require('path');
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
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir);
    }
    cb(null, audioDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: audioStorage });

// API to get saved personal notes
app.get('/api/data', (req, res) => {
  fs.readFile('./data.json', 'utf-8', (err, data) => {
    if (err) {
      return res.json({ answers: {}, completed: {}, audio: {} });
    }
    res.json(JSON.parse(data));
  });
});

// API to save personal notes
app.post('/api/data', (req, res) => {
  fs.writeFile('./data.json', JSON.stringify(req.body, null, 2), err => {
    if (err) return res.status(500).send('Error saving data');
    res.send('Data saved');
  });
});

// API to serve the questions.json
app.get('/api/questions', (req, res) => {
  fs.readFile('./questions.json', 'utf-8', (err, data) => {
    if (err) {
      return res.status(500).send('Error loading questions');
    }
    res.json(JSON.parse(data));
  });
});

app.use('/audio', express.static(path.join(__dirname, 'audio')));

// API to upload audio files
app.post('/api/upload-audio', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }
  const filePath = `/audio/${req.file.filename}`; // Store the relative path
  res.json({ path: filePath });
});
/*
curl -X POST http://localhost:3000/api/prune-audio
*/

app.post('/api/prune-audio', (req, res) => {
  pruneAudioFiles(); // Call the pruning function manually
  res.send('Pruning process started...');
});


function pruneAudioFiles() {
  fs.readFile('./data.json', 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading data.json:', err);
      return;
    }

    const dataJson = JSON.parse(data);
    const referencedAudioFiles = new Set(Object.values(dataJson.audio || {}));
    const audioDir = path.join(__dirname, 'audio');

    fs.readdir(audioDir, (err, files) => {
      if (err) {
        console.error('Error reading audio directory:', err);
        return;
      }

      files.forEach(file => {
        const filePath = path.join(audioDir, file);

        // If the audio file is not referenced, delete it
        if (!referencedAudioFiles.has(`/audio/${file}`)) {
          fs.unlink(filePath, err => {
            if (err) {
              console.error('Error deleting file:', err);
            } else {
              console.log(`Deleted unreferenced audio file: ${file}`);
            }
          });
        }
      });
    });
  });
}


// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
