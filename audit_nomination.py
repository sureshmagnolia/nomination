import fitz
import sys
import json
import os

# Set standard output encoding to utf-8
sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'd:/ESP32Radio/Nomination_Guide_Malayalam_English.pdf'
doc = fitz.open(pdf_path)

print(f"============================================================")
print(f"AUDIT OF: {pdf_path}")
print(f"Total Pages: {len(doc)}")
print(f"File Size: {os.path.getsize(pdf_path)} bytes")
print(f"============================================================\n")

for i, page in enumerate(doc):
    page_num = i + 1
    text = page.get_text()
    print(f"------------------------------------------------------------")
    print(f"PAGE {page_num} of {len(doc)}")
    print(f"------------------------------------------------------------")
    
    # Specific Checks for Page 1
    if page_num == 1:
        has_editor_bar = "barred from contesting for" in text or "barred from contesting" in text
        print(f"[*] Page 1 - Barred contesting rule check: {'FOUND' if has_editor_bar else 'NOT FOUND'}")
        for line in text.split('\n'):
            if "Editor" in line or "barred" in line.lower() or "വിലക്കുണ്ട്" in line:
                print(f"    Line: {line.strip()}")

    # Specific Checks for Page 2
    if page_num == 2:
        has_receipt = "receipt" in text.lower() or "acknowledgement" in text.lower() or "രസീത്" in text
        print(f"[*] Page 2 - RO Receipt mention in Method A/B: {'FOUND' if has_receipt else 'NOT FOUND'}")
        for line in text.split('\n'):
            if "receipt" in line.lower() or "acknowledgement" in line.lower() or "രസീത്" in line or "ஒப்புதல்" in line:
                print(f"    Line: {line.strip()}")

    # Specific Checks for Page 3
    if page_num == 3:
        has_receipt_checklist = "receipt" in text.lower() or "acknowledgement" in text.lower() or "രസീത്" in text
        print(f"[*] Page 3 - RO Receipt in Checklist: {'FOUND' if has_receipt_checklist else 'NOT FOUND'}")
        for line in text.split('\n'):
            if "receipt" in line.lower() or "acknowledgement" in line.lower() or "രസീത്" in line or "ஒப்புதல்" in line:
                print(f"    Line: {line.strip()}")

    # Specific Checks for Page 4
    if page_num == 4:
        print(f"[*] Page 4 - Sample Nomination Paper Audit:")
        has_old_title = "ACTUAL FILLED-IN NOMINATION FORM" in text
        has_new_title = "SAMPLE NOMINATION PAPER" in text or "Sample Nomination" in text
        has_hod_cert = "CERTIFICATE FROM HEAD OF DEPARTMENT" in text
        has_tear_off = "Tear-off" in text or "Acknowledgement" in text or "RECEIPT" in text or "✂" in text
        print(f"    Old Title ('ACTUAL FILLED-IN NOMINATION FORM'): {'PRESENT (FLAG!)' if has_old_title else 'ABSENT (GOOD)'}")
        print(f"    New Title ('SAMPLE NOMINATION PAPER'): {'PRESENT (GOOD)' if has_new_title else 'ABSENT (FLAG!)'}")
        print(f"    HoD Certificate on Page 4: {'PRESENT (FLAG - SHOULD BE ON P5)' if has_hod_cert else 'ABSENT (GOOD - MOVED TO P5)'}")
        print(f"    Tear-off RO Receipt Slip: {'PRESENT (GOOD)' if has_tear_off else 'ABSENT (FLAG!)'}")
        for line in text.split('\n'):
            if any(k in line for k in ["SAMPLE", "ACKNOWLEDGEMENT", "RECEIPT", "Tear-off", "Returning Officer", "Nomination Paper", "Sl. No."]):
                print(f"    Sample/Receipt snippet: {line.strip()}")

    # Specific Checks for Page 5
    if page_num == 5:
        print(f"[*] Page 5 - HoD Certificate Audit:")
        has_hod_cert = "CERTIFICATE FROM HEAD OF DEPARTMENT" in text or "HOD CLEARANCE" in text
        print(f"    HoD Certificate Title: {'PRESENT (GOOD)' if has_hod_cert else 'ABSENT (FLAG!)'}")
        for line in text.split('\n'):
            if any(k in line for k in ["HEAD OF DEPARTMENT", "CLEARANCE", "SEAL", "Signature of the HOD", "Department", "Scrutiny"]):
                print(f"    HoD snippet: {line.strip()}")

print("\nAUDIT COMPLETED.")
