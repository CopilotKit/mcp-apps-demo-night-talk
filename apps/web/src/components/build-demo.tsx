"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowsOut, ArrowsIn, X } from "@phosphor-icons/react";
import { CopilotKit, useAgentContext, useFrontendTool } from "@copilotkit/react-core/v2";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { z } from "zod";
import { AppWorkbench } from "@/components/app-workbench";
import { Handwriting } from "@/components/handwriting";
import { OrderAdmin } from "@/components/order-admin";
import { DisconnectedChat, SparkyChat } from "@/components/sparky-chat";
import { SyntaxCode } from "@/components/syntax-code";
import { orders, mapForOrders, type Order } from "@/lib/map-app";

// Tells the runtime which stage is talking, so "Add chat" gets an agent without map tools.
const STAGE_HEADERS = { chat: { "x-demo-stage": "chat" }, maps: { "x-demo-stage": "maps" } };

// The demo is a five-step build. Each stage reveals one more piece of the app.
const STAGES = ["Our app", "Add chat", "Create an MCP App", "Add the MCP App", "All together"] as const;
const CHAT_STAGES = [1, 4];
const STUDIO_STAGES = [2, 3];

const CHAT_SNIPPET = `<CopilotPopup />

useFrontendTool({
  name: "shipOrders",
  parameters: z.object({
    all: z.boolean().optional(),
    orderIds: z.array(z.string()).optional(),
  }),
  handler: ({ all, orderIds }) =>
    shipOrders({ all, orderIds }),
});`;

