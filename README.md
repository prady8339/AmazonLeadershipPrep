
# Amazon Leadership Principles Prep Tool 🎯

A personal preparation tool designed for candidates practicing Amazon's **Leadership Principles (LP)** interview questions.  
This project helps you:

✅ Record answers.  
✅ Auto-transcribe them using Whisper AI.  
✅ Refine your script using an LLM to follow the STAR method.  
✅ Save notes for every question.  
✅ Repeat and rehearse confidently.
✅ Track your covered topics.

Note:
This project was created while I was preparing for my Amazon interview, so there may be some bugs and the UI is not as polished as it could be. Please forgive the imperfections! I was short on time and focused on getting it functional. Once I have more time, I plan to revisit it and address the issues, improve the UI, and fix any bugs. Thanks for your understanding!


---

![image](https://github.com/user-attachments/assets/4097b514-07ca-4279-8aa3-260b6157ba5d)


## 💡 Purpose

Amazon interviews are heavily structured around Leadership Principles (LP).  
This tool helps you:

- 🎙️ Record your responses to real LP questions.
- 📝 Auto-generate transcriptions using `whisper.cpp`.
- 🤖 Refine your answers with an LLM (STAR format: Situation, Task, Action, Result).
- 💾 Save personalized notes for reference.
- 🔁 Repeat your practice until you're interview-ready.

---

## ⚙️ Complete Setup Guide

### 1️⃣ Install Node.js

Download and install the latest LTS version of Node.js:

- [Node.js Official Download](https://nodejs.org/)

Once installed, verify it by running:

```bash
node -v
npm -v
```

---

### 2️⃣ Install ffmpeg

This project uses `ffmpeg` for converting recorded audio into a format compatible with Whisper.

#### On macOS:
```bash
brew install ffmpeg
```

#### On Ubuntu/Linux:
```bash
sudo apt update
sudo apt install ffmpeg
```

#### On Windows:
1. Download the release from [ffmpeg.org](https://ffmpeg.org/download.html).
2. Extract it and add the `bin` folder to your system’s **PATH**.

Test your installation:

```bash
ffmpeg -version
```

---

### 3️⃣ Install whisper.cpp

This project uses [`whisper.cpp`](https://github.com/ggerganov/whisper.cpp) for speech-to-text transcription.

#### Clone and Build:
```bash
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
make
```

#### Download Model:

Inside the `whisper.cpp` directory, download the English base model:

```bash
cd models
wget https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
```

---

### 4️⃣ Clone and Set Up This Project

```bash
git clone https://github.com/prady8339/AmazonLeadershipPrep.git
cd AmazonLeadershipPrep
npm install
```

---

### 5️⃣ Update Whisper Path in `server.js`

In your `server.js` (or wherever your Express server is defined), locate this line:

```javascript
const whisperCmd = '/Users/mac/Documents/projects/roadmap/whisper.cpp/build/bin/whisper-cli -m "/Users/mac/Documents/projects/roadmap/whisper.cpp/models/ggml-base.en.bin" -f "${wavPath}" -otxt -of "${basePath}"';
```

And replace `/Users/mac/Documents/projects/roadmap/whisper.cpp/...` with your actual local path where you built `whisper.cpp` and downloaded the model.

Example:

```javascript
const whisperCmd = '/home/yourusername/projects/whisper.cpp/build/bin/whisper-cli -m "/home/yourusername/projects/whisper.cpp/models/ggml-base.en.bin" -f "${wavPath}" -otxt -of "${basePath}"';
```

⚠️ **Make sure the path points to the correct location** for both `whisper-cli` and the model file.

---

### 6️⃣ Start the Server

```bash
npm start
```

Open your browser and visit:

```
http://localhost:3000
```

You’re now ready to:

1. Record Amazon LP question answers.
2. Get them transcribed.
3. Refine your answers using an external LLM.
4. Save and iterate your notes.
5. Practice until you're confident and ready!

---

## 💡 Why Use This Tool?

This isn’t just a voice recorder — it’s a structured Amazon interview coach in your browser.

- 🎯 Answer real Leadership Principle questions.
- 🧠 Organize and improve your answers.
- 💬 Speak out loud — just like in the real interview.
- 🔁 Refine with STAR format and repeat until perfect.

---

## 💡 Contributions Welcome!

Pull Requests are appreciated for:

- Adding new questions.
- Improving server-side scripts.
- Bug fixes.
- Workflow suggestions.

---

## 📄 License

This project is licensed under the MIT License.

---

🚀 **Happy prepping — future Amazonian!**  
Master the STAR method, refine your stories, and speak confidently.
