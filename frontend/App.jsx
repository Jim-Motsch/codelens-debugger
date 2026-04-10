import { useState, useEffect, useRef } from "react";

const API = "https://codelens-debugger.onrender.com/api";

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

// Quick prompt suggestions shown in chat
const QUICK_PROMPTS = [
  "Fix all errors for me",
  "Explain the worst bug",
  "How do I prevent these issues?",
  "Rewrite this code cleanly",
];

export default function CodeLens() {
  const [code, setCode] = useState(SAMPLE_CODE.python);
  const [language, setLanguage] = useState("python");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("editor");
  const [hoveredLine, setHoveredLine] = useState(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]); // { role, content }
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [rightTab, setRightTab] = useState("results"); // results | chat

  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const chatBottomRef = useRef(null);
  const chatInputRef = useRef(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading]);

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
    // Reset chat when code changes and is re-analyzed
    setChatMessages([]);
    try {
      const res = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      setResults(data);
      fetchHistory();
      // Auto-switch to results tab after analysis
      setRightTab("results");
    } catch (e) {
      setResults({ error: "Failed to connect to server. Is the backend running?" });
    }
    setLoading(false);
  }

  async function sendChatMessage(messageText) {
    const msg = messageText || chatInput.trim();
    if (!msg || chatLoading) return;
    if (!code.trim()) return;

    // Require analysis before chatting
    if (!results || results.error) {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "Please run an analysis first (hit the Analyze button), then I can answer questions about your code.",
      }]);
      return;
    }

    const newMessage = { role: "user", content: msg };
    const updatedMessages = [...chatMessages, newMessage];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          issues: results?.issues || [],
          messages: chatMessages, // send history before the new message
          message: msg,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: `Error: ${data.error}`,
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: data.reply,
        }]);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "Failed to reach the server. Make sure the backend is running.",
      }]);
    }

    setChatLoading(false);
  }

  function handleLanguageChange(lang) {
    setLanguage(lang);
    setCode(SAMPLE_CODE[lang] || "");
    setResults(null);
    setChatMessages([]);
  }

  function syncScroll() {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  function handleChatKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  }

  const lines = code.split("\n");
  const issueLines = results?.issues?.reduce((acc, issue) => {
    acc[issue.line] = issue;
    return acc;
  }, {}) || {};

  return (
    <div style={s.container}>
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
              <p style={s.logoSub}>Static Analysis + AI Debugger</p>
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

          {/* Right: Results + Chat Panel */}
          <div style={s.resultsPanel}>
            {/* Tab switcher: Results vs Chat */}
            <div style={s.panelHeader}>
              <div style={s.tabRow}>
                <button
                  style={{ ...s.tab, ...(rightTab === "results" ? s.tabActive : {}) }}
                  onClick={() => setRightTab("results")}
                >
                  Analysis Results
                  {results?.summary?.total_issues > 0 && (
                    <span style={s.tabBadge}>{results.summary.total_issues}</span>
                  )}
                </button>
                <button
                  style={{ ...s.tab, ...(rightTab === "chat" ? s.tabActive : {}) }}
                  onClick={() => setRightTab("chat")}
                >
                  ✦ AI Chat
                  {chatMessages.length > 0 && (
                    <span style={{ ...s.tabBadge, backgroundColor: "#6366f130", color: "#818cf8" }}>
                      {Math.floor(chatMessages.length / 2)}
                    </span>
                  )}
                </button>
              </div>

              {rightTab === "results" && results?.summary && (
                <div style={s.summaryBadges}>
                  {results.summary.errors > 0 && (
                    <span style={{ ...s.badge, ...s.badgeError }}>
                      {results.summary.errors} error{results.summary.errors !== 1 ? "s" : ""}
                    </span>
                  )}
                  {results.summary.warnings > 0 && (
                    <span style={{ ...s.badge, ...s.badgeWarn }}>
                      {results.summary.warnings} warn{results.summary.warnings !== 1 ? "s" : ""}
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

            {/* Results tab */}
            {rightTab === "results" && (
              <>
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
                        Your code looks clean. Switch to AI Chat to ask questions or get suggestions.
                      </p>
                      <button
                        onClick={() => setRightTab("chat")}
                        style={s.switchToChatBtn}
                      >
                        ✦ Open AI Chat
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={s.issuesList}>
                        {results.issues.map((issue, idx) => {
                          const config = SEVERITY_CONFIG[issue.severity];
                          return (
                            <div
                              key={idx}
                              style={{ ...s.issueCard, borderLeftColor: config.color }}
                              onMouseEnter={() => setHoveredLine(issue.line)}
                              onMouseLeave={() => setHoveredLine(null)}
                            >
                              <div style={s.issueHeader}>
                                <span style={{ ...s.severityTag, backgroundColor: config.bg, color: config.color }}>
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

                      {/* CTA to open chat after seeing results */}
                      <div style={s.chatCta}>
                        <p style={s.chatCtaText}>Want AI to explain or fix these issues?</p>
                        <button onClick={() => setRightTab("chat")} style={s.chatCtaBtn}>
                          ✦ Ask AI
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {results?.summary && (
                  <div style={s.summaryFooter}>
                    <span>
                      {results.summary.language.toUpperCase()} •{" "}
                      {results.summary.lines_of_code} lines •{" "}
                      {results.summary.total_issues} issues
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Chat tab */}
            {rightTab === "chat" && (
              <div style={s.chatPanel}>
                {/* Messages */}
                <div style={s.chatMessages}>
                  {chatMessages.length === 0 && !chatLoading && (
                    <div style={s.chatEmpty}>
                      <div style={s.chatEmptyIcon}>✦</div>
                      <p style={s.chatEmptyTitle}>CodeLens AI</p>
                      <p style={s.chatEmptyDesc}>
                        {results
                          ? "Ask me anything about your code. I've already read it and seen the analysis."
                          : "Run an analysis first, then ask me about your code."}
                      </p>

                      {results && (
                        <div style={s.quickPrompts}>
                          {QUICK_PROMPTS.map((prompt) => (
                            <button
                              key={prompt}
                              style={s.quickPromptBtn}
                              onClick={() => {
                                setChatInput(prompt);
                                sendChatMessage(prompt);
                              }}
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        ...s.chatBubble,
                        ...(msg.role === "user" ? s.chatBubbleUser : s.chatBubbleAI),
                      }}
                    >
                      <div style={msg.role === "user" ? s.chatLabelUser : s.chatLabelAI}>
                        {msg.role === "user" ? "You" : "✦ CodeLens AI"}
                      </div>
                      <div style={s.chatContent}>
                        {formatMessage(msg.content)}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div style={{ ...s.chatBubble, ...s.chatBubbleAI }}>
                      <div style={s.chatLabelAI}>✦ CodeLens AI</div>
                      <div style={s.typingIndicator}>
                        <span style={s.dot1}>●</span>
                        <span style={s.dot2}>●</span>
                        <span style={s.dot3}>●</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Input */}
                <div style={s.chatInputArea}>
                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder={results ? "Ask about your code... (Enter to send)" : "Run analysis first..."}
                    style={s.chatInputBox}
                    disabled={chatLoading || !results}
                    rows={2}
                  />
                  <button
                    onClick={() => sendChatMessage()}
                    style={{
                      ...s.chatSendBtn,
                      opacity: !chatInput.trim() || chatLoading || !results ? 0.4 : 1,
                    }}
                    disabled={!chatInput.trim() || chatLoading || !results}
                  >
                    ↑
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Simple message formatter — renders code blocks with distinct styling
// ============================================================================
function formatMessage(text) {
  if (!text) return null;

  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.replace(/^```\w*\n?/, "").replace(/```$/, "");
      return (
        <pre key={i} style={msgStyle.code}>
          <code>{lines}</code>
        </pre>
      );
    }
    // Render inline code
    const inline = part.split(/(`[^`]+`)/g);
    return (
      <span key={i}>
        {inline.map((chunk, j) => {
          if (chunk.startsWith("`") && chunk.endsWith("`")) {
            return <code key={j} style={msgStyle.inlineCode}>{chunk.slice(1, -1)}</code>;
          }
          return <span key={j}>{chunk}</span>;
        })}
      </span>
    );
  });
}

const msgStyle = {
  code: {
    backgroundColor: "#0a0e17",
    border: "1px solid #1a1f35",
    borderRadius: 6,
    padding: "10px 12px",
    fontSize: 12,
    lineHeight: 1.6,
    overflowX: "auto",
    margin: "8px 0 4px",
    color: "#a5f3fc",
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: "pre-wrap",
  },
  inlineCode: {
    backgroundColor: "#1a1f35",
    padding: "1px 5px",
    borderRadius: 3,
    fontSize: 12,
    color: "#a5f3fc",
    fontFamily: "'JetBrains Mono', monospace",
  },
};


// ============================================================================
// Styles
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
  logoSlash: { color: "#fff", fontSize: 15, fontWeight: 700 },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    color: "#f1f5f9",
    letterSpacing: "-0.5px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  logoSub: { fontSize: 11, color: "#64748b", margin: 0, letterSpacing: "0.5px" },
  langPicker: { display: "flex", gap: 6 },
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
    flexShrink: 0,
  },
  tabRow: { display: "flex", gap: 4, alignItems: "center" },
  tab: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "none",
    backgroundColor: "transparent",
    color: "#64748b",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  tabActive: { backgroundColor: "#1a1f35", color: "#e2e8f0" },
  tabBadge: {
    backgroundColor: "#ff555520",
    color: "#ff5555",
    fontSize: 10,
    padding: "1px 5px",
    borderRadius: 3,
    fontWeight: 700,
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
  spinner: { display: "inline-block", fontSize: 16 },
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
    flexShrink: 0,
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
  historyList: { flex: 1, overflowY: "auto", padding: 14 },
  historyItem: {
    padding: "12px 14px",
    backgroundColor: "#111628",
    borderRadius: 8,
    marginBottom: 8,
    border: "1px solid #1a1f35",
  },
  historyMeta: { display: "flex", justifyContent: "space-between", marginBottom: 6 },
  historyLang: { fontSize: 12, color: "#8b5cf6" },
  historyTime: { fontSize: 11, color: "#475569" },
  historyPreview: {
    fontSize: 11, color: "#94a3b8", margin: "0 0 6px",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  historyIssues: { fontSize: 11, color: "#64748b" },

  // Results panel
  resultsPanel: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#0d1120",
    borderRadius: 12,
    border: "1px solid #1a1f35",
    overflow: "hidden",
  },
  summaryBadges: { display: "flex", gap: 6 },
  badge: { padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: "inherit" },
  badgeError: { backgroundColor: "#ff555520", color: "#ff5555" },
  badgeWarn: { backgroundColor: "#ffb86c20", color: "#ffb86c" },
  badgeInfo: { backgroundColor: "#8be9fd20", color: "#8be9fd" },

  resultsContent: { flex: 1, overflowY: "auto", padding: 14 },

  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", height: "100%", minHeight: 300,
    textAlign: "center", padding: 40,
  },
  emptyIcon: { fontSize: 40, color: "#2d3154", marginBottom: 16 },
  successIcon: { fontSize: 48, color: "#10b981", marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: "#94a3b8", margin: "0 0 8px" },
  emptyDesc: { fontSize: 13, color: "#475569", maxWidth: 320, lineHeight: 1.6, margin: "0 0 16px" },
  emptyText: { color: "#475569", fontSize: 13, textAlign: "center", padding: 40 },
  errorState: {
    padding: 20, backgroundColor: "#ff555510", borderRadius: 8, border: "1px solid #ff555530",
  },
  errorText: { color: "#ff5555", fontSize: 13, margin: 0 },

  switchToChatBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #6366f140",
    backgroundColor: "#6366f115",
    color: "#818cf8",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 4,
  },

  issuesList: { display: "flex", flexDirection: "column", gap: 10 },
  issueCard: {
    backgroundColor: "#111628", borderRadius: 10,
    padding: "14px 16px", borderLeft: "3px solid",
  },
  issueHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  severityTag: {
    padding: "2px 8px", borderRadius: 4, fontSize: 11,
    fontWeight: 700, fontFamily: "inherit", letterSpacing: "0.3px",
  },
  lineTag: { fontSize: 11, color: "#64748b", fontFamily: "inherit" },
  categoryTag: {
    fontSize: 10, color: "#475569", backgroundColor: "#1a1f35",
    padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.5px",
  },
  issueMessage: { fontSize: 13, color: "#e2e8f0", margin: "0 0 10px", lineHeight: 1.5 },
  suggestionBox: {
    backgroundColor: "#0d1120", borderRadius: 6,
    padding: "10px 12px", border: "1px solid #1a1f35",
  },
  suggestionLabel: { fontSize: 11, fontWeight: 600, marginBottom: 4, display: "block" },
  suggestionText: { fontSize: 12, color: "#94a3b8", margin: 0, lineHeight: 1.5 },

  // CTA after results
  chatCta: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginTop: 14, padding: "12px 16px",
    backgroundColor: "#6366f110", borderRadius: 10,
    border: "1px solid #6366f125",
  },
  chatCtaText: { fontSize: 12, color: "#94a3b8", margin: 0 },
  chatCtaBtn: {
    padding: "7px 14px", borderRadius: 7,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff", fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },

  summaryFooter: {
    padding: "10px 14px",
    borderTop: "1px solid #1a1f35",
    fontSize: 11, color: "#475569",
    backgroundColor: "#0f1424",
    textAlign: "center", letterSpacing: "0.3px",
    flexShrink: 0,
  },

  // ---- Chat panel ----
  chatPanel: {
    display: "flex", flexDirection: "column", flex: 1, overflow: "hidden",
  },
  chatMessages: {
    flex: 1, overflowY: "auto", padding: "14px 14px 8px",
    display: "flex", flexDirection: "column", gap: 12,
  },
  chatEmpty: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", flex: 1, textAlign: "center", padding: 24, minHeight: 280,
  },
  chatEmptyIcon: { fontSize: 32, color: "#6366f1", marginBottom: 12 },
  chatEmptyTitle: { fontSize: 15, fontWeight: 600, color: "#94a3b8", margin: "0 0 8px" },
  chatEmptyDesc: { fontSize: 12, color: "#475569", maxWidth: 280, lineHeight: 1.6, margin: "0 0 20px" },

  quickPrompts: {
    display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 280,
  },
  quickPromptBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #1a1f35",
    backgroundColor: "#111628",
    color: "#94a3b8",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    transition: "all 0.15s",
  },

  chatBubble: {
    maxWidth: "90%", padding: "10px 14px",
    borderRadius: 10, lineHeight: 1.6, fontSize: 13,
  },
  chatBubbleUser: {
    backgroundColor: "#1a1f35",
    color: "#e2e8f0",
    alignSelf: "flex-end",
    borderBottomRightRadius: 3,
  },
  chatBubbleAI: {
    backgroundColor: "#111628",
    color: "#cbd5e1",
    alignSelf: "flex-start",
    border: "1px solid #1a1f35",
    borderBottomLeftRadius: 3,
  },
  chatLabelUser: {
    fontSize: 10, color: "#6366f1", fontWeight: 700,
    marginBottom: 4, letterSpacing: "0.5px",
  },
  chatLabelAI: {
    fontSize: 10, color: "#8b5cf6", fontWeight: 700,
    marginBottom: 4, letterSpacing: "0.5px",
  },
  chatContent: { whiteSpace: "pre-wrap", wordBreak: "break-word" },

  // Typing dots
  typingIndicator: { display: "flex", gap: 4, alignItems: "center", padding: "4px 0" },
  dot1: { fontSize: 8, color: "#6366f1", animation: "pulse 1.2s ease-in-out 0s infinite" },
  dot2: { fontSize: 8, color: "#6366f1", animation: "pulse 1.2s ease-in-out 0.2s infinite" },
  dot3: { fontSize: 8, color: "#6366f1", animation: "pulse 1.2s ease-in-out 0.4s infinite" },

  chatInputArea: {
    display: "flex", gap: 8, padding: "10px 14px 14px",
    borderTop: "1px solid #1a1f35",
    backgroundColor: "#0f1424",
    flexShrink: 0,
    alignItems: "flex-end",
  },
  chatInputBox: {
    flex: 1,
    backgroundColor: "#111628",
    border: "1px solid #1a1f35",
    borderRadius: 10,
    color: "#e2e8f0",
    fontSize: 13,
    fontFamily: "inherit",
    padding: "10px 14px",
    outline: "none",
    resize: "none",
    lineHeight: 1.5,
  },
  chatSendBtn: {
    width: 38, height: 38,
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    fontSize: 18,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    transition: "opacity 0.15s",
  },
};
