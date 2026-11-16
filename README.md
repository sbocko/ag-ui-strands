# AG-UI + Strands + AgentCore

A practical AG-UI chat example backed by a Strands agent and Amazon Bedrock. The Python backend exposes an AG-UI event stream, and the frontend displays messages and tool-call events as they arrive.

## Run locally

You need Python 3.12+, Node.js 20.12+, AWS credentials, and access to a Bedrock model in your Region. From this directory, run the following in separate terminals:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python backend.py
```

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173. Vite forwards `/invocations` to the Strands backend on port 8080. Ask **"How long will it take to review 12 documents?"** to see the model's response and AG-UI events. The agent can use `estimate_review_time`, but tool selection and wording depend on the model. There is no longer a hardcoded response or a fixed demo mode.

Set `MODEL_ID` and `AWS_REGION` if needed. The backend does not currently send a `reviewEstimate` state snapshot, so the frontend chart remains hidden. Live calls incur Bedrock charges.

## AgentCore Runtime

The backend exposes `POST /invocations` and `GET /ping` on port 8080, the endpoints expected by AgentCore Runtime for the `AGUI` protocol. For deployment steps, see the [AWS AG-UI guide](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-agui.html). The Runtime execution role needs `bedrock:InvokeModel` permission for the selected model and any inference profile. Deployment has not been verified for this repository.

AgentCore runs the backend, not the static Vite frontend. A deployed frontend needs an authenticated gateway or a JWT/OAuth integration to invoke the Runtime. Do not expose a credentialed local proxy as a public server or put AWS credentials in browser JavaScript. A browser conversation ID is not a user identity, and agent state without durable session storage may not survive a restart or a move between instances. AWS requests and Bedrock model usage incur charges.