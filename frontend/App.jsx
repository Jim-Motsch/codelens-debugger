import { useState, useEffect, useRef } from "react";

const API = "http://localhost:5000/api";

const LANGUAGES = [
  { id: "python", name: "Python", icon: "🐍" },
  { id: "javascript", name: "JavaScript", icon: "⚡" },
  { id: "java", name: "Java", icon: "☕" },
  { id: "cpp", name: "C++", icon: "⚙️" },
];

const SAMPLE_CODE = {
  python: `def process_data(items=[]):
    result = ""
    for item in items:
        result += str(item)
    
    x = 10
    y = 0
    avg = x / y
    
    if items == None:
        return
    
    try:
        data = json.loads(items)
    except:
        pass
    
    return result`,

  javascript: `var items = [1, 2, 3];

function processData(data) {
    if (data == null) {
        return;
    }
    
    for (var i = 0; i <= data.length; i++) {
        console.log(data[i]);
        if (data[i] == "3") {
            result = data[i] / 0;
        }
    }
}`,

  java: `public class DataProcessor {
    public static void main(String[] args) {
        String name = "hello";
        if (name == "hello") {
            System.out.println("Match!");
        }
        
        ArrayList items = new ArrayList();
        items.add("test");
        
        Scanner sc = new Scanner(System.in);
        String input = sc.nextLine();
        
        input.length();
    }
}`,

  cpp: `#include <iostream>
using namespace std;

int main() {
    int x;
    double result;
    int arr[10];
    
    for (int i = 0; i <= 10; i++) {
        arr[i] = i * 2;
    }
    
    int* data = new int[100];
    
    result = x / 0;
    
    char buffer[50];
    gets(buffer);
    
    if (result >= 999) {
        cout << result << endl;
    }
    
    return 0;
}`,
};

const SEVERITY_CONFIG = {
  error:   { color: "#ff5555", bg: "#ff555515", icon: "✕", label: "Error" },
  warning: { color: "#ffb86c", bg: "#ffb86c15", icon: "⚠", label: "Warning" },
  info:    { color: "#8be9fd", bg: "#8be9fd15", icon: "ℹ", label: "Info" },
};

