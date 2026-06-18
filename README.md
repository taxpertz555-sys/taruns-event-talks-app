# BigQuery Release Notes Monitor & Share Hub

A premium, modern web dashboard to monitor live BigQuery Release Notes from Google Cloud and easily craft and post formatted updates directly to X (formerly Twitter).

---

## 🌟 Key Features

- **Live Parser**: Fetches updates directly from the official Google Cloud feeds.
- **Smart Classification**: Auto-tags release entries into **Features** (Green), **Changes & Fixes** (Blue), and **Deprecations** (Red) based on title and content keywords.
- **Instant Search & Filter**: Real-time debounced search input combined with category tabs.
- **Interactive Reading View**: Clear, readable detail cards for exploring release details, code blocks, and lists.
- **X Share Composer**: Draft and edit custom posts, monitor length with the dynamic **280-character limit counter**, use the **Auto-Draft** summarizer, and share via Twitter's Web Intent.

---

## 🛠️ Architecture

- **Backend**: Python (Flask, Feedparser)
- **Frontend**: Vanilla HTML5, CSS3 (Custom Glassmorphism Dark Theme), and ES6+ JavaScript.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Python 3.10+ installed on your system.

### 2. Install Dependencies
Run the following command in your terminal to download required libraries:
```bash
pip install flask feedparser requests
```

### 3. Run the Server
Start the Flask development server:
```bash
python app.py
```

### 4. Open the Web Application
Open your web browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## 📂 Project Structure

- `app.py`: Backend API and static/template file routing.
- `templates/index.html`: Main HTML document using Outfit & Plus Jakarta Sans typography.
- `static/style.css`: Glassmorphic layout styling, glow parameters, and keyframe loading skeletons.
- `static/script.js`: State manager, debouncer search, categorization, and X web integration.
- `.gitignore`: Specifies files untracked by Git.
