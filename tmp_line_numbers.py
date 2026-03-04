from pathlib import Path
from itertools import chain

path = Path('app/student/dashboard/DashboardClient.tsx')
text = path.read_text().splitlines()
targets = (
    'Learning Journey',
    'statCards.map',
    'Score Trend',
    'Quiz History',
    'Achievement Badges',
)
for idx, line in enumerate(text, 1):
    if any(token in line for token in targets):
        print(f"{idx}: {line.strip()}")
