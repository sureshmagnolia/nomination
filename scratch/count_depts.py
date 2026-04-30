import csv
from collections import Counter

# Target Departments
target_depts = [
    "BOTANY", "CHEMISTRY", "COMMERCE", "COMPUTER-SCIENCE", "ECONOMICS",
    "ENGLISH", "HINDI", "HISTORY", "MALAYALAM", "MATHEMATICS",
    "PHYSICS", "PSYCHOLOGY", "SANSKRIT", "TAMIL", "ZOOLOGY"
]

counts = Counter()
total_students = 0

with open(r"C:\Users\sures\Downloads\ElectionManagement - NominalRoll.csv", mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        total_students += 1
        dept = row['Dept'].strip().upper()
        cls = row['CLASS'].strip().upper()
        
        # Check matching
        for target in target_depts:
            # Normalize target to match CSV style (some have dashes, some have spaces)
            normalized_target = target.replace(' ', '-')
            if dept == normalized_target or target in cls:
                counts[target] += 1
                break

print(f"Total Students in Roll: {total_students}")
print("-" * 30)
for target in target_depts:
    print(f"{target}: {counts[target]}")
print("-" * 30)
print(f"Total counted for associations: {sum(counts.values())}")
