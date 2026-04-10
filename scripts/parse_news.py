import sys
import json

raw = sys.stdin.read()
data = json.loads(raw)

text = ""
for block in data.get("content", []):
    if block.get("type") == "text":
        text = block["text"].strip()
        break

# Strip markdown fences if present
if "```" in text:
    lines = text.split("\n")
    lines = [l for l in lines if not l.startswith("```")]
    text = "\n".join(lines).strip()

# Find JSON object in text
start = text.find("{")
end = text.rfind("}") + 1
if start >= 0 and end > start:
    text = text[start:end]

parsed = json.loads(text)
print(json.dumps(parsed, indent=2))
