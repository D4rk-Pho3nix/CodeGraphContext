import sys, json
d = json.load(sys.stdin)
for c in d['statusCheckRollup']:
    conc = c.get('conclusion')
    if conc and conc != 'SUCCESS' and conc != 'SKIPPED' and conc != 'NEUTRAL':
        print(f'{c["name"]} ({c.get("workflowName","?")}): {conc}')
