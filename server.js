const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    const data = await fs.promises.readFile('./data.json', 'utf-8');
    const jsonData = JSON.parse(data);

    const audioTextData = await fs.promises.readFile('./audioText.json', 'utf-8');
    const transcriptionData = JSON.parse(audioTextData);

    jsonData.transcription = {};

    Object.keys(jsonData.audio).forEach((key) => {
      if (transcriptionData[key]) {
        jsonData.transcription[key] = transcriptionData[key];
      }
    });

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
  const originalName = path.parse(req.file.originalname).name;
  const basePath = path.join(path.dirname(originalPath), `${req.file.filename}`);
  const wavPath = `${basePath}.wav`;
  const outputTextPath = `${basePath}.txt`;
  const savedPath = `/audio/${req.file.filename}`;

  try {
    const ffmpegCmd = `ffmpeg -y -i "${originalPath}" "${wavPath}"`;
    console.log(`Running: ${ffmpegCmd}`);
    await execPromise(ffmpegCmd);

    const whisperCmd = `/Users/mac/Documents/projects/roadmap/whisper.cpp/build/bin/whisper-cli -m "/Users/mac/Documents/projects/roadmap/whisper.cpp/models/ggml-base.en.bin" -f "${wavPath}" -otxt -of "${basePath}"`;
    console.log(`Running: ${whisperCmd}`);
    await execPromise(whisperCmd);

    const transcript = await fs.promises.readFile(outputTextPath, 'utf-8');

    let jsonData = { audio: {}, completed: {}, answers: {} };
    try {
      const data = await fs.promises.readFile('./data.json', 'utf-8');
      jsonData = JSON.parse(data);
    } catch (err) {
      console.log('data.json missing or invalid, starting fresh.');
    }

    jsonData.audio[originalName] = savedPath;
    await fs.promises.writeFile('./data.json', JSON.stringify(jsonData, null, 2));
    console.log(`✅ Audio saved for ID: ${originalName}`);
    console.log(savedPath);

    let audioTextData = {};
    try {
      const audioTextFile = await fs.promises.readFile('./audioText.json', 'utf-8');
      audioTextData = JSON.parse(audioTextFile);
    } catch (err) {
      console.log('audioText.json missing or invalid, starting fresh.');
    }

    audioTextData[originalName] = transcript.trim();
    await fs.promises.writeFile('./audioText.json', JSON.stringify(audioTextData, null, 2));
    console.log(`✅ Transcription saved for ID: ${originalName}`);

    res.json({ path: savedPath, text: transcript.trim() });

  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).send('Internal server error');
  }
});


app.post('/api/analyze', async (req, res) => {
  const { question, key, answer } = req.body;

  if (!question || !key || !answer) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Construct prompt
    const prompt = `🧠 You are an expert behavioral interview coach. Analyze the candidate's answer and provide:
- Strengths
- Weaknesses
- Suggestions for improvement
- STAR format rating out of 10
- Relevance to the question

Question: ${question}

Answer: ${answer}
`;

    // Use Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    });

    const analysisText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';

    // Load existing data
    let data = {};
    try {
      const fileContent = await fs.promises.readFile('./data.json', 'utf-8');
      data = JSON.parse(fileContent);
    } catch (err) {
      console.log('Starting with new data.json...');
    }

    // Save in analysis
    data.analysis = data.analysis || {};
    data.analysis[key] = analysisText;

    await fs.promises.writeFile('./data.json', JSON.stringify(data, null, 2));

    res.json({ analysis: analysisText });
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ error: 'AI Analysis failed' });
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
