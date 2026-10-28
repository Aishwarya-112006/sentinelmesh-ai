from render import TaskContext, Workflows, Retry

app = Workflows(
    default_retry=Retry(
        max_retries=2,
        wait_duration_ms=1000
    ),
    default_timeout=60
)


@app.task
def classify_security_event(
    ctx: TaskContext,
    event: dict
) -> dict:
    decision = str(event.get("decision", "unknown")).lower()
    reason = str(event.get("reason", "unknown"))

    if decision == "deny":
        risk = "high"
    elif decision == "allow":
        risk = "low"
    else:
        risk = "unknown"

    return {
        "decision": decision,
        "reason": reason,
        "risk_level": risk,
        "requires_review": risk == "high"
    }


@app.task
def generate_audit_insight(
    ctx: TaskContext,
    classification: dict
) -> dict:
    if classification["risk_level"] == "high":
        message = "A denied request was recorded. Review the security event."
    elif classification["risk_level"] == "low":
        message = "An allowed request was recorded."
    else:
        message = "The event needs manual review."

    return {
        "risk_level": classification["risk_level"],
        "requires_review": classification["requires_review"],
        "insight": message
    }


@app.task
async def security_audit_pipeline(
    ctx: TaskContext,
    event: dict
) -> dict:
    classification = await ctx.run(classify_security_event, event)

    insight = await ctx.run(generate_audit_insight, classification)

    return {
        "event_id": event.get("hash", "unavailable"),
        "classification": classification,
        "insight": insight
    }


if __name__ == "__main__":
    app.start()

