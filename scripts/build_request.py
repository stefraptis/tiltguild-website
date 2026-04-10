import json

prompt = (
    "Search the web for recent news about the Greek rock band Tilt Guild (tiltguild.com). "
    "Look for: upcoming or recent live shows/concerts, new music releases, interviews, press mentions. "
    "You MUST include everything you find in the news array - do not leave it empty if you found results. "
    "Return ONLY a raw JSON object, no markdown, no explanation. Use this exact structure:\n"
    '{"featured_release":{"title":"To Kolpo","badge":"Latest Album","meta":"Out now on all platforms","artwork":"/images/Music Artworks/kolpo.png","url":"/discography/albums/to_kolpo/"},'
    '"news":[{"type":"show","title":"event title here","description":"description here","source":"https://url-here","date":"2026-01-01T00:00:00Z"}],'
    '"updated":"2026-04-10T00:00:00Z"}\n'
    "Include every real result you found in the news array. "
    "Use type: show for concerts/gigs, release for new music, press for interviews/articles. "
    "Never invent news, but always include what you actually found."
)

request = {
    "model": "claude-haiku-4-5-20251001",
    "max_tokens": 2000,
    "tools": [{"type": "web_search_20250305", "name": "web_search"}],
    "messages": [{"role": "user", "content": prompt}]
}

print(json.dumps(request))
