# Real-Time Sign Language Translator (RTSLT)  

A browser-based Single Page Application (SPA) built with **Vite** that translates sign language into text in real time. The system uses **MediaPipe**, a **custom TensorFlow.js model**, and a transcript builder that allows users to download translations locally in PDF format.  

---

## ✨ Features  
- 📹 **Live camera input** for real-time sign detection  
- 🤟 **Custom sign recognition model** powered by TensorFlow.js  
- 📝 **Transcript generation** during each translation session  
- 📂 **Export transcripts** as PDF files for local use  
- 🔄 **Session reset** to start fresh conversations  
- ⚙️ **Accessibility settings**: adjust font size, screen brightness, and audio volume (for text-to-speech users)  

---

## 🛠️ Tech Stack  
- **Vite** (build system)  
- **JavaScript / ES6+**  
- **TensorFlow.js** (custom model for gesture recognition)  
- **MediaPipe** (hand tracking and landmarks)  
- **Tailwind CSS** (styling)  
- **jsPDF** (export transcripts to PDF)  

---

## 🚀 Getting Started  

### Prerequisites  
- [Node.js](https://nodejs.org/) (v16 or higher recommended)  
- npm (comes with Node.js) or yarn/pnpm  

### Installation  
Clone the repository and install dependencies:  
```bash
git clone https://github.com/yourusername/rslt-web.git
cd rslt-web
npm install
```

### Run in Development  
```bash
npm run dev
```
Open your browser at [http://localhost:5173](http://localhost:5173).  

### Build for Production  
```bash
npm run build
```
This will generate static files in the `dist/` folder.  

---

## 📂 Project Structure  
```
├── public/                # Static assets (models, wasm, icons)  
├── src/                   # Source code  
│   ├── components/        # Components (VideoPreview, Stepper, etc.)  
│   ├── hooks/             # Custom hooks (useCamera, useGestureRecognizer, etc.)  
│   ├── utils/             # Helper functions (pdf export, transcript, scaler)  
│   └── App.jsx            # Main entry point  
├── index.html             # Entry HTML  
├── package.json           # Project metadata & dependencies  
└── vite.config.js         # Vite configuration  
```  

---

## 📖 Usage  
1. Accept Terms & Conditions on startup.  
2. Enable camera access when prompted.  
3. Begin signing — recognized signs will appear in the transcript panel.  
4. Download the transcript as a PDF when finished.  
5. Reset the session to start again.  

---

## 🔒 Privacy  
- All processing happens **client-side in the browser**.  
- No sign data, transcripts, or camera input are stored on a server.  
- Users fully control their transcripts via local download.  

---

## 📜 License  
This project is licensed under the MIT License.  
