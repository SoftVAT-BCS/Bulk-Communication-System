"""Offline validator for the approved fixture. No database or network operations."""
import argparse
import collections
import csv
import hashlib
import io
import json
from pathlib import Path
import re

HEADERS = ['Target_ID', 'Name', 'Email', 'Group', 'Category', 'Grade', 'DOB',
           'Gender', 'Mobile No', 'WhatsApp No', 'Address 1', 'Address 2',
           'City', 'Pin', 'ST ID', 'DT ID', 'Status']
SOURCE_SHA256 = 'd4938008f983a48387f4fc2519bbb331eea734d677121e882c2230e59eef557e'
PAIRS = {
    'Design & UX': ['Figma · Evening', 'Product Design · Weekend', 'UI Fundamentals · Batch A'],
    'Digital Marketing': ['Performance Ads · Batch B', 'SEO · Batch A', 'Analytics · Weekend'],
    'Full Stack Development': ['Java Full Stack · Batch C', 'React JS · Batch A', 'Node.js · Batch B'],
    'Data Science & AI': ['Python · Morning', 'Machine Learning · Evening', 'GenAI · Weekend'],
}
STATUSES = {'Active': 213, 'Inactive': 12, 'Bounced': 7, 'Unsubscribed': 8}


def validate(raw):
    """Fail closed on a changed fixture; return aggregates and UTF-8 bytes only."""
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise ValueError('Source checksum differs; new source review required')
    text = raw.decode('cp1252', errors='strict')
    if text.encode('cp1252') != raw:
        raise ValueError('Source encoding round-trip failed')
    dialect = csv.Sniffer().sniff(text[:8192], delimiters=',;\t|')
    if dialect.delimiter != '\t':
        raise ValueError('Expected tab delimiter')
    records = list(csv.reader(io.StringIO(text, newline=''), delimiter='\t', strict=True))
    if not records or records[0] != HEADERS:
        raise ValueError('Unexpected column mapping')
    if any(len(row) != 17 for row in records[1:]):
        raise ValueError('Invalid record width')
    rows = [dict(zip(HEADERS, row)) for row in records[1:]]
    if len(rows) != 240:
        raise ValueError('Unexpected record count')
    problems = collections.Counter()
    for row in rows:
        for key, value in row.items():
            problems['surrounding_whitespace'] += value != value.strip()
            problems['control_characters'] += any(ord(c) < 32 or ord(c) == 127 for c in value)
        problems['required_blanks'] += any(not row[k] for k in ['Target_ID', 'Name', 'Email', 'Group', 'Category', 'Status'])
        problems['invalid_email_syntax'] += re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', row['Email']) is None
        problems['invalid_group_category_pair'] += row['Category'] not in PAIRS.get(row['Group'], [])
        problems['invalid_status'] += row['Status'] not in STATUSES
    for key in ['Target_ID', 'Email']:
        values = [row[key].strip().casefold() for row in rows]
        problems['duplicate_' + key] = len(values) - len(set(values))
    if any(problems.values()):
        raise ValueError('Validation failures: ' + json.dumps(dict(problems)))
    status_counts = dict(collections.Counter(row['Status'] for row in rows))
    if status_counts != STATUSES:
        raise ValueError('Unexpected status distribution')
    utf8 = text.encode('utf-8', errors='strict')
    if list(csv.reader(io.StringIO(utf8.decode('utf-8'), newline=''), delimiter='\t')) != records:
        raise ValueError('UTF-8 conversion changed cell values')
    return {
        'records': len(rows), 'columns': len(HEADERS), 'source_bytes': len(raw),
        'source_sha256': SOURCE_SHA256, 'delimiter': 'TAB',
        'encoding': 'Windows-1252-compatible; byte 0xB7 also compatible with Latin-1',
        'status_counts': status_counts,
        'group_counts': dict(collections.Counter(row['Group'] for row in rows)),
        'category_counts': dict(collections.Counter(row['Category'] for row in rows)),
        'blank_counts': {key: sum(not row[key] for row in rows) for key in HEADERS},
        'errors': dict(problems), 'utf8_bytes': len(utf8),
        'utf8_sha256': hashlib.sha256(utf8).hexdigest(),
        'high_bytes': sorted(set(b for b in raw if b >= 128)),
    }, utf8


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--utf8-output', type=Path, help='Optional exclusive-create copy; never overwrites')
    args = parser.parse_args()
    try:
        result, utf8 = validate(args.source.read_bytes())
        if args.utf8_output:
            with args.utf8_output.open('xb') as destination:
                destination.write(utf8)
        print(json.dumps(result, indent=2, ensure_ascii=True))
    except (ValueError, OSError, csv.Error):
        # Never echo input rows, filenames containing private data, or decoder payloads.
        parser.exit(1, 'Offline validation/conversion failed; inspect locally. No import attempted.\n')


if __name__ == '__main__':
    main()
