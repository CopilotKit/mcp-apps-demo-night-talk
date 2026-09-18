"use client";

// Adapted from CopilotKit/examples/shadcn (MIT). See THIRD_PARTY_NOTICES.md.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  UseAgentUpdate,
  useAgent,
  useCopilotKit,
  useRenderActivityMessage,
} from "@copilotkit/react-core/v2";
import {
  ArrowsIn,
  ArrowsOut,
  ArrowUp,
  Square,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  MessageAnimated,
  MessageAnimatedLoading,
  MessageAnimatedMessagesProvider,
} from "@/components/message-animated";
import { pollBriefly } from "@/lib/poll";

export function DisconnectedChat({ needsKey = false }: { needsKey?: boolean }) {
  return (
    <ChatFrame
      disabled
      hint={
        needsKey
          ? "Set OPENAI_API_KEY in .env, restart, then refresh."
          : "Connect your MCP app to start the conversation."
      }
    />
  );
}

export function SparkyChat({ mapsEnabled = true }: { mapsEnabled?: boolean }) {
  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent({
    agentId: "default",
    updates: [
      UseAgentUpdate.OnMessagesChanged,
      UseAgentUpdate.OnRunStatusChanged,
    ],
    throttleMs: 50,
  });
  const { renderActivityMessage } = useRenderActivityMessage();
  const chatRoot = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [expandedActivity, setExpandedActivity] = useState<ReactNode>(null);
  const [mapLoadPhase, setMapLoadPhase] = useState<"idle" | "loading" | "ready">("idle");
  const sending = useRef(false);
  const [isSending, setIsSending] = useState(false);
  const messages = agent.messages;
  const pending = isSending || agent.isRunning;
  const visible = messages.filter(
    (m) =>
      m.role === "activity" ||
      (m.role !== "system" &&
        m.role !== "tool" &&
        (Boolean(m.content) ||
          (m.role === "assistant" && Boolean(m.toolCalls?.length)))),
  );
  const hasVisibleActivity = visible.some((message) => message.role === "activity");
  useEffect(() => {
    if (pending || mapLoadPhase === "idle") return;
    const settle = window.setTimeout(
      () => setMapLoadPhase("idle"),
      mapLoadPhase === "ready" ? 650 : 1200,
    );
    return () => window.clearTimeout(settle);
  }, [mapLoadPhase, pending]);
  async function send(content: string) {
    if (sending.current || agent.isRunning) return false;
    if (mapsEnabled && /\b(map|location|where)\b/i.test(content)) {
      setMapLoadPhase("loading");
    }
    sending.current = true;
    setIsSending(true);
    setError("");
    try {
      agent.addMessage({ id: crypto.randomUUID(), role: "user", content });
      await copilotkit.runAgent({ agent });
      return true;
    } catch (error) {
      setMapLoadPhase("idle");
      setError(
        error instanceof Error
          ? error.message
          : "The assistant could not be reached. Try again.",
      );
      return false;
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  }
  return (
    <>
      <ChatFrame
        containerRef={chatRoot}
        mapsEnabled={mapsEnabled}
        running={pending}
        onSend={send}
        onStop={() => agent.abortRun()}
        error={error}
      >
        {visible.length > 0 && (
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent
                aria-busy={pending}
                className="p-5 gap-5"
              >
                <MessageAnimatedMessagesProvider messages={messages}>
                  {visible.map((message) =>
                    message.role === "activity" ? (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        className="mcp-activity"
                      >
                        <ExpandableMcpActivity
                          onExpand={setExpandedActivity}
                          onReady={() => setMapLoadPhase("ready")}
                        >
                          {renderActivityMessage(message)}
                        </ExpandableMcpActivity>
                      </MessageScrollerItem>
                    ) : (
                      <MessageAnimated key={message.id} message={message} />
                    ),
                  )}
                  {mapLoadPhase !== "idle" && !hasVisibleActivity ? (
                    <div className="mcp-app-pending-shell">
                      <McpAppSkeleton />
                    </div>
                  ) : pending && visible.at(-1)?.role === "user" ? (
                    <MessageAnimatedLoading label="Sparky is thinking…" />
                  ) : null}
                </MessageAnimatedMessagesProvider>
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        )}
      </ChatFrame>
      <ExpandedMcpDialog
        content={expandedActivity}
        onClose={() => setExpandedActivity(null)}
      />
    </>
  );
}

function ExpandableMcpActivity({
  children,
  onExpand,
  onReady,
}: {
  children: ReactNode;
  onExpand: (content: ReactNode) => void;
  onReady: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const reportedReady = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mountedRoot = root.current;
    if (!mountedRoot) return;
    function checkReady() {
      if (!hasRenderedFrame(mountedRoot!)) return;
      setReady(true);
      if (!reportedReady.current) {
        reportedReady.current = true;
        onReady();
      }
    }
    return pollBriefly(checkReady, { every: 150 });
  }, []);

  return <div ref={root} className="mcp-app-inline-shell" aria-busy={!ready}>
    {!ready && <McpAppSkeleton />}
    <button
      className="mcp-app-expand-button"
      type="button"
      aria-label="Expand MCP app"
      title="Expand MCP app"
      disabled={!ready}
      onClick={() => onExpand(children)}
    >
      <ArrowsOut size={17} />
    </button>
    <div className={`mcp-app-inline-content${ready ? " is-ready" : ""}`}>
      {children}
    </div>
  </div>;
}