type ShipOrdersArgs = { all?: boolean; orderIds?: string[] };
type ShipOrdersResult = { ok: boolean; message: string; orderIds?: string[]; status?: "Shipping" };
export function BuildDemo() {
  const [appWindow, setAppWindow] = useState<HTMLElement | null>(null);
  const [records, setRecords] = useState(orders);
  const [shippingOrderIds, setShippingOrderIds] = useState<string[]>([]);
  const shippingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateRecords = useCallback((next: Order[]) => setRecords(next), []);
  const shipOrders = useCallback(({ all = false, orderIds = [] }: ShipOrdersArgs): ShipOrdersResult => {
    const requestedIds = all
      ? records.map(record => record.id)
      : [...new Set(orderIds.map(orderId => orderId.trim().toUpperCase()))];
    const matchedIds = records.filter(record => requestedIds.includes(record.id)).map(record => record.id);
    if (!matchedIds.length) return { ok: false, message: "No matching orders were found." };

    updateRecords(records.map(record => matchedIds.includes(record.id) ? { ...record, status: "Shipping" } : record));
    setShippingOrderIds(matchedIds);
    if (shippingTimer.current) clearTimeout(shippingTimer.current);
    shippingTimer.current = setTimeout(() => setShippingOrderIds([]), 1400);
    const missingIds = requestedIds.filter(orderId => !matchedIds.includes(orderId));
    return {
      ok: missingIds.length === 0,
      orderIds: matchedIds,
      status: "Shipping",
      message: all
        ? `All ${matchedIds.length} orders are shipping.`
        : `${matchedIds.join(", ")} ${matchedIds.length === 1 ? "is" : "are"} on the way.${missingIds.length ? ` No order was found for ${missingIds.join(", ")}.` : ""}`,
    };
  }, [records, updateRecords]);
  useEffect(() => () => {
    if (shippingTimer.current) clearTimeout(shippingTimer.current);
  }, []);
  const [stage, setStage] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const studioOpen = STUDIO_STAGES.includes(stage);
  const chatOpen = CHAT_STAGES.includes(stage);
  const [studioMounted, setStudioMounted] = useState(false);

  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const chatLauncher = useRef<HTMLButtonElement>(null);
  function selectStage(next: number) {
    setStage(next); setChatPopupOpen(false); setChatExpanded(false);
    // Mount the studio lazily, then keep it mounted so the map preview survives tab changes.
    if (STUDIO_STAGES.includes(next)) setStudioMounted(true);
  }
  useEffect(() => {
    appWindow?.querySelector<HTMLElement>(".event-shell")?.scrollTo({ top: 0, left: 0 });
  }, [appWindow, stage]);
  useEffect(() => {
    fetch("/api/connection").then(r => r.json()).then(data => setModelReady(Boolean(data.modelReady))).catch(() => {});
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (chatExpanded) setChatExpanded(false);
      else if (chatPopupOpen) {
        setChatPopupOpen(false);
        requestAnimationFrame(() => chatLauncher.current?.focus());
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [chatExpanded, chatPopupOpen]);
  return (
    <MotionConfig reducedMotion="user">
      <div className="demo-stage">
        <header className="demo-stage-heading">
          <div><span className="demo-stage-brand">CopilotKit <span>×</span> MCP Apps</span></div>
        </header>
        <BuildTabs stage={stage} onSelect={selectStage} />
        <div id="build-panel" role="tabpanel" aria-labelledby={`build-tab-${stage}`}>
        {stage === 1 && <>
          <PresentationHeading title="Add chat" note="first we add the React component" />
          <div className="chat-code-panel"><div className="source-stage-label"><span className="source-file-dot" /><span>apps/web/src/app/page.tsx</span></div><SyntaxCode className="chat-code-strip syntax-code" code={CHAT_SNIPPET} /></div>
          <div className="presentation-payoff"><Handwriting className="animated-handwriting">Now our app has chat!</Handwriting></div>
        </>}
        {stage === 0 && <PresentationHeading title="Start with our app" note="sparkling water, serious operations" />}
        {stage === 4 && <PresentationHeading title="All together" note="chat and maps, right where the work happens" />}
        <section ref={setAppWindow} className={`application-window ${stage === 1 ? "chat-demo-window" : ""}`} aria-label="SaaS application preview">
          <div className="application-window-toolbar">
            <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
            <span className="window-location">{stage === 2 ? "apps/map-app" : stage === 3 ? "Fizzy Business / Integration" : "Fizzy Business / Orders"}</span>
          </div>
          <div className="event-shell">
        <header className="crm-app-header" hidden={studioOpen}><span className="crm-workspace"><BottleLogo /><strong>Fizzy Business Co.</strong></span><span>Operations / Orders</span><span className="crm-user">CEO</span></header>
        <main className="event-main" hidden={studioOpen}>
          <div className="event-layout">
            <div className="event-overview">
              <OrderAdmin portalContainer={appWindow} records={records} onChange={updateRecords} shippingOrderIds={shippingOrderIds} />

            </div>
            <motion.section
              id="sparky-popup"
              className={`event-copilot chat-popup ${chatExpanded ? "copilot-expanded" : ""}`}
              style={{
                display: chatOpen ? "flex" : "none",
                pointerEvents: chatPopupOpen ? "auto" : "none",
                visibility: chatPopupOpen ? "visible" : "hidden",
              }}
              initial={false}
              animate={chatPopupOpen ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              aria-label="Sparky chat"
              aria-hidden={!chatPopupOpen}
            >
              <div className="surface-heading"><span><span className="sparky-emoji" aria-hidden="true">🌊</span> Sparky</span><div className="copilot-actions">
                <button className="icon-button" aria-label={chatExpanded ? "Collapse copilot" : "Expand copilot"} onClick={() => setChatExpanded(value => !value)}>{chatExpanded ? <ArrowsIn size={18} /> : <ArrowsOut size={18} />}</button>
                <button className="icon-button" aria-label="Close Sparky" onClick={() => { setChatExpanded(false); setChatPopupOpen(false); requestAnimationFrame(() => chatLauncher.current?.focus()); }}><X size={18} /></button>
              </div></div>
              <div className="event-chat-body">
                {/* Two chat trees: the "Add chat" stage has no map tools, "All together" does. Both stay mounted so each keeps its history. */}
                {[false, true].map(maps => <div key={String(maps)} className="chat-stage-body" hidden={stage !== (maps ? 4 : 1)}>
                  {modelReady ? <CopilotKit runtimeUrl="/api/copilotkit" headers={STAGE_HEADERS[maps ? "maps" : "chat"]} showDevConsole={false}><OrderContext records={records} /><OrderTools shipOrders={shipOrders} /><SparkyChat mapsEnabled={maps} /></CopilotKit> : <DisconnectedChat needsKey />}
                </div>)}
              </div>
            </motion.section>
          </div>

        </main>
        <AnimatePresence>
          {chatOpen && !chatPopupOpen && <motion.button
            ref={chatLauncher}
            className="chat-launcher"
            type="button"
            aria-label="Open Sparky"
            aria-controls="sparky-popup"
            aria-expanded="false"
            initial={{ opacity: 0, scale: 0.75, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.75, y: 10 }}
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => setChatPopupOpen(true)}
          >
            <span className="sparky-emoji" aria-hidden="true">🌊</span>
          </motion.button>}
        </AnimatePresence>
        {studioMounted && <div hidden={!studioOpen}><AppWorkbench mode={stage === 2 ? "create" : "connect"} records={records} /></div>}
          </div>
        </section>
        </div>
      </div>
    </MotionConfig>
  );
}

function BuildTabs({ stage, onSelect }: { stage: number; onSelect: (stage: number) => void }) {
  const last = STAGES.length - 1;
  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const next = { ArrowRight: (index + 1) % STAGES.length, ArrowLeft: (index + last) % STAGES.length, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSelect(next);
    document.getElementById(`build-tab-${next}`)?.focus();
  }
  return <nav className="build-tabs" role="tablist" aria-label="Build your app">
    {STAGES.map((label, index) => (
      <button key={label} id={`build-tab-${index}`} role="tab" aria-selected={stage === index} aria-controls="build-panel" tabIndex={stage === index ? 0 : -1}
        onClick={() => onSelect(index)} onKeyDown={event => onKeyDown(event, index)}>
        {stage === index && <motion.span className="active-tab-paper" layoutId="build-tab-paper" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
        <span className="build-tab-number">0{index + 1}</span><span>{label}</span>
      </button>
    ))}
  </nav>;
}

function PresentationHeading({ title, note, inWindow = false }: { title: string; note: string; inWindow?: boolean }) {
  return <div className={`presentation-heading ${inWindow ? "presentation-heading-window" : ""}`}>
    <h1>{title}<Handwriting className="animated-handwriting">{note}</Handwriting></h1>
  </div>;
}

function OrderContext({ records }: { records: Order[] }) {
  useAgentContext({ description: "Fictional sparkling-water orders and the complete arguments for show-map. Use these coordinates; do not invent addresses. These are approximate delivery locations.", value: { orders: records, map: mapForOrders(records) } });
  return null;
}

function OrderTools({ shipOrders }: { shipOrders: (args: ShipOrdersArgs) => ShipOrdersResult }) {
  useFrontendTool<ShipOrdersArgs>({
    name: "shipOrders",
    description: "Mark Fizzy Business orders as Shipping. For 'ship it all' pass all: true. For named orders pass their exact FIZZ IDs in orderIds.",
    parameters: z.object({
      all: z.boolean().optional().describe("True when the user wants every order shipped"),
      orderIds: z.array(z.string()).optional().describe("Exact order IDs to ship, for example FIZZ-1046"),
    }),
    handler: async (args) => shipOrders(args),
  }, [shipOrders]);
  return null;
}

function BottleLogo() {
  return <svg className="bottle-logo" viewBox="0 0 28 32" width="24" height="27" aria-hidden="true"><path d="M10 2h8v4l2 3v18.5c0 1.4-1.1 2.5-2.5 2.5h-7A2.5 2.5 0 0 1 8 27.5V9l2-3V2Z" /><path className="bottle-water" d="M9.5 18c3-2 5.5 2 9 0v9.2c0 .7-.5 1.3-1.2 1.3h-6.6c-.7 0-1.2-.6-1.2-1.3V18Z" /><path d="M10 6h8M9 10h10" /><circle cx="13" cy="22" r="1" /><circle cx="16.5" cy="25" r=".8" /></svg>;
}
