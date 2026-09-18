import { Fragment } from "react";

const keywords = new Set([
  "async", "await", "const", "export", "from", "import", "new", "return",
]);
// Property names that appear in the demo snippets, so they read as keys rather than plain identifiers.
const properties = new Set([
  "agents", "basePath", "content", "default", "handler", "inputSchema", "mcpApps", "model",
  "name", "outputSchema", "parameters", "serverId", "servers", "structuredContent", "type", "url", "view",
]);
// Capitalized identifiers are already styled as types; list only the lowercase framework hooks.
const types = new Set(["useFrontendTool", "useToolContext"]);
const tokenPattern = /(\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|[A-Za-z_$][\w$-]*|\s+|.)/g;

function tokenClass(token: string) {
  if (token.startsWith("//")) return "syntax-comment";
  if (/^["'`]/.test(token)) return "syntax-string";
  if (/^\d/.test(token)) return "syntax-number";
  if (keywords.has(token)) return "syntax-keyword";
  if (types.has(token) || /^[A-Z]/.test(token)) return "syntax-type";
  if (properties.has(token)) return "syntax-property";
  if (/^[A-Za-z_$]/.test(token)) return "syntax-name";
  return "syntax-punctuation";
}

export function SyntaxCode({ code, className = "" }: { code: string; className?: string }) {
  const tokens = code.match(tokenPattern) ?? [];
  return (
    <pre className={className}>
      <code>
        {tokens.map((token, index) => /^\s+$/.test(token)
          ? <Fragment key={index}>{token}</Fragment>
          : <span key={index} className={tokenClass(token)}>{token}</span>)}
      </code>
    </pre>
  );
}
