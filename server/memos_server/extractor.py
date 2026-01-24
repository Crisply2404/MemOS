from __future__ import annotations

from dataclasses import dataclass
import re


@dataclass(frozen=True)
class ExtractedBuckets:
    facts: list[str]
    preferences: list[str]
    constraints: list[str]
    decisions: list[str]


_SPLIT_CLAUSES_RE = re.compile(r"[；;]\s*")


def _split_clauses(text: str) -> list[str]:
    value = (text or "").strip()
    if not value:
        return []
    parts = [p.strip() for p in _SPLIT_CLAUSES_RE.split(value)]
    return [p for p in parts if p]


_PREF_RE = re.compile(r"^(?:我的偏好|偏好|我希望|我倾向于|我更喜欢|希望能|希望)[:：]\s*(.+)$")
_PREF_SENTENCE_RE = re.compile(r"^(?:我希望|我倾向于|我更喜欢|希望能|希望).+$")
_CONSTRAINT_LABEL_RE = re.compile(r"^(?:约束|限制)[:：]\s*(.+)$")
_DECISION_LABEL_RE = re.compile(r"^(?:决策|决定|选择|我选)[:：]\s*(.+)$")
_DECISION_SENTENCE_RE = re.compile(r"^(?:我选[AB]|我选择).+$")
_FACT_LABEL_RE = re.compile(r"^(?:事实)[:：]\s*(.+)$")

# Directive-like sentences without explicit labels.
_CONSTRAINT_SENTENCE_RE = re.compile(r"^(?:必须|不要|不能|不许|禁止|保留)(?:\s*|：|:)?(.+)?$")


def extract_directive_buckets(cleaned_lines: list[str]) -> ExtractedBuckets:
    """Extract buckets from explicit, human-authored directives.

    Industry-leaning constraint: in the absence of an LLM, only extract when the
    user (or seed data) uses explicit, stable markers (e.g. "决策：", "约束：").
    This avoids overfitting / accidental matches caused by naive substring checks.
    """

    facts: list[str] = []
    preferences: list[str] = []
    constraints: list[str] = []
    decisions: list[str] = []

    for s in cleaned_lines:
        m = _FACT_LABEL_RE.match(s)
        if m:
            facts.extend(_split_clauses(m.group(1)))
            continue

        m = _PREF_RE.match(s)
        if m:
            preferences.extend(_split_clauses(m.group(1)))
            continue
        if _PREF_SENTENCE_RE.match(s):
            preferences.append(s)
            continue

        m = _CONSTRAINT_LABEL_RE.match(s)
        if m:
            constraints.extend(_split_clauses(m.group(1)))
            continue

        m = _DECISION_LABEL_RE.match(s)
        if m:
            decisions.extend(_split_clauses(m.group(1)))
            continue
        if _DECISION_SENTENCE_RE.match(s):
            decisions.append(s)
            continue

        # Fallback: only treat a line as a constraint when it *starts* with a modal.
        m = _CONSTRAINT_SENTENCE_RE.match(s)
        if m:
            constraints.append(s)

    return ExtractedBuckets(
        facts=_uniq(facts),
        preferences=_uniq(preferences),
        constraints=_uniq(constraints),
        decisions=_uniq(decisions),
    )


def _uniq(items: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for x in items:
        k = (x or "").strip()
        if not k:
            continue
        if k in seen:
            continue
        seen.add(k)
        out.append(k)
    return out
