import { useState, useEffect, useRef } from "react";
import { supabase, checkSubscription } from "./supabase";

const API = "https://codelens-debugger.onrender.com/api";
const CHECKOUT_URL = "https://codelensai.lemonsqueezy.com/checkout/buy/ce4a0d77-c2ef-4bf3-8ecf-ce76664c2667";
const FREE_CHAT_LIMIT = 3;

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

const QUICK_PROMPTS = [
  "Fix all errors for me",
  "Explain the worst bug",
  "How do I prevent these issues?",
  "Rewrite this code cleanly",
];

function UpgradeModal({ onClose }) {
  return (
    <div style={m.overlay}>
      <div style={m.modal}>
        <div style={m.modalHeader}>
          <div style={m.sparkle}>✦</div>
          <h2 style={m.modalTitle}>Upgrade to CodeLens Pro</h2>
          <p style={m.modalSub}>You've used your 3 free AI messages</p>
        </div>
        <div style={m.features}>
          {["Unlimited AI chat messages","AI-powered deep code analysis","Fix entire files with one click","Priority support"].map(f => (
            <div key={f} style={m.feature}>
              <span style={m.featureCheck}>✓</span>
              <span style={m.featureText}>{f}</span>
            </div>
          ))}
        </div>
        <div style={m.pricing}>
          <span style={m.price}>$9.99</span>
          <span style={m.pricePer}>/month</span>
        </div>
        <button onClick={() => window.open(CHECKOUT_URL, "_blank")} style={m.upgradeBtn}>Upgrade Now</button>
        <button onClick={onClose} style={m.dismissBtn}>Maybe later</button>
      </div>
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    setMessage("");
    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else onAuth(data.user);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email for a confirmation link!");
    }
    setLoading(false);
  }

  return (
    <div style={a.container}>
      <div style={a.bgGrid} />
      <div style={a.card}>
        <div style={a.logoRow}>
          <div style={a.logoMark}><span style={a.logoSlash}>&lt;/&gt;</span></div>
          <div>
            <h1 style={a.logoText}>CodeLens</h1>
            <p style={a.logoSub}>AI-Powered Code Debugger</p>
          </div>
        </div>
        <div style={a.tabs}>
          <button style={{ ...a.tab, ...(mode === "login" ? a.tabActive : {}) }} onClick={() => { setMode("login"); setError(""); setMessage(""); }}>Log In</button>
          <button style={{ ...a.tab, ...(mode === "signup" ? a.tabActive : {}) }} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>Sign Up</button>
        </div>
        <div style={a.form}>
          <div style={a.field}>
            <label style={a.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="you@example.com" style={a.input} />
          </div>
          <div style={a.field}>
            <label style={a.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="••••••••" style={a.input} />
          </div>
          {error && <p style={a.error}>{error}</p>}
          {message && <p style={a.success}>{message}</p>}
          <button onClick={handleSubmit} style={a.submitBtn} disabled={loading}>
            {loading ? "..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </div>
        <p style={a.footer}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span style={a.footerLink} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>
            {mode === "login" ? "Sign up" : "Log in"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default function CodeLens() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [code, setCode] = useState(SAMPLE_CODE.python);
  const [language, setLanguage] = useState("python");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("editor");
  const [hoveredLine, setHoveredLine] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [rightTab, setRightTab] = useState("results");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

useEffect(() => {
  if (user) {
    fetchHistory();
    checkSubscription(user.email).then(pro => {
      console.log('Setting isPro to:', pro)
      setIsPro(pro)
  });
  }
}, [user]);  useEffect(() => { if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatLoading]);

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
    setChatMessages([]);
    try {
      const res = await fetch(`${API}/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, language }) });
      const data = await res.json();
      setResults(data);
      fetchHistory();
      setRightTab("results");
    } catch (e) {
      setResults({ error: "Failed to connect to server." });
    }
    setLoading(false);
  }

  async function sendChatMessage(messageText) {
    const msg = messageText || chatInput.trim();
    if (!msg || chatLoading || !results || results.error) return;
    if (chatCount >= FREE_CHAT_LIMIT) { setShowUpgrade(true); return; }
    const updatedMessages = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);
    const newCount = chatCount + 1;
    setChatCount(newCount);
    try {
      const res = await fetch(`${API}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, language, issues: results?.issues || [], messages: chatMessages, message: msg }) });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.error ? `Error: ${data.error}` : data.reply }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Failed to reach the server." }]);
    }
    setChatLoading(false);
    if (newCount >= FREE_CHAT_LIMIT) setTimeout(() => setShowUpgrade(true), 1500);
  }

  function handleLanguageChange(lang) { setLanguage(lang); setCode(SAMPLE_CODE[lang] || ""); setResults(null); setChatMessages([]); }
  function syncScroll() { if (lineNumbersRef.current && textareaRef.current) lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop; }
  async function handleSignOut() { await supabase.auth.signOut(); setUser(null); }

  const remainingChats = FREE_CHAT_LIMIT - chatCount;
  const atLimit = !isPro && chatCount >= FREE_CHAT_LIMIT;
  if (authLoading) return <div style={{ minHeight: "100vh", backgroundColor: "#0a0e17", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#64748b", fontFamily: "monospace" }}>Loading...</p></div>;
  if (!user) return <AuthScreen onAuth={setUser} />;

  const lines = code.split("\n");
  const issueLines = results?.issues?.reduce((acc, issue) => { acc[issue.line] = issue; return acc; }, {}) || {};

  return (
    <div style={s.container}>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      <div style={s.bgGrid} />
      <div style={s.app}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logoMark}><span style={s.logoSlash}>&lt;/&gt;</span></div>
            <div><h1 style={s.logoText}>CodeLens</h1><p style={s.logoSub}>Static Analysis + AI Debugger</p></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={s.langPicker}>
              {LANGUAGES.map(lang => (
                <button key={lang.id} onClick={() => handleLanguageChange(lang.id)} style={{ ...s.langBtn, ...(language === lang.id ? s.langBtnActive : {}) }}>
                  <span style={s.langIcon}>{lang.icon}</span>{lang.name}
                </button>
              ))}
            </div>
            <div style={s.userArea}>
              <button onClick={() => window.open(CHECKOUT_URL, "_blank")} style={s.upgradeHeaderBtn}>✦ Upgrade</button>
              <span style={s.userEmail}>{user.email}</span>
              <button onClick={handleSignOut} style={s.signOutBtn}>Sign out</button>
            </div>
          </div>
        </header>

        <div style={s.main}>
          <div style={s.editorPanel}>
            <div style={s.panelHeader}>
              <div style={s.tabRow}>
                <button style={{ ...s.tab, ...(activeTab === "editor" ? s.tabActive : {}) }} onClick={() => setActiveTab("editor")}>Editor</button>
                <button style={{ ...s.tab, ...(activeTab === "history" ? s.tabActive : {}) }} onClick={() => setActiveTab("history")}>History ({history.length})</button>
              </div>
              <button onClick={analyzeCode} style={s.analyzeBtn} disabled={loading}>
                {loading ? <span>⟳</span> : <><span style={{ marginRight: 6 }}>▶</span>Analyze</>}
              </button>
            </div>
            {activeTab === "editor" ? (
              <div style={s.editorContainer}>
                <div style={s.lineNumbers} ref={lineNumbersRef}>
                  {lines.map((_, i) => (
                    <div key={i} style={{ ...s.lineNum, color: issueLines[i+1] ? SEVERITY_CONFIG[issueLines[i+1].severity].color : "#4a5568", backgroundColor: hoveredLine === i+1 ? "#ffffff08" : issueLines[i+1] ? SEVERITY_CONFIG[issueLines[i+1].severity].bg : "transparent" }}>
                      {issueLines[i+1] && <span style={{ marginRight: 4, fontSize: 10 }}>{SEVERITY_CONFIG[issueLines[i+1].severity].icon}</span>}
                      {i+1}
                    </div>
                  ))}
                </div>
                <textarea ref={textareaRef} value={code} onChange={e => { setCode(e.target.value); setResults(null); }} onScroll={syncScroll} style={s.textarea} spellCheck={false} placeholder="Paste your code here..." />
              </div>
            ) : (
              <div style={s.historyList}>
                {history.length === 0 ? <p style={s.emptyText}>No analysis history yet.</p> : history.map(h => (
                  <div key={h.id} style={s.historyItem}>
                    <div style={s.historyMeta}>
                      <span style={s.historyLang}>{LANGUAGES.find(l => l.id === h.language)?.icon} {h.language}</span>
                      <span style={s.historyTime}>{new Date(h.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p style={s.historyPreview}>{h.code_preview}</p>
                    <span style={s.historyIssues}>{h.issues_count} issue{h.issues_count !== 1 ? "s" : ""} found</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={s.resultsPanel}>
            <div style={s.panelHeader}>
              <div style={s.tabRow}>
                <button style={{ ...s.tab, ...(rightTab === "results" ? s.tabActive : {}) }} onClick={() => setRightTab("results")}>
                  Analysis Results
                  {results?.summary?.total_issues > 0 && <span style={s.tabBadge}>{results.summary.total_issues}</span>}
                </button>
                <button style={{ ...s.tab, ...(rightTab === "chat" ? s.tabActive : {}) }} onClick={() => setRightTab("chat")}>
                  ✦ AI Chat
                  {chatMessages.length > 0 && <span style={{ ...s.tabBadge, backgroundColor: "#6366f130", color: "#818cf8" }}>{Math.floor(chatMessages.length/2)}</span>}
                </button>
              </div>
              {rightTab === "results" && results?.summary && (
                <div style={s.summaryBadges}>
                  {results.summary.errors > 0 && <span style={{ ...s.badge, ...s.badgeError }}>{results.summary.errors} error{results.summary.errors !== 1 ? "s" : ""}</span>}
                  {results.summary.warnings > 0 && <span style={{ ...s.badge, ...s.badgeWarn }}>{results.summary.warnings} warn{results.summary.warnings !== 1 ? "s" : ""}</span>}
                  {results.summary.info > 0 && <span style={{ ...s.badge, ...s.badgeInfo }}>{results.summary.info} info</span>}
                </div>
              )}
            </div>

            {rightTab === "results" && (
              <>
                <div style={s.resultsContent}>
                  {!results ? (
                    <div style={s.emptyState}><div style={s.emptyIcon}>⌘</div><p style={s.emptyTitle}>Ready to analyze</p><p style={s.emptyDesc}>Paste your code on the left and hit Analyze.</p></div>
                  ) : results.error ? (
                    <div style={s.errorState}><p style={s.errorText}>{results.error}</p></div>
                  ) : results.issues?.length === 0 ? (
                    <div style={s.emptyState}><div style={s.successIcon}>✓</div><p style={s.emptyTitle}>No issues found!</p><button onClick={() => setRightTab("chat")} style={s.switchToChatBtn}>✦ Open AI Chat</button></div>
                  ) : (
                    <>
                      <div style={s.issuesList}>
                        {results.issues.map((issue, idx) => {
                          const config = SEVERITY_CONFIG[issue.severity];
                          return (
                            <div key={idx} style={{ ...s.issueCard, borderLeftColor: config.color }} onMouseEnter={() => setHoveredLine(issue.line)} onMouseLeave={() => setHoveredLine(null)}>
                              <div style={s.issueHeader}>
                                <span style={{ ...s.severityTag, backgroundColor: config.bg, color: config.color }}>{config.icon} {config.label}</span>
                                <span style={s.lineTag}>Line {issue.line}</span>
                                <span style={s.categoryTag}>{issue.category}</span>
                              </div>
                              <p style={s.issueMessage}>{issue.message}</p>
                              <div style={s.suggestionBox}><span style={s.suggestionLabel}>💡 Fix:</span><p style={s.suggestionText}>{issue.suggestion}</p></div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={s.chatCta}>
                        <p style={s.chatCtaText}>Want AI to explain or fix these issues?</p>
                        <button onClick={() => setRightTab("chat")} style={s.chatCtaBtn}>✦ Ask AI</button>
                      </div>
                    </>
                  )}
                </div>
                {results?.summary && <div style={s.summaryFooter}><span>{results.summary.language.toUpperCase()} • {results.summary.lines_of_code} lines • {results.summary.total_issues} issues</span></div>}
              </>
            )}

            {rightTab === "chat" && (
              <div style={s.chatPanel}>
                {!atLimit && (
                  <div style={s.chatLimitBar}>
                    <span style={s.chatLimitText}>{remainingChats} free message{remainingChats !== 1 ? "s" : ""} remaining</span>
                    <button onClick={() => window.open(CHECKOUT_URL, "_blank")} style={s.chatLimitUpgrade}>Upgrade for unlimited</button>
                  </div>
                )}
                <div style={s.chatMessages}>
                  {chatMessages.length === 0 && !chatLoading && (
                    <div style={s.chatEmpty}>
                      <div style={s.chatEmptyIcon}>✦</div>
                      <p style={s.chatEmptyTitle}>CodeLens AI</p>
                      <p style={s.chatEmptyDesc}>{results ? "Ask me anything about your code." : "Run an analysis first."}</p>
                      {results && <div style={s.quickPrompts}>{QUICK_PROMPTS.map(prompt => <button key={prompt} style={s.quickPromptBtn} onClick={() => sendChatMessage(prompt)}>{prompt}</button>)}</div>}
                    </div>
                  )}
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} style={{ ...s.chatBubble, ...(msg.role === "user" ? s.chatBubbleUser : s.chatBubbleAI) }}>
                      <div style={msg.role === "user" ? s.chatLabelUser : s.chatLabelAI}>{msg.role === "user" ? "You" : "✦ CodeLens AI"}</div>
                      <div style={s.chatContent}>{formatMessage(msg.content)}</div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ ...s.chatBubble, ...s.chatBubbleAI }}>
                      <div style={s.chatLabelAI}>✦ CodeLens AI</div>
                      <div style={{ display: "flex", gap: 4, padding: "4px 0" }}><span style={{ fontSize: 8, color: "#6366f1" }}>●</span><span style={{ fontSize: 8, color: "#6366f1" }}>●</span><span style={{ fontSize: 8, color: "#6366f1" }}>●</span></div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
                <div style={s.chatInputArea}>
                  <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }} placeholder={atLimit ? "Upgrade to send more messages" : results ? "Ask about your code... (Enter to send)" : "Run analysis first..."} style={{ ...s.chatInputBox, opacity: atLimit ? 0.5 : 1 }} disabled={chatLoading || !results || atLimit} rows={2} />
                  <button onClick={() => atLimit ? setShowUpgrade(true) : sendChatMessage()} style={{ ...s.chatSendBtn, opacity: !chatInput.trim() && !atLimit ? 0.4 : 1 }}>
                    {atLimit ? "✦" : "↑"}
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

function formatMessage(text) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const code = part.replace(/^```\w*\n?/, "").replace(/```$/, "");
      return <pre key={i} style={{ backgroundColor: "#0a0e17", border: "1px solid #1a1f35", borderRadius: 6, padding: "10px 12px", fontSize: 12, overflowX: "auto", margin: "8px 0 4px", color: "#a5f3fc", fontFamily: "monospace", whiteSpace: "pre-wrap" }}><code>{code}</code></pre>;
    }
    const inline = part.split(/(`[^`]+`)/g);
    return <span key={i}>{inline.map((chunk, j) => chunk.startsWith("`") && chunk.endsWith("`") ? <code key={j} style={{ backgroundColor: "#1a1f35", padding: "1px 5px", borderRadius: 3, fontSize: 12, color: "#a5f3fc", fontFamily: "monospace" }}>{chunk.slice(1,-1)}</code> : <span key={j}>{chunk}</span>)}</span>;
  });
}

const m = {
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" },
  modal: { backgroundColor: "#0d1120", border: "1px solid #6366f140", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 420, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" },
  modalHeader: { marginBottom: 28 },
  sparkle: { fontSize: 32, color: "#6366f1", marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px" },
  modalSub: { fontSize: 13, color: "#64748b", margin: 0 },
  features: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, textAlign: "left" },
  feature: { display: "flex", alignItems: "center", gap: 10 },
  featureCheck: { color: "#10b981", fontSize: 14, fontWeight: 700, flexShrink: 0 },
  featureText: { fontSize: 13, color: "#94a3b8" },
  pricing: { marginBottom: 20 },
  price: { fontSize: 36, fontWeight: 700, color: "#f1f5f9" },
  pricePer: { fontSize: 14, color: "#64748b" },
  upgradeBtn: { width: "100%", padding: "14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 },
  dismissBtn: { width: "100%", padding: "10px", borderRadius: 10, border: "1px solid #1a1f35", backgroundColor: "transparent", color: "#475569", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
};

const a = {
  container: { minHeight: "100vh", backgroundColor: "#0a0e17", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", fontFamily: "'JetBrains Mono', monospace" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: `linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)`, backgroundSize: "40px 40px", pointerEvents: "none" },
  card: { position: "relative", zIndex: 1, backgroundColor: "#0d1120", border: "1px solid #1a1f35", borderRadius: 16, padding: "36px 40px", width: "100%", maxWidth: 420 },
  logoRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 32 },
  logoMark: { width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" },
  logoSlash: { color: "#fff", fontSize: 15, fontWeight: 700 },
  logoText: { fontSize: 20, fontWeight: 700, margin: 0, color: "#f1f5f9", letterSpacing: "-0.5px" },
  logoSub: { fontSize: 11, color: "#64748b", margin: 0 },
  tabs: { display: "flex", gap: 4, marginBottom: 24, backgroundColor: "#111628", borderRadius: 8, padding: 4 },
  tab: { flex: 1, padding: "8px 0", borderRadius: 6, border: "none", backgroundColor: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  tabActive: { backgroundColor: "#1a1f35", color: "#e2e8f0" },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, color: "#94a3b8" },
  input: { backgroundColor: "#111628", border: "1px solid #1a1f35", borderRadius: 8, color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", padding: "10px 14px", outline: "none" },
  error: { fontSize: 12, color: "#ff5555", margin: 0 },
  success: { fontSize: 12, color: "#10b981", margin: 0 },
  submitBtn: { padding: "12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4 },
  footer: { fontSize: 12, color: "#475569", textAlign: "center", marginTop: 20 },
  footerLink: { color: "#818cf8", cursor: "pointer" },
};

const s = {
  container: { minHeight: "100vh", backgroundColor: "#0a0e17", color: "#e2e8f0", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", position: "relative", overflow: "hidden" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: `linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)`, backgroundSize: "40px 40px", pointerEvents: "none" },
  app: { position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", padding: "0 20px", minHeight: "100vh", display: "flex", flexDirection: "column" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid #1a1f35" },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  logoMark: { width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" },
  logoSlash: { color: "#fff", fontSize: 15, fontWeight: 700 },
  logoText: { fontSize: 20, fontWeight: 700, margin: 0, color: "#f1f5f9", letterSpacing: "-0.5px", fontFamily: "'JetBrains Mono', monospace" },
  logoSub: { fontSize: 11, color: "#64748b", margin: 0 },
  langPicker: { display: "flex", gap: 6 },
  langBtn: { padding: "8px 14px", borderRadius: 8, border: "1px solid #1a1f35", backgroundColor: "transparent", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 },
  langBtnActive: { backgroundColor: "#1a1f35", color: "#e2e8f0", borderColor: "#6366f1" },
  langIcon: { fontSize: 14 },
  userArea: { display: "flex", alignItems: "center", gap: 10 },
  upgradeHeaderBtn: { padding: "7px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  userEmail: { fontSize: 11, color: "#475569" },
  signOutBtn: { padding: "6px 12px", borderRadius: 6, border: "1px solid #1a1f35", backgroundColor: "transparent", color: "#64748b", fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
  main: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1, padding: "16px 0 20px", minHeight: 0 },
  editorPanel: { display: "flex", flexDirection: "column", backgroundColor: "#0d1120", borderRadius: 12, border: "1px solid #1a1f35", overflow: "hidden" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #1a1f35", backgroundColor: "#0f1424", flexShrink: 0 },
  tabRow: { display: "flex", gap: 4, alignItems: "center" },
  tab: { padding: "6px 12px", borderRadius: 6, border: "none", backgroundColor: "transparent", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 },
  tabActive: { backgroundColor: "#1a1f35", color: "#e2e8f0" },
  tabBadge: { backgroundColor: "#ff555520", color: "#ff5555", fontSize: 10, padding: "1px 5px", borderRadius: 3, fontWeight: 700 },
  analyzeBtn: { padding: "8px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center" },
  editorContainer: { display: "flex", flex: 1, overflow: "hidden", minHeight: 500 },
  lineNumbers: { padding: "12px 0", textAlign: "right", userSelect: "none", overflowY: "hidden", minWidth: 56, backgroundColor: "#0b0f1a", borderRight: "1px solid #1a1f35", flexShrink: 0 },
  lineNum: { padding: "0 10px 0 6px", fontSize: 12, lineHeight: "20px", display: "flex", alignItems: "center", justifyContent: "flex-end" },
  textarea: { flex: 1, padding: "12px 16px", backgroundColor: "transparent", color: "#e2e8f0", border: "none", outline: "none", resize: "none", fontSize: 13, lineHeight: "20px", fontFamily: "monospace", tabSize: 4 },
  historyList: { flex: 1, overflowY: "auto", padding: 14 },
  historyItem: { padding: "12px 14px", backgroundColor: "#111628", borderRadius: 8, marginBottom: 8, border: "1px solid #1a1f35" },
  historyMeta: { display: "flex", justifyContent: "space-between", marginBottom: 6 },
  historyLang: { fontSize: 12, color: "#8b5cf6" },
  historyTime: { fontSize: 11, color: "#475569" },
  historyPreview: { fontSize: 11, color: "#94a3b8", margin: "0 0 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  historyIssues: { fontSize: 11, color: "#64748b" },
  resultsPanel: { display: "flex", flexDirection: "column", backgroundColor: "#0d1120", borderRadius: 12, border: "1px solid #1a1f35", overflow: "hidden" },
  summaryBadges: { display: "flex", gap: 6 },
  badge: { padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: "inherit" },
  badgeError: { backgroundColor: "#ff555520", color: "#ff5555" },
  badgeWarn: { backgroundColor: "#ffb86c20", color: "#ffb86c" },
  badgeInfo: { backgroundColor: "#8be9fd20", color: "#8be9fd" },
  resultsContent: { flex: 1, overflowY: "auto", padding: 14 },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 300, textAlign: "center", padding: 40 },
  emptyIcon: { fontSize: 40, color: "#2d3154", marginBottom: 16 },
  successIcon: { fontSize: 48, color: "#10b981", marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: "#94a3b8", margin: "0 0 8px" },
  emptyDesc: { fontSize: 13, color: "#475569", maxWidth: 320, lineHeight: 1.6, margin: "0 0 16px" },
  emptyText: { color: "#475569", fontSize: 13, textAlign: "center", padding: 40 },
  errorState: { padding: 20, backgroundColor: "#ff555510", borderRadius: 8, border: "1px solid #ff555530" },
  errorText: { color: "#ff5555", fontSize: 13, margin: 0 },
  switchToChatBtn: { padding: "8px 16px", borderRadius: 8, border: "1px solid #6366f140", backgroundColor: "#6366f115", color: "#818cf8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  issuesList: { display: "flex", flexDirection: "column", gap: 10 },
  issueCard: { backgroundColor: "#111628", borderRadius: 10, padding: "14px 16px", borderLeft: "3px solid" },
  issueHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  severityTag: { padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: "inherit" },
  lineTag: { fontSize: 11, color: "#64748b" },
  categoryTag: { fontSize: 10, color: "#475569", backgroundColor: "#1a1f35", padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" },
  issueMessage: { fontSize: 13, color: "#e2e8f0", margin: "0 0 10px", lineHeight: 1.5 },
  suggestionBox: { backgroundColor: "#0d1120", borderRadius: 6, padding: "10px 12px", border: "1px solid #1a1f35" },
  suggestionLabel: { fontSize: 11, fontWeight: 600, marginBottom: 4, display: "block" },
  suggestionText: { fontSize: 12, color: "#94a3b8", margin: 0, lineHeight: 1.5 },
  chatCta: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, padding: "12px 16px", backgroundColor: "#6366f110", borderRadius: 10, border: "1px solid #6366f125" },
  chatCtaText: { fontSize: 12, color: "#94a3b8", margin: 0 },
  chatCtaBtn: { padding: "7px 14px", borderRadius: 7, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  summaryFooter: { padding: "10px 14px", borderTop: "1px solid #1a1f35", fontSize: 11, color: "#475569", backgroundColor: "#0f1424", textAlign: "center", flexShrink: 0 },
  chatPanel: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" },
  chatLimitBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", backgroundColor: "#6366f110", borderBottom: "1px solid #6366f120", flexShrink: 0 },
  chatLimitText: { fontSize: 11, color: "#818cf8" },
  chatLimitUpgrade: { fontSize: 11, color: "#6366f1", backgroundColor: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" },
  chatMessages: { flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 12 },
  chatEmpty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", padding: 24, minHeight: 280 },
  chatEmptyIcon: { fontSize: 32, color: "#6366f1", marginBottom: 12 },
  chatEmptyTitle: { fontSize: 15, fontWeight: 600, color: "#94a3b8", margin: "0 0 8px" },
  chatEmptyDesc: { fontSize: 12, color: "#475569", maxWidth: 280, lineHeight: 1.6, margin: "0 0 20px" },
  quickPrompts: { display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 280 },
  quickPromptBtn: { padding: "8px 14px", borderRadius: 8, border: "1px solid #1a1f35", backgroundColor: "#111628", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  chatBubble: { maxWidth: "90%", padding: "10px 14px", borderRadius: 10, lineHeight: 1.6, fontSize: 13 },
  chatBubbleUser: { backgroundColor: "#1a1f35", color: "#e2e8f0", alignSelf: "flex-end", borderBottomRightRadius: 3 },
  chatBubbleAI: { backgroundColor: "#111628", color: "#cbd5e1", alignSelf: "flex-start", border: "1px solid #1a1f35", borderBottomLeftRadius: 3 },
  chatLabelUser: { fontSize: 10, color: "#6366f1", fontWeight: 700, marginBottom: 4 },
  chatLabelAI: { fontSize: 10, color: "#8b5cf6", fontWeight: 700, marginBottom: 4 },
  chatContent: { whiteSpace: "pre-wrap", wordBreak: "break-word" },
  chatInputArea: { display: "flex", gap: 8, padding: "10px 14px 14px", borderTop: "1px solid #1a1f35", backgroundColor: "#0f1424", flexShrink: 0, alignItems: "flex-end" },
  chatInputBox: { flex: 1, backgroundColor: "#111628", border: "1px solid #1a1f35", borderRadius: 10, color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", padding: "10px 14px", outline: "none", resize: "none", lineHeight: 1.5 },
  chatSendBtn: { width: 38, height: 38, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};
