import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { excavate } from "../excavate.js";
import type { Find } from "../types.js";

function sampleFind(): Find {
  return {
    name: "legacyRenderer",
    kind: "function",
    file: "src/render.ts",
    line: 12,
    lastModifiedDaysAgo: 400,
    lastModifiedCommit: "abcdef1234567890",
    referenceCount: 0,
    hasDocumentation: false,
    dependents: [],
    obsoleteScore: 90,
    snippet: "function legacyRenderer(node) {\n  return legacyPaint(node);\n}",
  };
}

function startFakeMessagesServer(payload: unknown): Promise<{ server: Server; url: string; requests: unknown[] }> {
  const requests: unknown[] = [];
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        requests.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            id: "msg_1",
            type: "message",
            role: "assistant",
            model: "claude-opus-5",
            stop_reason: "end_turn",
            stop_sequence: null,
            content: [{ type: "text", text: JSON.stringify(payload) }],
            usage: { input_tokens: 40, output_tokens: 120 },
          }),
        );
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolvePromise({ server, url: `http://127.0.0.1:${port}`, requests });
    });
  });
}

function sampleReport() {
  return {
    possibleHistoricalPurpose: "an old canvas based rendering path from before the DOM renderer replaced it",
    recommendation: "ARCHIVE",
    reasoning: "zero references anywhere in the codebase and no file imports render.ts anymore",
  };
}

test("excavate sends the find's evidence and parses a real structured report back", async () => {
  const { server, url, requests } = await startFakeMessagesServer(sampleReport());
  try {
    const report = await excavate(sampleFind(), { apiKey: "test-key", baseURL: url });

    assert.equal(report.recommendation, "ARCHIVE");
    assert.match(report.possibleHistoricalPurpose, /canvas based rendering/);

    const sent = requests[0] as { model: string; messages: { content: string }[] };
    assert.equal(sent.model, "claude-opus-5");
    assert.match(sent.messages[0].content, /legacyRenderer/);
    assert.match(sent.messages[0].content, /src\/render\.ts:12/);
    assert.match(sent.messages[0].content, /legacyPaint/);
  } finally {
    server.close();
  }
});

test("excavate throws when claude's response doesn't match the schema", async () => {
  const { server, url } = await startFakeMessagesServer({ notEvenCloseToTheSchema: true });
  try {
    await assert.rejects(
      () => excavate(sampleFind(), { apiKey: "test-key", baseURL: url }),
      /possibleHistoricalPurpose|recommendation/,
    );
  } finally {
    server.close();
  }
});

test("excavate throws when claude returns a recommendation outside the enum", async () => {
  const { server, url } = await startFakeMessagesServer({ ...sampleReport(), recommendation: "MAYBE" });
  try {
    await assert.rejects(() => excavate(sampleFind(), { apiKey: "test-key", baseURL: url }));
  } finally {
    server.close();
  }
});