function hasRenderedFrame(root: ParentNode): boolean {
  for (const frame of root.querySelectorAll("iframe")) {
    try {
      const document = frame.contentDocument;
      if (!document) continue;
      if (document.querySelector(".leaflet-container")) return true;
      if (hasRenderedFrame(document)) return true;
      const text = document.body?.textContent?.trim();
      if (
        document.readyState === "complete" &&
        document.body?.children.length &&
        text &&
        !/^Loading(?:\.\.\.|…)?$/i.test(text)
      ) return true;
    } catch {
      // Cross-origin MCP apps reveal readiness through the iframe load itself.
      if (frame.contentWindow) return true;
    }
  }
  return false;
}

function McpAppSkeleton() {
  return <div className="mcp-map-skeleton" role="status" aria-label="Loading MCP app">
    <span className="sr-only">Loading MCP app…</span>
  </div>;
}

function ExpandedMcpDialog({
  content,
  onClose,
}: {
  content: ReactNode;
  onClose: () => void;
}) {
  const [modalBody, setModalBody] = useState<HTMLDivElement | null>(null);
  const open = Boolean(content);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    if (!modalBody) return;
    return pollBriefly(() => { if (hasRenderedFrame(modalBody)) setReady(true); });
  }, [modalBody, open]);

  return <Dialog.Root open={open} onOpenChange={(nextOpen) => {
    if (!nextOpen) onClose();
  }}>
    <Dialog.Portal>
      <Dialog.Overlay className="mcp-app-modal-overlay" />
      <Dialog.Content className="mcp-app-modal-content">
        <Dialog.Title className="sr-only">Expanded MCP app</Dialog.Title>
        <Dialog.Description className="sr-only">Expanded MCP app view</Dialog.Description>
        <Dialog.Close asChild>
          <button className="mcp-app-modal-close" type="button" aria-label="Close expanded MCP app" title="Close expanded MCP app">
            <ArrowsIn size={18} />
          </button>
        </Dialog.Close>
        <div ref={setModalBody} className="mcp-app-modal-body">
          {!ready && <McpAppSkeleton />}
          <div className={`mcp-app-modal-renderer${ready ? " is-ready" : ""}`}>
            {content}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function ChatFrame({
  mapsEnabled = true,
  disabled = false,
  hint,
  children,
  running = false,
  onSend,
  onStop,
  containerRef,
  error,
}: {
  mapsEnabled?: boolean;
  disabled?: boolean;
  hint?: string;
  children?: ReactNode;
  running?: boolean;
  onSend?: (content: string) => Promise<boolean>;
  onStop?: () => void;
  containerRef?: RefObject<HTMLDivElement | null>;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const busy = running || submitting;
  const starters = [
    mapsEnabled
      ? { label: "Map my orders", message: "Show my orders on a map." }
      : { label: "What’s delayed?", message: "Which orders are delayed?" },
    { label: "Ship FIZZ-1046", message: "Ship order FIZZ-1046." },
  ];
  async function deliver(text: string) {
    if (!onSend || disabled || busy) return true;
    setSubmitting(true);
    try {
      return await onSend(text);
    } finally {
      setSubmitting(false);
    }
  }
  async function submit() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    // Put the draft back if the send failed and the user has not typed since.
    if (!(await deliver(text))) setDraft((current) => current || text);
  }
  return (
    <MessageScrollerProvider>
      <motion.div
        ref={containerRef}
        className="shadcn-chat"
        initial={{ opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
      >
        <div className="chat-card">
          <div className="chat-content">
            {children || (
              <Empty className="h-full p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <span className="sparky-emoji" aria-hidden="true">🌊</span>
                  </EmptyMedia>
                  <EmptyTitle>{disabled ? "Sparky needs an API key" : "Sparky’s ready"}</EmptyTitle>
                  <EmptyDescription>
                    {disabled
                      ? hint
                      : mapsEnabled ? "Ask Sparky to put your orders on the map." : "Ask Sparky about today’s orders."}
                  </EmptyDescription>
                </EmptyHeader>
                {!disabled && <div className="chat-starters">
                  {starters.map(({ label, message }) => (
                    <Button key={label} variant="outline" size="sm" disabled={busy} onClick={() => void deliver(message)}>
                      {label} <ArrowUp />
                    </Button>
                  ))}
                </div>}
              </Empty>
            )}
          </div>
          <div className="chat-composer">
            <form
              className="w-full"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <InputGroup>
                <InputGroupTextarea
                  aria-label="Message Sparky"
                  placeholder={
                    disabled
                      ? "Add your key to enable chat…"
                      : "Ask Sparky anything…"
                  }
                  disabled={disabled || busy}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                  className="min-h-16 max-h-32 resize-none"
                />
                <InputGroupAddon align="block-end" className="pt-1 justify-end">
                  {busy ? (
                    <InputGroupButton
                      type="button"
                      variant="default"
                      size="icon-sm"
                      className="ml-auto"
                      onClick={onStop}
                      aria-label="Stop response"
                    >
                      <Square weight="fill" />
                    </InputGroupButton>
                  ) : (
                    <InputGroupButton
                      type="submit"
                      variant="default"
                      size="icon-sm"
                      disabled={disabled || !draft.trim()}
                      className="ml-auto"
                      aria-label="Send message"
                    >
                      <ArrowUp />
                    </InputGroupButton>
                  )}
                </InputGroupAddon>
              </InputGroup>
            </form>
            {error && (
              <p className="chat-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </MessageScrollerProvider>
  );
}
