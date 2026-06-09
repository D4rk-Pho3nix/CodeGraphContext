import sys, json
d = json.load(sys.stdin)
for c in d['statusCheckRollup']:
    conc = c.get('conclusion') or c.get('status', '')
    print(f'{c["name"]}: {conc}')
