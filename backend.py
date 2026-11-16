import os

from ag_ui_strands import StrandsAgent, create_strands_app
from strands import Agent, tool
from strands.models import BedrockModel


@tool
def estimate_review_time(documents: int) -> str:
    """Estimate review time for a batch of documents at five minutes each."""
    if documents < 1 or documents > 100:
        return "Choose between 1 and 100 documents."
    return f"Approximately {documents * 5} minutes for {documents} documents."


agent = Agent(
    model=BedrockModel(
        model_id=os.getenv("MODEL_ID", "us.anthropic.claude-haiku-4-5-20251001-v1:0"),
        region_name=os.getenv("AWS_REGION", "us-east-1"),
    ),
    system_prompt=(
        "You help plan document reviews. Use estimate_review_time when the user "
        "asks how long a batch will take. Explain that the estimate is approximate."
    ),
    tools=[estimate_review_time],
    callback_handler=None,
)

app = create_strands_app(
    StrandsAgent(agent=agent, name="review-planner"),
    "/invocations",
    "/ping",
    origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)