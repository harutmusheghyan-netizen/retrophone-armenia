import os,subprocess,concurrent.futures
BASE=['psql','-h','localhost','-U','postgres','-d','isolated_queue','-v','ON_ERROR_STOP=1','-Atc']
def sql(q):
 return subprocess.check_output(BASE+[q],env=os.environ,text=True).strip()
for task in (3,4,5,6):
 assert sql(f"SELECT public.authorize_pilot_retry({task},'Documented failed research, manual review','reviewer')")=='t'
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 results=list(pool.map(lambda _:sql('SELECT task_id FROM public.claim_authorized_retry(4)'),range(2)))
claimed=[int(s) for output in results for s in output.splitlines() if s]
assert len(claimed)==4,claimed
assert len(set(claimed))==4,claimed
assert sql('SELECT count(*) FROM public.agent_retry_state WHERE task_id IN (3,4,5,6) AND attempts=1')=='4'
assert sql('SELECT count(*) FROM public.claim_authorized_retry(4)')=='0'
print('PASS: concurrent clients claimed four distinct tasks, no duplicates')
