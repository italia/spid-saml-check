import json
import sys

o = {}
with open(sys.argv[1], 'r') as f:
    o = json.load(f)
    f.close()

for h1_title in o.keys():
    print('<h1>%s</h1>' % h1_title)
    for h2_title in o[h1_title].keys():
        print('<h2>%s</h2>' % h2_title)
        for h3_title in o[h1_title][h2_title].keys():
            print('<h3>%s</h3>' % h3_title)
            for test_case in o[h1_title][h2_title][h3_title].keys():
                for h4_title in o[h1_title][h2_title][h3_title][test_case].keys():
                    t = o[h1_title][h2_title][h3_title][test_case][h4_title]
                    print('<h4>%s</h4>' % h4_title)
                    print('<p><strong>Description:</strong> %s</p>' % t['description'])
                    for a in t['assertions']:
                        if a['result'] == 'success':
                            print('<div style="background-color: #f2ffe6; padding: 5px; border: 1px solid green; margin: 5px">')
                            print('<h5 style="color: green">%s</h5>' % a['result'])
                        else:
                            print('<div style="background-color: #ffebe6; padding: 5px; border: 1px solid red; margin: 5px">')
                            print('<h5 style="color: red">%s</h5>' % a['result'])
                        print('<p>Test: %s</p>' % a['test'].replace('\n', '<br/>'))
                        if h4_title != 'test_ssllabs':
                            print('<p>Obtained value: %s</p>' % a['value'])
                        else:
                            print('<p>Obtained value: %s</p>' % a['value']['data']['endpoints'][0]['grade'])
                        print('</div>')
