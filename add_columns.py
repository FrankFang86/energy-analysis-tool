#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json

# Supabase credentials
SUPABASE_URL = "https://hhoqiozrkskuicgiqdkh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob3Fpb3pya3NrdWljZ2lxZGtoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgwNTUwNCwiZXhwIjoyMDkzMzgxNTA0fQ.MvSs4Q5nW9KWMQZklcDm1FqnPe729yJyCzpd9OKJ3Sc"

def exec_sql(sql):
    """Execute SQL via Supabase pg endpoint"""
    data = json.dumps({"sql": sql}).encode('utf-8')
    req = urllib.request.Request(
        f"{SUPABASE_URL}/sql",
        data=data,
        headers={
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
            'Prefer': 'return=minimal'
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = resp.read().decode('utf-8')
            print(f"Success: {result}")
            return True
    except urllib.error.HTTPError as e:
        error = e.read().decode('utf-8')
        print(f"Error {e.code}: {error}")
        return False

# SQL statements to add missing columns
sql_statements = [
    # Add ac_type column
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS ac_type TEXT;",
    # Add cooling_months column (integer array)
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS cooling_months integer[];",
    # Add heating_months column (integer array)
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS heating_months integer[];",
]

print("Adding missing columns to projects table...")
for sql in sql_statements:
    print(f"\nExecuting: {sql}")
    exec_sql(sql)

print("\nDone!")