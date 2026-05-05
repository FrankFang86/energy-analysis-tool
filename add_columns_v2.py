#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json

# Supabase credentials
SUPABASE_URL = "https://hhoqiozrkskuicgiqdkh.supabase.co"
PROJECT_REF = "hhoqiozrkskuicgiqdkh"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob3Fpb3pya3NrdWljZ2lxZGtoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgwNTUwNCwiZXhwIjoyMDkzMzgxNTA0fQ.MvSs4Q5nW9KWMQZklcDm1FqnPe729yJyCzpd9OKJ3Sc"

def exec_sql_management(sql):
    """Execute SQL via Supabase Management API"""
    data = json.dumps({"query": sql}).encode('utf-8')
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        data=data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
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
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS ac_type TEXT;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS cooling_months integer[];",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS heating_months integer[];",
]

print("Adding missing columns to projects table...")
for sql in sql_statements:
    print(f"\nExecuting: {sql}")
    exec_sql_management(sql)

print("\nDone!")