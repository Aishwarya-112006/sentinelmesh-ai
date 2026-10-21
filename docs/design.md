# SentinelMesh AI: Design

> **Scope:** This file covers the **product and interface design**: what users see, how it behaves, and why. For system structure see [architecture.md](architecture.md), and for technology choices see [tech_stack.md](tech_stack.md).
> **Basis:** The current design is taken from the prototype demo video (`demo/SentinelMesh_AI_Prototype_Demo.mp4`). Items marked *proposed* are not shown in the demo.

---

## 1. Design goals

| Goal | What it means in the interface |
|---|---|
| **Make isolation visible** | Users should *see* that zones are separated and that every crossing goes through one gateway |
| **Show cause and effect** | Each action on the map produces a matching ledger entry within the same moment |
| **Be calm under pressure** | Normal state is quiet. Colour and motion are reserved for events that need attention |
| **Evidence first** | Every decision can be traced to a timestamped, hashed record |
| **Fast to read** | An operator should understand system state in a few seconds |

---

## 2. Users and their needs

| User | Main need | Primary view |
|---|---|---|
| **Red Team** | Submit payloads and see filtered results | Submission and results *(proposed)* |
| **Blue Team** | Propose patches and see promotion outcome | Patch status and integrity score |
| **Security Operator** | Watch boundaries, review alerts, approve policy changes | Zone map and audit ledger |
| **Auditor / Compliance** | Verify what happened and prove it was not altered | Ledger and verification report *(proposed)* |

The demo is written from the **Security Operator's** point of view, since that role sees everything.

---

## 3. Core screen: the security console

The demo shows one main screen with two panels.

```
┌──────────────────────────────────────────────────────────────────────┐
│ SENTINELMESH AI  Security console   [Scenario 2 / 4]   git_happens   │
├──────────────────────────────────────────────┬───────────────────────┤
│                                              │ AUDIT LEDGER          │
│   ┌──────────┐              ┌──────────┐     │ tamper-evident        │
│   │ RED TEAM │              │BLUE TEAM │     │ ───────────────────── │
│   │ attack   │              │ defense  │     │ 08:11 DENY  red→model │
│   └────┬─────┘   ┌──────┐   └────┬─────┘     │ 08:14 ALLOW red→gw    │
│        ┊ NO      │POLICY│        │           │ 08:14 INSPECT payload │
│        ┊ DIRECT  │GATEWAY│       │           │ 08:19 EVAL  sandboxed │
│        ┊ PATH    └──────┘        │           │ 08:20 RESULT gw→red   │
│   ┌────┴─────┐              ┌────┴─────┐     │ ...                   │
│   │MODEL STATE│             │ EVAL DATA│     │                       │
│   └──────────┘              └──────────┘     │                       │
│                                              │                       │
│  ┌────────────────────────────────────────┐  │                       │
│  │ Caption: what is happening right now   │  │                       │
│  └────────────────────────────────────────┘  │                       │
└──────────────────────────────────────────────┴───────────────────────┘
```

### Left panel: zone map
- **Hub and spoke layout.** The Policy Gateway sits in the centre and the four zones sit at the corners, so the gateway is visibly the only connection.
- **Dashed "NO DIRECT PATH" line** between Red Team and Model State makes the blocked route explicit.
- **Moving markers** travel along the lines to show payloads and patches in transit.
- **Caption bar** at the bottom states, in one sentence, what the current scenario demonstrates.

### Right panel: audit ledger
- A live, scrolling list, newest entries at the bottom.
- Each row shows **time, action label, route, a short detail line and a short hash**.
- A "tamper-evident" tag in the header reminds users why the ledger can be trusted.
- Starts empty ("awaiting events") so the first entry has a clear effect.

### Header
- Product name and context on the left, a **scenario indicator** (for example "Scenario 2 / 4") in the centre, and team identity on the right.

---

## 4. Visual language

The demo uses a dark, navy-toned console with a different colour for each zone and a semantic colour for each kind of event.

### Zone colours (as seen in the demo)

| Element | Colour | Why |
|---|---|---|
| Red Team | Red | Universally read as attack or danger |
| Blue Team | Blue | Defense, trust |
| Policy Gateway | Amber / orange | Attention and control, distinct from both teams |
| Model State | Purple | Protected, high value, separate from the teams |
| Eval Data | Teal | Data, neutral and calm |

### Ledger action colours (as seen in the demo)

| Action | Colour family | Meaning |
|---|---|---|
| **DENY**, **DISAPPROVE**, **ALERT** | Red | Blocked or needs attention |
| **ALLOW**, **INSPECT**, **VALIDATE** | Amber / orange | In progress through the gateway |
| **PROPOSE** | Blue | Blue Team action |
| **EVAL** | Teal | Model evaluation |
| **RESULT**, **PROMOTE**, **ROLLBACK** | Green | Completed or safe state |

