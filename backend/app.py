"""
CodeLens Debugger — Flask Backend
==================================
Analyzes code for bugs, style issues, and potential errors.
Supports: Python, JavaScript, Java, C++

Analysis methods:
  - AST parsing (Python)
  - Pattern-based detection (all languages)
  - Common bug pattern matching
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import ast
import re
import traceback
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# In-memory storage for analysis history
analysis_history = []


# ============================================================================
# Language Detection
# ============================================================================

def detect_language(code):
    """Auto-detect programming language from code content."""
    code_lower = code.strip().lower()

    # Python indicators
    if any(kw in code for kw in ['def ', 'import ', 'print(', 'elif ', 'self.', '__init__']):
        return 'python'

    # Java indicators
    if any(kw in code for kw in ['public static void', 'System.out', 'public class', 'private ', 'String[]']):
        return 'java'

    # C++ indicators
    if any(kw in code for kw in ['#include', 'cout', 'cin', 'std::', 'nullptr', '->',  'int main()']):
        return 'cpp'

    # JavaScript indicators
    if any(kw in code for kw in ['const ', 'let ', 'var ', '=>', 'console.log', 'function ', 'document.']):
        return 'javascript'

    return 'python'  # default fallback


# ============================================================================
# Python Analyzer (AST-based)
# ============================================================================

class PythonAnalyzer:
    def __init__(self, code):
        self.code = code
        self.lines = code.split('\n')
        self.issues = []

    def analyze(self):
        self._check_syntax()
        self._check_common_bugs()
        self._check_style()
        self._check_best_practices()
        return self.issues

    def _add_issue(self, severity, line, message, suggestion, category="bug"):
        self.issues.append({
            'severity': severity,       # error, warning, info
            'line': line,
            'message': message,
            'suggestion': suggestion,
            'category': category,
        })

    def _check_syntax(self):
        """Try to parse the AST — catch syntax errors."""
        try:
            tree = ast.parse(self.code)
            self._analyze_ast(tree)
        except SyntaxError as e:
            self._add_issue(
                'error', e.lineno or 1,
                f"Syntax Error: {e.msg}",
                f"Fix the syntax at line {e.lineno}: check for missing colons, brackets, or indentation.",
                "syntax"
            )

    def _analyze_ast(self, tree):
        """Walk the AST looking for common issues."""
        for node in ast.walk(tree):
            # Bare except clause
            if isinstance(node, ast.ExceptHandler) and node.type is None:
                self._add_issue(
                    'warning', node.lineno,
                    "Bare 'except:' catches all exceptions including KeyboardInterrupt and SystemExit.",
                    "Specify the exception type: except ValueError: or except Exception:",
                    "best_practice"
                )

            # Mutable default arguments
            if isinstance(node, ast.FunctionDef):
                for default in node.args.defaults:
                    if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                        self._add_issue(
                            'warning', node.lineno,
                            f"Mutable default argument in function '{node.name}'. This is shared across all calls.",
                            "Use None as default and create the mutable object inside the function: def f(x=None): x = x or []",
                            "bug"
                        )

                # Check for unused variables in function
                assigned = set()
                used = set()
                for child in ast.walk(node):
                    if isinstance(child, ast.Assign):
                        for target in child.targets:
                            if isinstance(target, ast.Name):
                                assigned.add(target.id)
                    if isinstance(child, ast.Name) and isinstance(child.ctx, ast.Load):
                        used.add(child.id)

                unused = assigned - used - {'_', 'self'}
                for var in unused:
                    self._add_issue(
                        'info', node.lineno,
                        f"Variable '{var}' is assigned but never used in function '{node.name}'.",
                        f"Remove the unused variable or use it in your logic.",
                        "style"
                    )

            # Comparison to None using == instead of is
            if isinstance(node, ast.Compare):
                for op, comparator in zip(node.ops, node.comparators):
                    if isinstance(op, (ast.Eq, ast.NotEq)) and isinstance(comparator, ast.Constant) and comparator.value is None:
                        self._add_issue(
                            'warning', node.lineno,
                            "Comparison to None should use 'is' or 'is not', not '==' or '!='.",
                            "Replace '== None' with 'is None' or '!= None' with 'is not None'.",
                            "style"
                        )

            # Using 'type()' for type checking
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'type':
                # Check if it's in a comparison
                self._add_issue(
                    'info', node.lineno,
                    "Using type() for type checking. isinstance() is usually preferred.",
                    "Use isinstance(obj, ClassName) instead of type(obj) == ClassName.",
                    "best_practice"
                )

    def _check_common_bugs(self):
        """Pattern-based bug detection."""
        for i, line in enumerate(self.lines, 1):
            stripped = line.strip()

            # Division by zero risk
            if re.search(r'/\s*0\b', stripped) and not stripped.startswith('#'):
                self._add_issue('error', i,
                    "Potential division by zero.",
                    "Add a check before dividing: if divisor != 0: result = x / divisor",
                    "bug")

            # Using 'is' to compare values (not identity)
            match = re.search(r'\bis\s+(\d+)', stripped)
            if match and not stripped.startswith('#'):
                self._add_issue('warning', i,
                    f"Using 'is' to compare with integer {match.group(1)}. 'is' checks identity, not equality.",
                    "Use '==' for value comparison. 'is' only works reliably for None, True, False.",
                    "bug")

            # Infinite loop risk
            if stripped == 'while True:':
                # Check if there's a break in the next few lines
                has_break = any('break' in self.lines[j] for j in range(i, min(i + 20, len(self.lines))))
                if not has_break:
                    self._add_issue('warning', i,
                        "while True loop without a visible break statement — potential infinite loop.",
                        "Add a break condition or use a bounded loop like 'while condition:'",
                        "bug")

            # String concatenation in loop
            if re.search(r'\+\s*=.*["\']', stripped) and any('for ' in self.lines[j] for j in range(max(0, i-5), i)):
                self._add_issue('info', i,
                    "String concatenation with += in a loop is inefficient in Python.",
                    "Use a list and ''.join() for better performance: parts.append(s); result = ''.join(parts)",
                    "performance")

            # Global variable usage
            if stripped.startswith('global '):
                self._add_issue('info', i,
                    "Using global variables can make code harder to test and debug.",
                    "Consider passing values as function parameters or using a class instead.",
                    "best_practice")

    def _check_style(self):
        """Check style and formatting issues."""
        for i, line in enumerate(self.lines, 1):
            # Line too long
            if len(line) > 120:
                self._add_issue('info', i,
                    f"Line is {len(line)} characters long (PEP 8 recommends max 79-120).",
                    "Break the line into multiple lines for readability.",
                    "style")

            # Trailing whitespace
            if line != line.rstrip() and line.strip():
                self._add_issue('info', i,
                    "Trailing whitespace detected.",
                    "Remove trailing spaces at the end of the line.",
                    "style")

            # Mixed tabs and spaces
            if '\t' in line and '    ' in line:
                self._add_issue('warning', i,
                    "Mixed tabs and spaces for indentation.",
                    "Use consistent indentation — PEP 8 recommends 4 spaces.",
                    "style")

    def _check_best_practices(self):
        """Check for Python best practice violations."""
        full_code = self.code

        # Using print for debugging (in functions)
        if 'def ' in full_code:
            for i, line in enumerate(self.lines, 1):
                if re.match(r'\s+print\(', line) and not line.strip().startswith('#'):
                    # Check if it looks like debug output
                    if any(kw in line.lower() for kw in ['debug', 'test', 'here', 'xxx', 'todo']):
                        self._add_issue('info', i,
                            "Debug print statement found. Consider using logging instead.",
                            "import logging; logging.debug() for debug output that can be toggled.",
                            "best_practice")

        # Missing docstrings on functions
        try:
            tree = ast.parse(self.code)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    if not (node.body and isinstance(node.body[0], ast.Expr) and isinstance(node.body[0].value, ast.Constant)):
                        if len(node.body) > 3:  # Only flag substantial functions
                            self._add_issue('info', node.lineno,
                                f"Function '{node.name}' has no docstring.",
                                f"Add a docstring: def {node.name}(...):\n    \"\"\"Description of what this function does.\"\"\"",
                                "best_practice")
        except SyntaxError:
            pass


# ============================================================================
# JavaScript Analyzer
# ============================================================================

class JavaScriptAnalyzer:
    def __init__(self, code):
        self.code = code
        self.lines = code.split('\n')
        self.issues = []

    def analyze(self):
        self._check_common_bugs()
        self._check_style()
        return self.issues

    def _add_issue(self, severity, line, message, suggestion, category="bug"):
        self.issues.append({
            'severity': severity,
            'line': line,
            'message': message,
            'suggestion': suggestion,
            'category': category,
        })

    def _check_common_bugs(self):
        for i, line in enumerate(self.lines, 1):
            stripped = line.strip()

            # Using var instead of let/const
            if re.match(r'\bvar\s+', stripped):
                self._add_issue('warning', i,
                    "'var' has function-scoping issues and is hoisted unexpectedly.",
                    "Use 'let' for variables that change, or 'const' for constants.",
                    "best_practice")

            # == instead of ===
            if re.search(r'[^=!]==[^=]', stripped) and not stripped.startswith('//'):
                self._add_issue('warning', i,
                    "Using '==' (loose equality) which performs type coercion.",
                    "Use '===' (strict equality) to avoid unexpected type coercion bugs.",
                    "bug")

            # != instead of !==
            if re.search(r'!=[^=]', stripped) and not stripped.startswith('//'):
                self._add_issue('warning', i,
                    "Using '!=' (loose inequality) which performs type coercion.",
                    "Use '!==' (strict inequality) for safer comparisons.",
                    "bug")

            # Missing semicolons (basic check)
            if stripped and not stripped.startswith('//') and not stripped.startswith('/*'):
                if stripped.endswith(')') or (re.match(r'^(let|const|var|return)\s', stripped) and not stripped.endswith(';') and not stripped.endswith('{')):
                    if not any(stripped.endswith(c) for c in ['{', '}', '(', ',', '=>']):
                        self._add_issue('info', i,
                            "Possible missing semicolon.",
                            "Add a semicolon at the end of the statement for consistency.",
                            "style")

            # Console.log in production code
            if 'console.log' in stripped and not stripped.startswith('//'):
                self._add_issue('info', i,
                    "console.log() found — remember to remove debug logging before production.",
                    "Use a proper logging library or remove before deploying.",
                    "best_practice")

            # Callback hell indicator
            indent = len(line) - len(line.lstrip())
            if indent > 24 and ('=>' in stripped or 'function' in stripped):
                self._add_issue('info', i,
                    "Deeply nested callbacks detected (callback hell).",
                    "Consider using async/await or Promise.all() for cleaner async code.",
                    "best_practice")

            # Division by zero
            if re.search(r'/\s*0\b', stripped) and not stripped.startswith('//'):
                self._add_issue('error', i,
                    "Potential division by zero.",
                    "Add a check: if (divisor !== 0) { result = x / divisor; }",
                    "bug")

    def _check_style(self):
        for i, line in enumerate(self.lines, 1):
            if len(line) > 120:
                self._add_issue('info', i,
                    f"Line is {len(line)} characters long.",
                    "Break into multiple lines for readability.", "style")


# ============================================================================
# Java Analyzer
# ============================================================================

class JavaAnalyzer:
    def __init__(self, code):
        self.code = code
        self.lines = code.split('\n')
        self.issues = []

    def analyze(self):
        self._check_common_bugs()
        self._check_style()
        return self.issues

    def _add_issue(self, severity, line, message, suggestion, category="bug"):
        self.issues.append({
            'severity': severity, 'line': line,
            'message': message, 'suggestion': suggestion, 'category': category,
        })

    def _check_common_bugs(self):
        for i, line in enumerate(self.lines, 1):
            stripped = line.strip()

            # String comparison with ==
            if re.search(r'==\s*"', stripped) and 'String' in self.code:
                self._add_issue('error', i,
                    "Comparing strings with '==' checks reference equality, not content.",
                    "Use .equals() for string comparison: str1.equals(str2)",
                    "bug")

            # Null pointer risk
            if re.search(r'\.length\b|\.size\(\)|\.get\(', stripped):
                # Check if there's a null check before
                prev_lines = '\n'.join(self.lines[max(0,i-3):i-1])
                if 'null' not in prev_lines and 'if' not in prev_lines:
                    self._add_issue('warning', i,
                        "Potential NullPointerException — method called without null check.",
                        "Add a null check: if (obj != null) { obj.method(); }",
                        "bug")

            # Empty catch block
            if stripped == 'catch' or re.search(r'catch\s*\([^)]*\)\s*\{\s*\}', stripped):
                self._add_issue('warning', i,
                    "Empty catch block silently swallows exceptions.",
                    "Log the exception or handle it: catch (Exception e) { e.printStackTrace(); }",
                    "bug")

            # System.out.println in production
            if 'System.out.print' in stripped:
                self._add_issue('info', i,
                    "System.out.println() used — consider using a logging framework.",
                    "Use java.util.logging or SLF4J for configurable logging.",
                    "best_practice")

            # Raw types
            if re.search(r'\bArrayList\s*[^<]|List\s+\w+\s*=\s*new\s+ArrayList\s*\(\)', stripped):
                self._add_issue('warning', i,
                    "Raw type used without generics — loses type safety.",
                    "Use generics: ArrayList<String> list = new ArrayList<>();",
                    "best_practice")

            # Resource leak
            if re.search(r'new\s+(Scanner|BufferedReader|FileReader|FileWriter|Connection)', stripped):
                has_try = any('try' in self.lines[j] for j in range(max(0, i-3), i))
                if not has_try:
                    self._add_issue('warning', i,
                        "Resource opened without try-with-resources — potential resource leak.",
                        "Use try-with-resources: try (Scanner sc = new Scanner(file)) { ... }",
                        "bug")

    def _check_style(self):
        for i, line in enumerate(self.lines, 1):
            stripped = line.strip()
            if len(line) > 120:
                self._add_issue('info', i,
                    f"Line is {len(line)} characters long.", "Break into multiple lines.", "style")

            # Class name not capitalized
            match = re.match(r'(public\s+)?class\s+([a-z]\w*)', stripped)
            if match:
                self._add_issue('warning', i,
                    f"Class name '{match.group(2)}' should start with an uppercase letter.",
                    f"Rename to '{match.group(2).capitalize()}' following Java naming conventions.",
                    "style")


# ============================================================================
# C++ Analyzer
# ============================================================================

class CppAnalyzer:
    def __init__(self, code):
        self.code = code
        self.lines = code.split('\n')
        self.issues = []

    def analyze(self):
        self._check_common_bugs()
        self._check_style()
        return self.issues

    def _add_issue(self, severity, line, message, suggestion, category="bug"):
        self.issues.append({
            'severity': severity, 'line': line,
            'message': message, 'suggestion': suggestion, 'category': category,
        })

    def _check_common_bugs(self):
        for i, line in enumerate(self.lines, 1):
            stripped = line.strip()

            # Array out of bounds risk
            if re.search(r'\[\s*\w+\s*\]', stripped) and not stripped.startswith('//'):
                if 'for' in '\n'.join(self.lines[max(0,i-3):i]):
                    self._add_issue('info', i,
                        "Array access in a loop — ensure bounds checking.",
                        "Use .at() for bounds-checked access or verify index < size.",
                        "bug")

            # Memory leak: new without delete
            if re.search(r'\bnew\s+\w+', stripped) and not stripped.startswith('//'):
                self._add_issue('warning', i,
                    "Dynamic allocation with 'new' — ensure matching delete or use smart pointers.",
                    "Use std::unique_ptr or std::shared_ptr instead of raw new/delete.",
                    "bug")

            # Using namespace std
            if stripped == 'using namespace std;':
                self._add_issue('warning', i,
                    "'using namespace std;' can cause name collisions in larger projects.",
                    "Use specific imports: using std::cout; using std::string; or prefix with std::",
                    "best_practice")

            # Uninitialized variables
            match = re.match(r'\s*(int|float|double|char|bool)\s+(\w+)\s*;', stripped)
            if match and '=' not in stripped:
                self._add_issue('warning', i,
                    f"Variable '{match.group(2)}' declared without initialization — undefined behavior if read.",
                    f"Initialize on declaration: {match.group(1)} {match.group(2)} = 0;",
                    "bug")

            # Division by zero
            if re.search(r'/\s*0\b', stripped) and not stripped.startswith('//'):
                self._add_issue('error', i,
                    "Potential division by zero — undefined behavior in C++.",
                    "Add a zero check before dividing.",
                    "bug")

            # gets() usage (buffer overflow)
            if 'gets(' in stripped:
                self._add_issue('error', i,
                    "gets() is vulnerable to buffer overflow and was removed in C++14.",
                    "Use std::getline(std::cin, str) or fgets() instead.",
                    "security")

            # Magic numbers
            if re.search(r'[=<>]\s*\d{2,}', stripped) and not stripped.startswith('//') and '#define' not in stripped:
                self._add_issue('info', i,
                    "Magic number detected — unnamed numeric constants reduce readability.",
                    "Define as a named constant: const int MAX_SIZE = 100;",
                    "style")

    def _check_style(self):
        for i, line in enumerate(self.lines, 1):
            if len(line) > 120:
                self._add_issue('info', i,
                    f"Line is {len(line)} characters long.", "Keep lines under 120 characters.", "style")


# ============================================================================
# Main Analysis Function
# ============================================================================

def analyze_code(code, language=None):
    """Run analysis on the provided code."""
    if not language:
        language = detect_language(code)

    analyzers = {
        'python': PythonAnalyzer,
        'javascript': JavaScriptAnalyzer,
        'java': JavaAnalyzer,
        'cpp': CppAnalyzer,
    }

    analyzer_class = analyzers.get(language, PythonAnalyzer)
    analyzer = analyzer_class(code)
    issues = analyzer.analyze()

    # Sort by severity: errors first, then warnings, then info
    severity_order = {'error': 0, 'warning': 1, 'info': 2}
    issues.sort(key=lambda x: (severity_order.get(x['severity'], 3), x['line']))

    # Summary stats
    summary = {
        'total_issues': len(issues),
        'errors': sum(1 for i in issues if i['severity'] == 'error'),
        'warnings': sum(1 for i in issues if i['severity'] == 'warning'),
        'info': sum(1 for i in issues if i['severity'] == 'info'),
        'language': language,
        'lines_of_code': len([l for l in code.split('\n') if l.strip()]),
    }

    return {'issues': issues, 'summary': summary}


# ============================================================================
# API Routes
# ============================================================================

@app.route('/api/analyze', methods=['POST'])
def api_analyze():
    """Analyze code and return issues."""
    data = request.json
    if not data or not data.get('code'):
        return jsonify({'error': 'No code provided'}), 400

    code = data['code']
    language = data.get('language')  # optional, auto-detects if not provided

    result = analyze_code(code, language)

    # Save to history
    analysis_history.append({
        'id': len(analysis_history) + 1,
        'code_preview': code[:100] + ('...' if len(code) > 100 else ''),
        'language': result['summary']['language'],
        'issues_count': result['summary']['total_issues'],
        'timestamp': datetime.now().isoformat(),
    })

    return jsonify(result)


@app.route('/api/history', methods=['GET'])
def api_history():
    """Get analysis history."""
    return jsonify(list(reversed(analysis_history[-50:])))  # last 50


@app.route('/api/languages', methods=['GET'])
def api_languages():
    """Get supported languages."""
    return jsonify({
        'languages': [
            {'id': 'python', 'name': 'Python', 'icon': '🐍'},
            {'id': 'javascript', 'name': 'JavaScript', 'icon': '⚡'},
            {'id': 'java', 'name': 'Java', 'icon': '☕'},
            {'id': 'cpp', 'name': 'C++', 'icon': '⚙️'},
        ]
    })


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
