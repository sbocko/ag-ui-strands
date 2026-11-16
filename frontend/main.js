import { HttpAgent } from "@ag-ui/client";
import Chart from "chart.js/auto";
import "./style.css";
import "./events.css";

const messages = document.querySelector("#messages");
const events = document.querySelector("#events");
const eventCount = document.querySelector("#event-count");
const visualization = document.querySelector("#visualization");
const form = document.querySelector("#composer");
const prompt = document.querySelector("#prompt");
const send = document.querySelector("#send");
let agent;
let chart;

function clearChart() {
  chart?.destroy();
  chart = undefined;
  visualization.hidden = true;
}

function renderReviewEstimate(estimate) {
  if (!Array.isArray(estimate?.points) || !estimate.points.length) return;
  const points = estimate.points.filter(({ documents, minutes }) =>
    Number.isFinite(documents) && Number.isFinite(minutes)
  ).slice(0, 12);
  if (!points.length) return;

  clearChart();
  visualization.hidden = false;
  document.querySelector("#chart-rate").textContent = `${estimate.rateMinutes} MIN / DOCUMENT`;
  document.querySelector("#chart-values").textContent = points
    .map(({ documents, minutes }) => `${documents} documents: ${minutes} minutes`)
    .join("; ");
  chart = new Chart(document.querySelector("#review-chart"), {
    type: "bar",
    data: {
      labels: points.map(({ documents }) => `${documents} docs`),
      datasets: [{
        data: points.map(({ minutes }) => minutes),
        backgroundColor: points.map(({ documents }) => documents === 12 ? "#e49156" : "#4e8d76"),
        borderRadius: 2,
        maxBarThickness: 54,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => `${item.parsed.y} minutes` } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#61746a" } },
        y: { beginAtZero: true, title: { display: true, text: "Minutes" }, ticks: { precision: 0 }, grid: { color: "#e8ede8" } },
      },
    },
  });
}

function newConversation() {
  agent = new HttpAgent({
    url: "/invocations",
    headers: { "X-Demo-Session-Id": `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "") },
  });
  agent.threadId = crypto.randomUUID();
  clearChart();
  events.replaceChildren();
  eventCount.textContent = "0 EVENTS";
  messages.replaceChildren();
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.innerHTML = '<span class="empty-icon">✳</span><h2>Start with a question.</h2><p>For example: How long will it take to review 12 documents?</p>';
  messages.append(empty);
}

function showEvent(type, detail = "") {
  const item = document.createElement("li");
  const label = document.createElement("span");
  label.className = "event-type";
  label.textContent = type;
  item.append(label);
  if (detail) {
    const value = document.createElement("span");
    value.className = "event-detail";
    value.textContent = detail;
    item.append(value);
  }
  events.append(item);
  eventCount.textContent = `${events.childElementCount} EVENTS`;
  events.scrollTop = events.scrollHeight;
}

function addMessage(role, text) {
  messages.querySelector(".empty-state")?.remove();
  const item = document.createElement("div");
  item.className = `message ${role}`;
  const label = document.createElement("span");
  label.className = "message-label";
  label.textContent = role === "user" ? "YOU" : role === "tool" ? "TOOL" : "AGENT";
  const content = document.createElement("p");
  content.textContent = text;
  item.append(label, content);
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
  return content;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = prompt.value.trim();
  if (!text) return;
  prompt.value = "";
  prompt.disabled = true;
  send.disabled = true;
  clearChart();
  addMessage("user", text);
  const answer = addMessage("assistant", "…");
  let failed = false;

  try {
    agent.messages.push({ id: crypto.randomUUID(), role: "user", content: text });
    await agent.runAgent({}, {
      onRunStartedEvent: ({ event: runEvent }) => showEvent(runEvent.type, `thread ${runEvent.threadId.slice(0, 8)}`),
      onStateSnapshotEvent: ({ event: stateEvent }) => {
        showEvent(stateEvent.type, `${stateEvent.snapshot?.reviewEstimate?.points?.length ?? 0} chart points`);
        renderReviewEstimate(stateEvent.snapshot?.reviewEstimate);
      },
      onTextMessageStartEvent: ({ event: textEvent }) => showEvent(textEvent.type, textEvent.role),
      onTextMessageContentEvent: ({ event: textEvent }) => {
        showEvent(textEvent.type, textEvent.delta);
        if (answer.textContent === "…") answer.textContent = "";
        answer.textContent += textEvent.delta;
        messages.scrollTop = messages.scrollHeight;
      },
      onTextMessageEndEvent: ({ event: textEvent }) => showEvent(textEvent.type),
      onToolCallStartEvent: ({ event: toolEvent }) => {
        showEvent(toolEvent.type, toolEvent.toolCallName);
        addMessage("tool", toolEvent.toolCallName);
      },
      onRunFinishedEvent: ({ event: runEvent }) => showEvent(runEvent.type),
      onRunErrorEvent: ({ event: error }) => {
        showEvent(error.type, error.message);
        failed = true;
        answer.textContent = error.message || "The agent returned an error.";
      },
    });
    if (!answer.textContent || answer.textContent === "…") {
      answer.textContent = failed ? "The request failed." : "No text response.";
    }
  } catch (error) {
    answer.textContent = `Connection failed: ${error.message}`;
  } finally {
    prompt.disabled = false;
    send.disabled = false;
    prompt.focus();
  }
});

document.querySelector("#reset").addEventListener("click", () => {
  if (!send.disabled) newConversation();
});

newConversation();