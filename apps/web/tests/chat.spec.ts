import { test, expect } from "@playwright/test";

test("Sparky sends free-form messages and renders MCP activities", async ({
  page,
}) => {
  const errors: string[] = [];
  let releaseModelResponse = () => {};
  const modelResponseReady = new Promise<void>((resolve) => {
    releaseModelResponse = resolve;
  });
  let gateNextModelRun = true;
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/connection", (route) =>
    route.fulfill({ json: { modelReady: true } }),
  );
  await page.route("**/api/copilotkit/**", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/info"))
      return route.fulfill({
        json: {
          version: "1.72.0",
          agents: { default: { description: "Test agent" } },
          mode: "sse",
          telemetryDisabled: true,
        },
      });
    const input = route.request().postDataJSON() || {};
    if (url.endsWith("/connect"))
      return route.fulfill({ contentType: "text/event-stream", body: "" });
    if (!url.endsWith("/run")) return route.fulfill({ json: {} });
    // MCP resource requests have their own forwarded properties; only the
    // initial chat run below is a model fixture, never a real provider call.
    if (input.forwardedProps?.__proxiedMCPRequest) {
      const events = [
        { type: "RUN_STARTED", threadId: input.threadId, runId: input.runId },
        {
          type: "RUN_FINISHED",
          threadId: input.threadId,
          runId: input.runId,
          result: {
            contents: [
              {
                uri: "ui://test/planner.html",
                mimeType: "text/html;profile=mcp-app",
                text: "<!doctype html><html style=\"height:100%\"><body style=\"height:100%;margin:0\"><div id=\"root\" style=\"height:100%\"><div class=\"leaflet-container\" style=\"height:100%\">Map test fixture</div></div></body></html>",
              },
            ],
          },
        },
      ];
      return route.fulfill({
        contentType: "text/event-stream",
        body: events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""),
      });
    }
    if (gateNextModelRun) {
      gateNextModelRun = false;
      await modelResponseReady;
    }
    const events = [
      { type: "RUN_STARTED", threadId: input.threadId, runId: input.runId },
      {
        type: "TEXT_MESSAGE_START",
        messageId: `assistant-${input.runId}`,
        role: "assistant",
      },
      {
        type: "TEXT_MESSAGE_CONTENT",
        messageId: `assistant-${input.runId}`,
        delta: "Here is your map.",
      },
      { type: "TEXT_MESSAGE_END", messageId: `assistant-${input.runId}` },
      {
        type: "ACTIVITY_SNAPSHOT",
        messageId: `planner-${input.runId}`,
        activityType: "mcp-apps",
        content: {
          result: { content: [] },
          resourceUri: "ui://test/planner.html",
          serverHash: "fixture",
          serverId: "demo-app",
        },
      },
      { type: "RUN_FINISHED", threadId: input.threadId, runId: input.runId },
    ];
    await route.fulfill({
      contentType: "text/event-stream",
      body: events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""),
    });
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Add chat" }).click();
  await expect(page.getByRole("button", { name: "Open Sparky" })).toBeVisible();
  await expect(page.getByLabel("Sparky chat")).toBeHidden();
  await page.getByRole("button", { name: "Open Sparky" }).click();
  await expect(page.getByRole("button", { name: "What’s delayed?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Map my orders" })).not.toBeVisible();
  await page.getByRole("button", { name: "Close Sparky" }).click();
  await expect(page.getByRole("button", { name: "Open Sparky" })).toBeVisible();
  await page.getByRole("tab", { name: "All together" }).click();
  await page.getByRole("button", { name: "Open Sparky" }).click();
  await expect(
    page.getByRole("textbox", { name: "Message Sparky" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Map my orders", exact: true }).click();
  await expect(page.getByText("Show my orders on a map.", { exact: true })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading MCP app" })).toBeVisible();
  releaseModelResponse();
  await expect(page.getByText("Here is your map.", { exact: true }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "Expand MCP app" })).toBeEnabled();
  await expect(page.getByRole("status", { name: "Loading MCP app" })).toBeHidden();
  const inlineAppBox = await page.locator(".mcp-app-inline-shell").boundingBox();
  expect(inlineAppBox).not.toBeNull();
  expect(inlineAppBox!.height).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: "Expand MCP app" }).click();
  const expandedDialog = page.getByRole("dialog", { name: "Expanded MCP app" });
  await expect(expandedDialog).toBeVisible();
  await expect(page.locator(".mcp-app-modal-body iframe")).toHaveCount(1);
  await expect(expandedDialog.getByRole("status", { name: "Loading MCP app" })).toBeHidden();
  await expect(page.locator(".mcp-app-modal-renderer")).toHaveCSS("opacity", "1");
  const dialogBox = await expandedDialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(dialogBox!.width).toBeGreaterThanOrEqual(viewport!.width - 1);
  expect(dialogBox!.height).toBeGreaterThanOrEqual(viewport!.height - 1);
  const modalBodyBox = await page.locator(".mcp-app-modal-body").boundingBox();
  const modalFrameBox = await page.locator(".mcp-app-modal-body iframe").boundingBox();
  expect(modalBodyBox).not.toBeNull();
  expect(modalFrameBox).not.toBeNull();
  expect(modalFrameBox!.height).toBeGreaterThan(modalBodyBox!.height * 0.95);
  const modalMapBox = await page
    .frameLocator(".mcp-app-modal-body iframe")
    .frameLocator("iframe")
    .locator(".leaflet-container")
    .evaluate((element) => element.getBoundingClientRect().toJSON());
  expect(modalMapBox.height).toBeGreaterThan(modalBodyBox!.height * 0.95);
  await page.getByRole("button", { name: "Close expanded MCP app" }).click();
  await expect(expandedDialog).toBeHidden();
  await page
    .getByRole("textbox", { name: "Message Sparky" })
    .fill("Show order locations");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByText("Show order locations", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Here is your map.", { exact: true }).last(),
  ).toBeVisible();
  await expect(page.locator(".mcp-activity iframe")).toHaveCount(1);
  await page.getByRole("tab", { name: "Add the MCP App" }).click();
  await page.getByRole("tab", { name: "All together" }).click();
  await page.getByRole("button", { name: "Open Sparky" }).click();
  await expect(
    page.getByText("Here is your map.", { exact: true }).last(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Our app" }).click();
  await page.getByRole("tab", { name: "All together" }).click();
  await page.getByRole("button", { name: "Open Sparky" }).click();
  await expect(
    page.getByText("Here is your map.", { exact: true }).last(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Sparky ships specific orders or every order", async ({ page }) => {
  let runCount = 0;
  let shipToolAdvertised = false;
  await page.route("**/api/connection", route => route.fulfill({ json: { modelReady: true } }));
  await page.route("**/api/copilotkit/**", async route => {
    const url = route.request().url();
    if (url.endsWith("/info")) return route.fulfill({ json: {
      version: "1.72.0", agents: { default: { description: "Test agent" } }, mode: "sse", telemetryDisabled: true,
    } });
    if (url.endsWith("/connect")) return route.fulfill({ contentType: "text/event-stream", body: "" });
    if (!url.endsWith("/run")) return route.fulfill({ json: {} });

    const input = route.request().postDataJSON() || {};
    shipToolAdvertised ||= input.tools?.some((tool: { name?: string }) => tool.name === "shipOrders") ?? false;
    const currentRun = runCount++;
    const events = currentRun === 0 ? [
      { type: "RUN_STARTED", threadId: input.threadId, runId: input.runId },
      { type: "TOOL_CALL_START", toolCallId: "ship-1046", toolCallName: "shipOrders", parentMessageId: "ship-message" },
      { type: "TOOL_CALL_ARGS", toolCallId: "ship-1046", delta: JSON.stringify({ orderIds: ["FIZZ-1046"] }) },
      { type: "TOOL_CALL_END", toolCallId: "ship-1046" },
      { type: "RUN_FINISHED", threadId: input.threadId, runId: input.runId },
    ] : currentRun === 2 ? [
      { type: "RUN_STARTED", threadId: input.threadId, runId: input.runId },
      { type: "TOOL_CALL_START", toolCallId: "ship-all", toolCallName: "shipOrders", parentMessageId: "ship-all-message" },
      { type: "TOOL_CALL_ARGS", toolCallId: "ship-all", delta: JSON.stringify({ all: true }) },
      { type: "TOOL_CALL_END", toolCallId: "ship-all" },
      { type: "RUN_FINISHED", threadId: input.threadId, runId: input.runId },
    ] : [
      { type: "RUN_STARTED", threadId: input.threadId, runId: input.runId },
      { type: "TEXT_MESSAGE_START", messageId: `shipped-${currentRun}`, role: "assistant" },
      { type: "TEXT_MESSAGE_CONTENT", messageId: `shipped-${currentRun}`, delta: currentRun === 1 ? "FIZZ-1046 is on its way." : "All orders are shipping." },
      { type: "TEXT_MESSAGE_END", messageId: `shipped-${currentRun}` },
      { type: "RUN_FINISHED", threadId: input.threadId, runId: input.runId },
    ];
    return route.fulfill({ contentType: "text/event-stream", body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") });
  });

  await page.goto("/");
  await expect(page.locator(".crm-table tbody .crm-badge.packing")).toHaveCount(7);
  await page.getByRole("tab", { name: "Add chat" }).click();
  await page.getByRole("button", { name: "Open Sparky" }).click();
  await page.getByRole("button", { name: "Ship FIZZ-1046" }).click();

  const order = page.getByRole("row").filter({ hasText: "FIZZ-1046" });
  await expect(order).toContainText("Shipping");
  await expect(order.locator(".crm-badge.shipping")).toHaveCSS("background-color", "rgb(22, 132, 91)");
  await expect(order.locator(".crm-badge.shipping")).toHaveCSS("color", "rgb(255, 255, 255)");
  expect(shipToolAdvertised).toBe(true);

  const composer = page.getByRole("textbox", { name: "Message Sparky" });
  await expect(composer).toBeEnabled();
  await composer.fill("Ship it all!");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".crm-table tbody .crm-badge.shipping")).toHaveCount(7);
});


test("order dashboard filters and edits reset on reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Search orders" }).fill("Mission Bodega");
  await expect(page.getByRole("button", { name: "Edit FIZZ-1043", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Edit FIZZ-1042", exact: true }).click();
  await page.getByLabel("Retailer", { exact: true }).fill("Mission Bodega After Dark");
  await page.getByLabel("Status", { exact: true }).selectOption("Shipping");
  await page.getByRole("button", { name: "Save order" }).click();
  await expect(page.getByRole("button", { name: /FIZZ-1042 Mission Bodega After Dark/ })).toBeVisible();
  await expect(page.locator(".crm-table tbody .crm-badge.shipping")).toHaveCount(1);
  await page.reload();
  await page.getByRole("textbox", { name: "Search orders" }).fill("After Dark");
  await expect(page.getByRole("button", { name: /FIZZ-1042 Mission Bodega After Dark/ })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search orders" }).fill("");
  await expect(page.locator(".crm-table tbody .crm-badge.packing")).toHaveCount(7);
  await expect(page.locator(".crm-table tbody .crm-badge.shipping")).toHaveCount(0);
  await page.getByRole("button", { name: "Delayed", exact: false }).click();
  await expect(page.getByText("No matching orders. The bubbles remain calm.")).toBeVisible();
});
