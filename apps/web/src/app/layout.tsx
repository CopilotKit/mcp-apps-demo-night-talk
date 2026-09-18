import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource/caveat/latin-400.css";
import "@fontsource/caveat/latin-700.css";
import "@copilotkit/react-core/v2/styles.css";
import "./globals.css";
import "./chat-theme.css";
import "./event-workspace.css";
export const metadata: Metadata = {
  title: "Fizzy Business · MCP Apps × CopilotKit",
  description: "A sparkling-water order desk with an MCP-powered map.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
