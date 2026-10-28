import { useState } from "react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://sentinelmesh-ai.onrender.com";

function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [health, setHealth] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [auditEntries, setAuditEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const loadDashboardData = async () => {
    setLoading(true);
    setApiError("");

    try {
      const [healthResponse, ledgerResponse, auditResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/health`),
fetch(`${API_BASE_URL}/v1/ledger/verify`),
fetch(`${API_BASE_URL}/v1/ledger?limit=10`),
        ]);

      if (
        !healthResponse.ok ||
        !ledgerResponse.ok ||
        !auditResponse.ok
      ) {
        throw new Error("The backend returned an unsuccessful response.");
      }

      const healthData = await healthResponse.json();
      const ledgerData = await ledgerResponse.json();
      const auditData = await auditResponse.json();

      setHealth(healthData);
      setLedger(ledgerData);

      // FastAPI may return a list directly or wrap it in a "value" field.
      const entries = Array.isArray(auditData)
        ? auditData
        : Array.isArray(auditData.value)
          ? auditData.value
          : [];

      setAuditEntries(entries.slice().reverse());
    } catch (error) {
      console.error("Dashboard API error:", error);
      setHealth(null);
      setLedger(null);
      setAuditEntries([]);
      setApiError(
        "Unable to load backend data. Check that the SentinelMesh API is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  };

  const openDashboard = () => {
    setShowDashboard(true);
    loadDashboardData();
  };

  const closeDashboard = () => {
    setShowDashboard(false);
  };

  const gatewayIsHealthy = health?.status?.toLowerCase() === "ok";
  const ledgerIsValid = ledger?.valid === true;
  const ledgerIsInvalid = ledger?.valid === false;
  const allowedCount = auditEntries.filter(
  (entry) => entry.decision === "allow"
).length;

const deniedCount = auditEntries.filter(
  (entry) => entry.decision === "deny"
).length;

const denialRate =
  auditEntries.length > 0
    ? Math.round((deniedCount / auditEntries.length) * 100)
    : 0;

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Timestamp unavailable";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }

    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const shortenHash = (hash) => {
    if (!hash) return "—";
    return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
  };

  return (
    <div className="app">
      <nav className="navbar">
        <a
          className="brand"
          href="#"
          onClick={closeDashboard}
          aria-label="SentinelMesh AI home"
        >
          <span className="brand-icon">S</span>
          <span>
            Sentinel<span className="brand-accent">Mesh</span>
          </span>
          <span className="ai-label">AI</span>
        </a>

        {!showDashboard && (
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#architecture">Architecture</a>
            <a href="#about">About</a>
          </div>
        )}

        <button className="nav-button" onClick={openDashboard}>
          Open Dashboard <span>↗</span>
        </button>
      </nav>

      {!showDashboard ? (
        <main>
          <section className="hero">
            <div className="hero-content">
              <div className="eyebrow">
                <span className="live-dot"></span>
                ZERO-TRUST AI INFRASTRUCTURE
              </div>

              <h1>
                Secure every
                <br />
                request. <span>Trust</span>
                <br />
                nothing by default.
              </h1>

              <p className="hero-description">
                A security layer for adversarial AI environments.
                Enforce policies, isolate zones, and maintain a
                verifiable audit trail for every decision.
              </p>

              <div className="hero-actions">
                <button className="primary-button" onClick={openDashboard}>
                  Explore Dashboard <span>→</span>
                </button>

                <a className="secondary-button" href="#architecture">
                  View Architecture <span>↓</span>
                </a>
              </div>

              <div className="hero-note">
                <span>✓</span> Policy-driven access
                <span>✓</span> Hash-chained audit trail
              </div>
            </div>

            <div className="visual-panel" id="architecture">
              <div className="panel-top">
                <span>NETWORK TOPOLOGY</span>
                <span className="panel-status">
                  <i></i> SYSTEM OVERVIEW
                </span>
              </div>

              <div className="network">
                <div className="zone zone-red">
                  <span className="zone-icon">R</span>
                  <strong>RED ZONE</strong>
                  <small>Adversarial input</small>
                  <span className="zone-line"></span>
                </div>

                <div className="gateway-node">
                  <span className="gateway-shield">⬡</span>
                  <strong>POLICY GATEWAY</strong>
                  <small>Request enforcement</small>
                  <div className="gateway-chip">OPA · POLICY ENGINE</div>
                </div>

                <div className="zone zone-blue">
                  <span className="zone-icon">B</span>
                  <strong>BLUE ZONE</strong>
                  <small>Defensive controls</small>
                  <span className="zone-line"></span>
                </div>

                <div className="zone zone-model">
                  <span className="zone-icon">M</span>
                  <strong>MODEL ZONE</strong>
                  <small>AI workload</small>
                </div>

                <div className="zone zone-eval">
                  <span className="zone-icon">E</span>
                  <strong>EVAL ZONE</strong>
                  <small>Security evaluation</small>
                </div>

                <div className="network-caption">
                  <span className="caption-line"></span>
                  REQUEST → POLICY CHECK → AUDIT
                </div>
              </div>

              <div className="panel-bottom">
                <div>
                  <span className="metric-label">ACCESS MODEL</span>
                  <strong>Zero trust</strong>
                </div>
                <div>
                  <span className="metric-label">POLICY ENGINE</span>
                  <strong>Open Policy Agent</strong>
                </div>
                <div>
                  <span className="metric-label">AUDIT STATUS</span>
                  <strong className="green-text">Verifiable</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="stats-strip">
            <div>
              <strong>04</strong>
              <span>Conceptual security zones</span>
            </div>
            <div>
              <strong>01</strong>
              <span>Central policy gateway</span>
            </div>
            <div>
              <strong>SHA-256</strong>
              <span>Audit hash algorithm</span>
            </div>
            <div>
              <strong>Default deny</strong>
              <span>Authorization principle</span>
            </div>
          </section>

          <section className="features-section" id="features">
            <div className="section-heading">
              <div className="eyebrow">BUILT FOR ADVERSARIAL AI</div>
              <h2>Security is not an afterthought.</h2>
              <p>
                Every request should pass through a policy boundary.
                Audit records help make security decisions verifiable.
              </p>
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <span className="feature-number">01 / ACCESS</span>
                <div className="feature-icon red-icon">⌘</div>
                <h3>Policy enforcement</h3>
                <p>
                  Evaluate requests against explicit authorization
                  rules before allowing sensitive actions.
                </p>
              </article>

              <article className="feature-card">
                <span className="feature-number">02 / ISOLATION</span>
                <div className="feature-icon blue-icon">⬡</div>
                <h3>Zone boundaries</h3>
                <p>
                  Design boundaries between adversarial inputs,
                  defensive controls, model workloads, and evaluation.
                </p>
              </article>

              <article className="feature-card">
                <span className="feature-number">03 / AUDIT</span>
                <div className="feature-icon green-icon">⌁</div>
                <h3>Tamper detection</h3>
                <p>
                  Link audit entries with cryptographic hashes and
                  verify the integrity of the recorded chain.
                </p>
              </article>
            </div>
          </section>

          <section className="cta-section" id="about">
            <div>
              <div className="eyebrow">READY TO EXPLORE?</div>
              <h2>See the security layer in action.</h2>
              <p>
                Explore the prototype&apos;s gateway health and
                audit verification results.
              </p>
            </div>

            <button className="primary-button" onClick={openDashboard}>
              Launch Dashboard →
            </button>
          </section>

          <footer>
            <a className="brand" href="#" onClick={closeDashboard}>
              <span className="brand-icon">S</span>
              <span>
                Sentinel<span className="brand-accent">Mesh</span>
              </span>
              <span className="ai-label">AI</span>
            </a>
            <span>Hack in Hills · Security prototype</span>
            <span>Built for transparent AI infrastructure</span>
          </footer>
        </main>
      ) : (
        <main className="dashboard-page">
          <section className="dashboard-heading">
            <div>
              <div className="eyebrow">
                <span className="live-dot"></span>
                SENTINELMESH CONTROL PLANE
              </div>

              <h1>
                Security <span>Overview.</span>
              </h1>

              <p>
                Monitor gateway availability and audit integrity
                from your running prototype.
              </p>
            </div>

            <button
              className="primary-button dashboard-refresh"
              onClick={loadDashboardData}
              disabled={loading}
            >
              <span className={loading ? "refresh-spinning" : ""}>↻</span>
              {loading ? "Refreshing..." : "Refresh data"}
            </button>
          </section>

          <section className="dashboard-statusbar">
            <div className="statusbar-item">
              <span className="statusbar-label">API ENDPOINT</span>
              <strong>sentinelmesh-ai.onrender.com</strong>
            </div>

            <div className="statusbar-item">
              <span className="statusbar-label">GATEWAY</span>
              <span
                className={`status-pill ${
                  gatewayIsHealthy ? "status-good" : "status-neutral"
                }`}
              >
                <span className="status-dot"></span>
                {loading
                  ? "Checking"
                  : health
                    ? gatewayIsHealthy
                      ? "Operational"
                      : health.status || "Response received"
                    : "Awaiting data"}
              </span>
            </div>

            <div className="statusbar-item">
              <span className="statusbar-label">AUDIT CHAIN</span>
              <span
                className={`status-pill ${
                  ledgerIsValid
                    ? "status-good"
                    : ledgerIsInvalid
                      ? "status-bad"
                      : "status-neutral"
                }`}
              >
                <span className="status-dot"></span>
                {loading
                  ? "Checking"
                  : ledgerIsValid
                    ? "Verified"
                    : ledgerIsInvalid
                      ? "Verification failed"
                      : "Awaiting data"}
              </span>
            </div>
          </section>

          {apiError && (
            <div className="dashboard-error" role="alert">
              <strong>Connection problem</strong>
              <p>{apiError}</p>
              <button
                className="secondary-button"
                onClick={loadDashboardData}
                disabled={loading}
              >
                Try again
              </button>
            </div>
          )}

          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-kicker">LIVE API METRICS</span>
                <h2>System health</h2>
              </div>
              <span className="dashboard-updated">
                {loading ? "Updating data..." : "Values from backend"}
              </span>
            </div>

            <div className="dashboard-cards">
              <article className="dashboard-card">
                <div className="dashboard-card-top">
                  <span className="dashboard-card-icon icon-plum">⌘</span>
                  <span
                    className={`mini-status ${
                      gatewayIsHealthy ? "mini-good" : "mini-neutral"
                    }`}
                  >
                    {health
                      ? gatewayIsHealthy
                        ? "HEALTHY"
                        : "RESPONSE"
                      : "NO DATA"}
                  </span>
                </div>
                <span className="metric-label">GATEWAY HEALTH</span>
                <h3 className="dashboard-value">
                  {health ? health.status || "Available" : "—"}
                </h3>
                <p>
                  {health
                    ? "Health endpoint responded successfully."
                    : "Waiting for a successful health response."}
                </p>
              </article>

              <article className="dashboard-card">
                <div className="dashboard-card-top">
                  <span className="dashboard-card-icon icon-green">✓</span>
                  <span
                    className={`mini-status ${
                      ledgerIsValid
                        ? "mini-good"
                        : ledgerIsInvalid
                          ? "mini-bad"
                          : "mini-neutral"
                    }`}
                  >
                    {ledgerIsValid
                      ? "VALID"
                      : ledgerIsInvalid
                        ? "INVALID"
                        : "NO DATA"}
                  </span>
                </div>
                <span className="metric-label">AUDIT VERIFICATION</span>
                <h3 className="dashboard-value">
                  {ledgerIsValid
                    ? "Verified"
                    : ledgerIsInvalid
                      ? "Invalid"
                      : ledger
                        ? "Response received"
                        : "—"}
                </h3>
                <p>
                  {ledgerIsValid
                    ? "The API reports that the ledger is valid."
                    : ledgerIsInvalid
                      ? "The API reports a ledger verification failure."
                      : "Waiting for ledger verification."}
                </p>
              </article>

              <article className="dashboard-card">
                <div className="dashboard-card-top">
                  <span className="dashboard-card-icon icon-blue">≡</span>
                  <span className="mini-status mini-neutral">LEDGER</span>
                </div>
                <span className="metric-label">AUDIT ENTRIES</span>
                <h3 className="dashboard-value">
                  {ledger && Number.isFinite(Number(ledger.entries))
                    ? Number(ledger.entries).toLocaleString()
                    : "—"}
                </h3>
                <p>
                  {ledger
                    ? "Entry count returned by the verification endpoint."
                    : "Waiting for the ledger entry count."}
                </p>
              </article>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-kicker">REFERENCE ARCHITECTURE</span>
                <h2>Security zones</h2>
              </div>
              <span className="architecture-tag">Conceptual view</span>
            </div>

            <div className="architecture-card">
              <div className="architecture-flow">
                <div className="architecture-zone zone-input">
                  <span className="architecture-zone-icon">R</span>
                  <strong>Red Zone</strong>
                  <span>Untrusted input</span>
                </div>

                <span className="architecture-arrow">→</span>

                <div className="architecture-gateway">
                  <span className="architecture-gateway-icon">⬡</span>
                  <strong>Policy Gateway</strong>
                  <span>Central entry point</span>
                </div>

                <span className="architecture-arrow">→</span>

                <div className="architecture-zone zone-model">
                  <span className="architecture-zone-icon">M</span>
                  <strong>Model Zone</strong>
                  <span>AI workload</span>
                </div>
              </div>

              <div className="architecture-secondary">
                <div className="architecture-zone zone-defense">
                  <span className="architecture-zone-icon">B</span>
                  <strong>Blue Zone</strong>
                  <span>Defensive controls</span>
                </div>

                <div className="architecture-zone zone-evaluation">
                  <span className="architecture-zone-icon">E</span>
                  <strong>Eval Zone</strong>
                  <span>Security evaluation</span>
                </div>
              </div>

              <p className="architecture-disclaimer">
                This diagram describes the intended architecture.
                Inter-zone request forwarding is not implemented in
                the current prototype.
              </p>
            </div>
          </section>

          {/* Real audit activity from the backend */}
          <section className="dashboard-section audit-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-kicker">HASH-CHAINED LEDGER</span>
                <h2>Audit Activity</h2>
              </div>
              <span className="architecture-tag">
                {auditEntries.length} recent entries
              </span>
            </div>
            <div className="audit-insights-grid">
  <div className="audit-insight-card">
    <div className="audit-insight-top">
      <span className="audit-insight-icon">✓</span>
      <span className="audit-insight-label">Allowed Requests</span>
    </div>
    <div className="audit-insight-value">{allowedCount}</div>
    <p className="audit-insight-caption">
      Requests permitted by policy
    </p>
  </div>

  <div className="audit-insight-card">
    <div className="audit-insight-top">
      <span className="audit-insight-icon">✕</span>
      <span className="audit-insight-label">Denied Requests</span>
    </div>
    <div className="audit-insight-value">{deniedCount}</div>
    <p className="audit-insight-caption">
      Requests blocked by policy
    </p>
  </div>

  <div className="audit-insight-card">
    <div className="audit-insight-top">
      <span className="audit-insight-icon">%</span>
      <span className="audit-insight-label">Denial Rate</span>
    </div>
    <div className="audit-insight-value">{denialRate}%</div>
    <p className="audit-insight-caption">
      Percentage of recent requests denied
    </p>
  </div>
</div>

            <div className="audit-card">
              {loading && auditEntries.length === 0 ? (
                <div className="audit-empty">Loading audit activity...</div>
              ) : auditEntries.length === 0 ? (
                <div className="audit-empty">
                  No audit entries are available. Refresh to try again.
                </div>
              ) : (
                <div className="audit-table-wrap">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Source → Destination</th>
                        <th>Action</th>
                        <th>Decision</th>
                        <th>Reason</th>
                        <th>Entry hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditEntries.map((entry) => (
                        <tr key={entry.hash || entry.index}>
                          <td className="audit-time">
                            {formatTimestamp(entry.ts)}
                          </td>
                          <td>
                            <div className="audit-route">
                              <span>{entry.source || "unknown"}</span>
                              <span className="audit-route-arrow">→</span>
                              <span>{entry.destination || "—"}</span>
                            </div>
                          </td>
                          <td>
                            <code className="audit-action">
                              {entry.action || "—"}
                            </code>
                          </td>
                          <td>
                            <span
                              className={`decision-badge ${
                                entry.decision === "allow"
                                  ? "decision-allow"
                                  : "decision-deny"
                              }`}
                            >
                              <span className="decision-dot"></span>
                              {(entry.decision || "unknown").toUpperCase()}
                            </span>
                          </td>
                          <td className="audit-reason">
                            {entry.reason || "—"}
                          </td>
                          <td>
                            <code
                              className="audit-hash"
                              title={entry.hash || ""}
                            >
                              {shortenHash(entry.hash)}
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="audit-card-footer">
                <span>
                  Showing the latest {auditEntries.length} entries returned by
                  the API.
                </span>
                <span>
                  Chain status:{" "}
                  <strong className={ledgerIsValid ? "audit-valid" : ""}>
                    {ledgerIsValid ? "Verified" : "Not verified"}
                  </strong>
                </span>
              </div>
            </div>
          </section>

          <section className="dashboard-note">
            <div className="note-icon">i</div>
            <div>
              <strong>Prototype implementation status</strong>
              <p>
                Health, verification, and audit entries are fetched from the
                running backend. The audit table displays actual ledger records.
                The architecture diagram is illustrative; inter-zone forwarding
                and production authentication are not implemented yet.
              </p>
            </div>
          </section>

          <div className="dashboard-footer">
            <span>SentinelMesh AI · Hack in Hills</span>
            <button className="secondary-button" onClick={closeDashboard}>
              ← Back to landing page
            </button>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;