#!/usr/bin/env python3
"""Safe photo queue worker. No production writes; provider is intentionally explicit."""
import json, os, urllib.request, urllib.error, datetime
from pathlib import Path
ROOT=Path("photo-pipeline/output"); ROOT.mkdir(parents=True,exist_ok=True)
def request(url,headers=None):
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers or {}),timeout=25) as r: return json.load(r)
def main():
    url=os.getenv("SUPABASE_URL","").rstrip("/")
    key=os.getenv("SUPABASE_SERVICE_ROLE_KEY","")
    if not url or not key: raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY; no work performed")
    models=request(url+"/rest/v1/phone_models?select=id&order=id.asc&limit=1000",{"apikey":key,"Authorization":"Bearer "+key})
    completed=0; pending=[]
    for model in models:
        mid=model["id"]; slots=("front","back","left","right")
        if all((ROOT/str(mid)/(s+".png")).is_file() for s in slots): completed+=1
        else: pending.append({"model_id":mid,"missing":[s for s in slots if not (ROOT/str(mid)/(s+".png")).is_file()]})
    report={"time_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"total_models":len(models),"completed_models":completed,"verified_generated_images":completed*4,"pending_models":len(pending),"next_batch":pending[:10],"mode":"inventory-only; generation and publication disabled until provider, reference verification and staging upload tests pass"}
    (ROOT/"status.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False))
if __name__=="__main__": main()
