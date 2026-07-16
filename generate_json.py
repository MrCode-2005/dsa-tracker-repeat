import csv
import json
import os

files = {
    'NeetCode': 'neetcode_links.csv',
    'Destination FAANG': 'destination_faang_links.csv',
    'Greg Hogg': 'greg_hogg_links.csv'
}

data = {}

for channel, filename in files.items():
    if not os.path.exists(filename): continue
    with open(filename, 'r') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if len(row) < 3: continue
            num = row[0].strip()
            url = row[2].strip()
            if not url: continue
            if num not in data:
                data[num] = {}
            data[num][channel] = url

with open('src/lib/data/defaultVideoUrls.json', 'w') as f:
    json.dump(data, f)
print("Generated defaultVideoUrls.json!")
