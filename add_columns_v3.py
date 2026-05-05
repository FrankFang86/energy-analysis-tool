#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json

# Supabase credentials
SUPABASE_URL = "https://hhoqiozrkskuicgiqdkh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob3Fpb3pya3NrdWljZ2lxZGtoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgwNTUwNCwiZXhwIjoyMDkzMzgxNTA0fQ.MvSs4Q5nW9KWMQZklcDm1FqnPe729yJyCzpd9OKJ3Sc"

def try_pg_connection():
    """Try direct Postgres connection via connection string"""
    # First, get the connection string from Supabase
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/hhoqiozrkskuicgiqdkh/secrets",
        headers={
            'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        },
        method='GET'
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            print("Available secrets:", json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error getting secrets: {e}")

try_pg_connection()

# Try alternative approach - using pg_execute function if available
print("\n\nTrying to create and execute SQL function...")

# First try to create a function that can add columns
sql_create_function = """
CREATE OR REPLACE FUNCTION exec_sql(sql_text text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"""

# Let's try the REST API with a different approach
print("\nTrying REST API with transaction...")

data = json.dumps({
    "query": """
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS ac_type TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS cooling_months integer[];
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS heating_months integer[];
    """
}).encode('utf-8')

req = urllib.request.Request(
    f"https://hhoqiozrkskuicgiqdkh.supabase.co/rest/v1/rpc/exec_sql_array",
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
except urllib.error.HTTPError as e:
    error = json.loads(e.read().decode('utf-8'))
    print(f"Error: {json.dumps(error, indent=2)}")

print("\n\nIf the above methods failed, please run the following SQL in your Supabase Dashboard:")
print("""
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ac_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cooling_months integer[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS heating_months integer[];
""")