import csv

phd_count = 0
with open(r"C:\Users\sures\Downloads\ElectionManagement - NominalRoll.csv", mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        cls = row['CLASS'].strip().upper()
        if 'PH D' in cls or 'PH.D' in cls:
            phd_count += 1

print(f"Total PhD Scholars: {phd_count}")
