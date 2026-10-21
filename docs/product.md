# SentinelMesh AI

**Zero-trust infrastructure for adversarial AI testing.**

*Team git_happens · Hack in Hills '26 · Problem Statement 04 (Bayora)*

---

## What it is

SentinelMesh AI is a secure testing environment where **Red Teams** (attackers) and **Blue Teams** (defenders) can test an AI model at the same time without ever touching each other, or the model itself, except through one controlled checkpoint.

## The problem it solves

When attack and defense work share one environment, attack payloads can leak into defense pipelines, model weights and evaluation data can be exposed, and there is no reliable record of who accessed what. That makes test results untrustworthy.

## How it works

| Piece | Role |
|---|---|
| **Four isolated zones** | Red Team, Blue Team, Model State, Eval Data. No direct paths between them |
| **Policy Gateway** | The only route between zones. Blocks everything by default, inspects every payload, allows only what a rule permits |
| **Audit Ledger** | Records every request and decision in a timestamped, hashed, tamper-evident log |
| **Promotion and rollback** | Blue Team defenses go live only after integrity checks, and are rolled back automatically if safety metrics drop |
| **Anomaly alerts** | Boundary probes and privilege escalation attempts are flagged to Security Operators in real time |

## Who it's for

- **Red Teams** who need a safe place to run attacks
- **Blue Teams** who need to build and validate defenses
- **Security Operators** who monitor, approve policy changes and investigate incidents
- **AI labs and enterprises** that need reproducible, auditable safety testing

## Current status

A **simulated prototype** (animated demo of four scenarios: default-deny, payload inspection, defense promotion and rollback, anomaly escalation). Performance figures in the pitch deck are **design targets, not measured results**. The real gateway, sandboxes and ledger are planned work.

## One-line pitch

> *Test AI attacks and defenses side by side, with nothing crossing a boundary unless it is checked and logged.*

---

*See [README.md](README.md) for the full analysis and research, `docs/` for the pitch deck, and `demo/` for the prototype video.*
