# CodeLens — Static Analysis Debugger

A full-stack code debugging tool that analyzes source code for bugs, style violations, and best practice issues. Supports Python, JavaScript, Java, and C++.

## Features

- **Multi-language support** — Python (AST-based), JavaScript, Java, C++ (pattern-based)
- **Real-time analysis** — Paste code and get instant feedback on bugs and improvements
- **Severity classification** — Issues ranked as errors, warnings, and info
- **Smart suggestions** — Each issue includes a concrete fix with code examples
- **Auto language detection** — Automatically identifies the programming language
- **Analysis history** — Track past analyses within a session
- **Line highlighting** — Hover over issues to highlight the affected line in the editor

## Bug Detection Examples

| Language | Bug | Detection |
|----------|-----|-----------|
| Python | Mutable default arguments | AST analysis |
| Python | Bare except clauses | AST analysis |
| Python | `== None` instead of `is None` | AST + pattern |
| JavaScript | `==` instead of `===` | Pattern matching |
| JavaScript | `var` instead of `let/const` | Pattern matching |
| Java | String comparison with `==` | Pattern matching |
| Java | Raw types without generics | Pattern matching |
| Java | Resource leaks (no try-with-resources) | Pattern matching |
| C++ | Uninitialized variables | Pattern matching |
| C++ | `new` without smart pointers | Pattern matching |
| C++ | `gets()` buffer overflow | Pattern matching |
| C++ | `using namespace std` | Pattern matching |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, JavaScript, CSS-in-JS, Vite |
| Backend | Python, Flask, Flask-CORS |
| Analysis | Python AST module, regex pattern matching |

## Architecture

```
┌──────────────────────────┐      HTTP/JSON      ┌─────────────────────────┐
│    React Frontend        │ ◄──────────────────► │    Flask Backend         │
│                          │                      │                         │
│  Code Editor (textarea)  │  POST /api/analyze   │  Language Detection     │
│  Line Number Gutter      │                      │  ├── PythonAnalyzer     │
│  Results Panel           │  GET /api/history    │  │   (AST + patterns)   │
│  Language Picker         │                      │  ├── JavaScriptAnalyzer │
│  Analysis History        │  GET /api/languages  │  ├── JavaAnalyzer       │
│                          │                      │  └── CppAnalyzer        │
└──────────────────────────┘                      └─────────────────────────┘
```

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

API runs on `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App opens on `http://localhost:5173`

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Analyze code. Body: `{ code, language? }` |
| GET | `/api/history` | Get analysis history |
| GET | `/api/languages` | List supported languages |
| GET | `/api/health` | Health check |

## Key Concepts Demonstrated

- **Abstract Syntax Tree (AST) parsing** for deep Python analysis
- **Pattern-based static analysis** using regex for multi-language support
- **REST API design** with Flask
- **React component architecture** with hooks (useState, useEffect, useRef)
- **Responsive split-pane UI** with synchronized scroll between editor and line numbers