export default function CodeLens() {
  const [code, setCode] = useState(SAMPLE_CODE.python);
  const [language, setLanguage] = useState("python");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("editor"); // editor | history
  const [hoveredLine, setHoveredLine] = useState(null);
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await fetch(`${API}/history`);
      const data = await res.json();
      setHistory(data);
    } catch (e) {}
  }

  async function analyzeCode() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      setResults(data);
      fetchHistory();
    } catch (e) {
      setResults({ error: "Failed to connect to server. Is the backend running?" });
    }
    setLoading(false);
  }

  function handleLanguageChange(lang) {
    setLanguage(lang);
    setCode(SAMPLE_CODE[lang] || "");
    setResults(null);
  }

  function syncScroll() {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  const lines = code.split("\n");
  const issueLines = results?.issues?.reduce((acc, issue) => {
    acc[issue.line] = issue;
    return acc;
  }, {}) || {};

  return (
    <div style={s.container}>
      {/* Background grid effect */}
      <div style={s.bgGrid} />

      <div style={s.app}>
        {/* Header */}
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logoMark}>
              <span style={s.logoSlash}>&lt;/&gt;</span>
            </div>
            <div>
              <h1 style={s.logoText}>CodeLens</h1>
              <p style={s.logoSub}>Static Analysis Debugger</p>
            </div>
          </div>

          <div style={s.langPicker}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                onClick={() => handleLanguageChange(lang.id)}
                style={{
                  ...s.langBtn,
                  ...(language === lang.id ? s.langBtnActive : {}),
                }}
              >
                <span style={s.langIcon}>{lang.icon}</span>
                {lang.name}
              </button>
            ))}
          </div>
        </header>

        {/* Main Content */}
        <div style={s.main}>
          {/* Left: Code Editor */}
          <div style={s.editorPanel}>
            <div style={s.panelHeader}>
              <div style={s.tabRow}>
                <button
                  style={{ ...s.tab, ...(activeTab === "editor" ? s.tabActive : {}) }}
                  onClick={() => setActiveTab("editor")}
                >
                  Editor
                </button>
                <button
                  style={{ ...s.tab, ...(activeTab === "history" ? s.tabActive : {}) }}
                  onClick={() => setActiveTab("history")}
                >
                  History ({history.length})
                </button>
              </div>
              <button
                onClick={analyzeCode}
                style={s.analyzeBtn}
                disabled={loading}
              >
                {loading ? (
                  <span style={s.spinner}>⟳</span>
                ) : (
                  <>
                    <span style={{ marginRight: 6 }}>▶</span> Analyze
                  </>
                )}
              </button>
            </div>

            {activeTab === "editor" ? (
              <div style={s.editorContainer}>
                {/* Line numbers */}
                <div style={s.lineNumbers} ref={lineNumbersRef}>
                  {lines.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        ...s.lineNum,
                        color: issueLines[i + 1]
                          ? SEVERITY_CONFIG[issueLines[i + 1].severity].color
                          : "#4a5568",
                        backgroundColor:
                          hoveredLine === i + 1
                            ? "#ffffff08"
                            : issueLines[i + 1]
                            ? SEVERITY_CONFIG[issueLines[i + 1].severity].bg
                            : "transparent",
                      }}
                    >
                      {issueLines[i + 1] && (
                        <span style={{ marginRight: 4, fontSize: 10 }}>
                          {SEVERITY_CONFIG[issueLines[i + 1].severity].icon}
                        </span>
                      )}
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Code textarea */}
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setResults(null);
                  }}
                  onScroll={syncScroll}
                  style={s.textarea}
                  spellCheck={false}
                  placeholder="Paste your code here..."
                />
              </div>
            ) : (
              <div style={s.historyList}>
                {history.length === 0 ? (
                  <p style={s.emptyText}>No analysis history yet.</p>
                ) : (
                  history.map((h) => (
                    <div key={h.id} style={s.historyItem}>
                      <div style={s.historyMeta}>
                        <span style={s.historyLang}>
                          {LANGUAGES.find((l) => l.id === h.language)?.icon}{" "}
                          {h.language}
                        </span>
                        <span style={s.historyTime}>
                          {new Date(h.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p style={s.historyPreview}>{h.code_preview}</p>
                      <span style={s.historyIssues}>
                        {h.issues_count} issue{h.issues_count !== 1 ? "s" : ""} found
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right: Results Panel */}
          <div style={s.resultsPanel}>
            <div style={s.panelHeader}>
              <span style={s.panelTitle}>Analysis Results</span>
              {results?.summary && (
                <div style={s.summaryBadges}>
                  {results.summary.errors > 0 && (
                    <span style={{ ...s.badge, ...s.badgeError }}>
                      {results.summary.errors} error{results.summary.errors !== 1 ? "s" : ""}
                    </span>
                  )}
                  {results.summary.warnings > 0 && (
                    <span style={{ ...s.badge, ...s.badgeWarn }}>
                      {results.summary.warnings} warning{results.summary.warnings !== 1 ? "s" : ""}
                    </span>
                  )}
                  {results.summary.info > 0 && (
                    <span style={{ ...s.badge, ...s.badgeInfo }}>
                      {results.summary.info} info
                    </span>
                  )}
                </div>
              )}
            </div>

            <div style={s.resultsContent}>
              {!results ? (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}>⌘</div>
                  <p style={s.emptyTitle}>Ready to analyze</p>
                  <p style={s.emptyDesc}>
                    Paste your code on the left and hit Analyze to find bugs,
                    style issues, and improvement suggestions.
                  </p>
                </div>
              ) : results.error ? (
                <div style={s.errorState}>
                  <p style={s.errorText}>{results.error}</p>
                </div>
              ) : results.issues?.length === 0 ? (
                <div style={s.emptyState}>
                  <div style={s.successIcon}>✓</div>
                  <p style={s.emptyTitle}>No issues found!</p>
                  <p style={s.emptyDesc}>
                    Your code looks clean. No bugs, warnings, or style issues detected.
                  </p>
                </div>
              ) : (
                <div style={s.issuesList}>
                  {results.issues.map((issue, idx) => {
                    const config = SEVERITY_CONFIG[issue.severity];
                    return (
                      <div
                        key={idx}
                        style={{
                          ...s.issueCard,
                          borderLeftColor: config.color,
                        }}
                        onMouseEnter={() => setHoveredLine(issue.line)}
                        onMouseLeave={() => setHoveredLine(null)}
                      >
                        <div style={s.issueHeader}>
                          <span
                            style={{
                              ...s.severityTag,
                              backgroundColor: config.bg,
                              color: config.color,
                            }}
                          >
                            {config.icon} {config.label}
                          </span>
                          <span style={s.lineTag}>Line {issue.line}</span>
                          <span style={s.categoryTag}>{issue.category}</span>
                        </div>
                        <p style={s.issueMessage}>{issue.message}</p>
                        <div style={s.suggestionBox}>
                          <span style={s.suggestionLabel}>💡 Fix:</span>
                          <p style={s.suggestionText}>{issue.suggestion}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary footer */}
            {results?.summary && (
              <div style={s.summaryFooter}>
                <span>
                  {results.summary.language.toUpperCase()} •{" "}
                  {results.summary.lines_of_code} lines •{" "}
                  {results.summary.total_issues} issues
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Styles — Terminal-inspired dark theme
// ============================================================================
const s = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0a0e17",
    color: "#e2e8f0",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    position: "relative",
    overflow: "hidden",
  },
  bgGrid: {
    position: "fixed",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  app: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1400,
    margin: "0 auto",
    padding: "0 20px",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  // Header
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 0",
    borderBottom: "1px solid #1a1f35",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoSlash: {
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    color: "#f1f5f9",
    letterSpacing: "-0.5px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  logoSub: {
    fontSize: 11,
    color: "#64748b",
    margin: 0,
    letterSpacing: "0.5px",
  },
  langPicker: {
    display: "flex",
    gap: 6,
  },
  langBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #1a1f35",
    backgroundColor: "transparent",
    color: "#64748b",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.15s",
  },
  langBtnActive: {
    backgroundColor: "#1a1f35",
    color: "#e2e8f0",
    borderColor: "#6366f1",
  },
  langIcon: { fontSize: 14 },

  // Main layout
  main: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    flex: 1,
    padding: "16px 0 20px",
    minHeight: 0,
  },

  // Editor panel
  editorPanel: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#0d1120",
    borderRadius: 12,
    border: "1px solid #1a1f35",
    overflow: "hidden",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderBottom: "1px solid #1a1f35",
    backgroundColor: "#0f1424",
  },
  tabRow: { display: "flex", gap: 4 },
  tab: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "none",
    backgroundColor: "transparent",
    color: "#64748b",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  tabActive: {
    backgroundColor: "#1a1f35",
    color: "#e2e8f0",
  },
  analyzeBtn: {
    padding: "8px 18px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    letterSpacing: "0.3px",
  },
  spinner: {
    display: "inline-block",
    animation: "spin 1s linear infinite",
    fontSize: 16,
  },
  editorContainer: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
    minHeight: 500,
  },
  lineNumbers: {
    padding: "12px 0",
    textAlign: "right",
    userSelect: "none",
    overflowY: "hidden",
    minWidth: 56,
    backgroundColor: "#0b0f1a",
    borderRight: "1px solid #1a1f35",
  },
  lineNum: {
    padding: "0 10px 0 6px",
    fontSize: 12,
    lineHeight: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    transition: "background-color 0.1s",
  },
  textarea: {
    flex: 1,
    padding: "12px 16px",
    backgroundColor: "transparent",
    color: "#e2e8f0",
    border: "none",
    outline: "none",
    resize: "none",
    fontSize: 13,
    lineHeight: "20px",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    tabSize: 4,
  },

  // History
  historyList: {
    flex: 1,
    overflowY: "auto",
    padding: 14,
  },
  historyItem: {
    padding: "12px 14px",
    backgroundColor: "#111628",
    borderRadius: 8,
    marginBottom: 8,
    border: "1px solid #1a1f35",
  },
  historyMeta: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  historyLang: { fontSize: 12, color: "#8b5cf6" },
  historyTime: { fontSize: 11, color: "#475569" },
  historyPreview: {
    fontSize: 11,
    color: "#94a3b8",
    margin: "0 0 6px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  historyIssues: {
    fontSize: 11,
    color: "#64748b",
  },

  // Results panel
  resultsPanel: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#0d1120",
    borderRadius: 12,
    border: "1px solid #1a1f35",
    overflow: "hidden",
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e2e8f0",
  },
  summaryBadges: { display: "flex", gap: 6 },
  badge: {
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "inherit",
  },
  badgeError: { backgroundColor: "#ff555520", color: "#ff5555" },
  badgeWarn: { backgroundColor: "#ffb86c20", color: "#ffb86c" },
  badgeInfo: { backgroundColor: "#8be9fd20", color: "#8be9fd" },

  resultsContent: {
    flex: 1,
    overflowY: "auto",
    padding: 14,
  },

  // Empty state
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    minHeight: 300,
    textAlign: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 40,
    color: "#2d3154",
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 48,
    color: "#10b981",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#94a3b8",
    margin: "0 0 8px",
  },
  emptyDesc: {
    fontSize: 13,
    color: "#475569",
    maxWidth: 320,
    lineHeight: 1.6,
    margin: 0,
  },
  emptyText: {
    color: "#475569",
    fontSize: 13,
    textAlign: "center",
    padding: 40,
  },
  errorState: {
    padding: 20,
    backgroundColor: "#ff555510",
    borderRadius: 8,
    border: "1px solid #ff555530",
  },
  errorText: {
    color: "#ff5555",
    fontSize: 13,
    margin: 0,
  },

  // Issues
  issuesList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  issueCard: {
    backgroundColor: "#111628",
    borderRadius: 10,
    padding: "14px 16px",
    borderLeft: "3px solid",
    transition: "transform 0.1s",
  },
  issueHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  severityTag: {
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "inherit",
    letterSpacing: "0.3px",
  },
  lineTag: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: "inherit",
  },
  categoryTag: {
    fontSize: 10,
    color: "#475569",
    backgroundColor: "#1a1f35",
    padding: "2px 6px",
    borderRadius: 3,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  issueMessage: {
    fontSize: 13,
    color: "#e2e8f0",
    margin: "0 0 10px",
    lineHeight: 1.5,
  },
  suggestionBox: {
    backgroundColor: "#0d1120",
    borderRadius: 6,
    padding: "10px 12px",
    border: "1px solid #1a1f35",
  },
  suggestionLabel: {
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 4,
    display: "block",
  },
  suggestionText: {
    fontSize: 12,
    color: "#94a3b8",
    margin: 0,
    lineHeight: 1.5,
  },

  // Summary footer
  summaryFooter: {
    padding: "10px 14px",
    borderTop: "1px solid #1a1f35",
    fontSize: 11,
    color: "#475569",
    backgroundColor: "#0f1424",
    textAlign: "center",
    letterSpacing: "0.3px",
  },
};
