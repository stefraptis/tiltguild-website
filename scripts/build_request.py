import json

prompt = (
    "Search the web for recent news about the Greek rock band Tilt Guild (tiltguild.com). "
    "Look for upcoming or recent live shows, concerts, interviews, new music announcements, or press mentions. "
    "Return ONLY a raw JSON object with no extra text, no markdown, no code fences, using exactly this structure: "
    '{"featured_release":{"title":"To Kolpo","badge":"Latest Album","meta":"Out now on all platforms",'
    '"artwork":"/images/Music Artworks/kolpo.png","url":"/discography/albums/to_kolpo/"},'
    '"news":[],"updated":"2025-01-01T00:00:00Z"} '
    "If no real news exists use an empty array for news. Never invent news."
)

request = {
    "model": "claude-sonnet-4-6",
    "max_tokens": 2000,
    "tools": [{"type": "web_search_20250305", "name": "web_search"}],
    "messages": [{"role": "user", "content": prompt}]
}

print(json.dumps(request))