> **Colour is never the only signal.** Every row also carries a text label, so meaning survives colour blindness and grayscale printing.

### Layout and type
- Dark background with subtle gradient, rounded cards, thin coloured borders per zone.
- Bold, uppercase labels for zone names. Smaller, muted text for descriptions.
- Monospace-style small text for hashes and timestamps.
- Generous spacing so the map stays readable while the ledger updates.

---

## 5. States and feedback

| Situation | What the interface does |
|---|---|
| **Idle** | Zones and gateway shown calmly. Ledger shows "awaiting events" |
| **Request blocked** | A marker stops at the boundary, the route flashes, and a red **DENY** row appears |
| **Payload allowed** | A marker moves through the gateway, with **ALLOW**, **INSPECT** and **EVAL** rows following in order |
| **Patch under review** | **Integrity score** appears on Model State with a progress bar |
| **Patch fails** | Integrity bar drops into red, a **DISAPPROVE** row appears, then **ROLLBACK** restores the bar to green |
| **Anomaly** | A banner appears at the top ("Anomaly detected, escalated to Security Operators"), the gateway turns red and reads **DENIED**, and a red **ALERT** row is added |
| **Scenario end** | Fade to a summary of key figures |

Principles behind these states:
- **Motion means data is moving.** Nothing animates for decoration.
- **One alert at a time.** A single banner at the top, not stacked pop-ups.
- **State changes are always paired:** a visual change on the map and a row in the ledger.

---

## 6. The four demo scenarios

| # | Scenario | What the design must communicate |
|---|---|---|
| 1 | Default-deny | The Red Team has no direct path to Model State |
| 2 | Inspected payload | Every payload is inspected, sandboxed and logged first |
| 3 | Promotion and rollback | Blue defenses go live only if integrity holds, otherwise they roll back automatically |
| 4 | Anomaly escalation | A suspicious probe is denied, flagged and escalated in real time |

The order moves from **"nothing crosses"** to **"things cross safely"** to **"bad things are caught"**, so the story builds.

---

## 7. Closing summary screen

A final card row with four headline figures (containment rate, detection coverage, cross-boundary traceability, mean time to detect) and the tagline **"Build Trust."**

The demo footer states these are **design targets from a simulated prototype**. Any production interface must label figures as *measured* or *target* so they cannot be mistaken for evidence.

---

## 8. Design decisions and rationale

| Decision | Why | Trade-off |
|---|---|---|
| Hub-and-spoke map | Makes the single choke point obvious at a glance | Scales poorly past a handful of zones. Large deployments need grouping |
| Ledger beside the map | Links what is seen to what is recorded | Takes horizontal space, so mobile needs a tabbed layout |
| Dark theme | Suits a security console and long monitoring sessions | Needs careful contrast checks |
| Scripted scenarios | Tell a clear story in under a minute | Not a real system, so the demo shows intended behaviour only |
| Captions on each scenario | Judges and new users get the point without narration | Adds text to the screen |
| Colour per zone and per action | Fast recognition | Risk of too many colours, so keep them semantic |

---

## 9. Accessibility *(proposed)*

- Meet WCAG AA contrast for all text, especially muted text on dark backgrounds.
- Never rely on colour alone. Keep text labels on every status.
- Support keyboard navigation for the ledger and all controls.
- Respect reduced-motion settings by replacing marker animation with static highlights.
- Provide screen-reader text for alerts and for each ledger row.

---

## 10. Screens still to design *(proposed)*

| Screen | Purpose |
|---|---|
| **Policy review** | Operators approve or reject proposed rule changes, with a diff view |
| **Incident detail** | Full timeline for one alert, with linked ledger entries |
| **Ledger verification** | Run the chain check and show a pass or fail report |
| **Red Team workbench** | Submit payloads, see filtered results |
| **Blue Team workbench** | Propose patches, see integrity scores and promotion history |
| **Zone management** | Create zones from reusable policy templates |
| **Settings and roles** | Role-based access, integrations |

---

## 11. Content and tone

- **Plain, confident, short.** Captions use one sentence: *"Four hardened zones. One Policy Gateway. Every event audited."*
- **Action-first labels:** DENY, ALLOW, INSPECT, PROMOTE, ROLLBACK.
- **Honest labelling:** simulated or target figures are always marked as such.
- **Tagline:** *Build Trust.*

---

## 12. Open questions

1. Should Red and Blue users see the same map as operators, or a restricted view of only their own zone?
2. How should the map group zones when a deployment has many models and teams?
3. How are alerts prioritised when several arrive at once?
4. What is the mobile experience for on-call operators?

---

*Related: [product.md](product.md) · [architecture.md](architecture.md) · [tech_stack.md](tech_stack.md) · [README.md](README.md)*
