// Isolated, dependency-free regression tests for a proposed pilot retry policy.
// This is a policy simulation, NOT a PostgreSQL integration test or production patch.
// Run: node --test audits/pilot-retry-policy-isolated.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const MAX_ATTEMPTS_PER_CYCLE = 5;
const MAX_RETRY_CYCLES = 2;
const cooldownHours = ({ lastEvent, qualityStatus, lastRunAt }) =>
  lastEvent === 'save_duplicate' ? 48 :
  ['research_failed','queue_claim_failed','source_save_failed'].includes(lastEvent) ? 4 :
  ['needs_sources','needs_photo','needs_translation','blocked'].includes(qualityStatus) && lastRunAt != null ? 24 :
  lastRunAt == null ? 1 : 18;

// A retry cycle must be authorized only after a documented failure classification.
// Repeated attempts with no new evidence remain blocked, not silently reset.
function eligible(t, nowHours) {
  if (t.batch !== 'nokia-20-quality-v1' || t.batchStatus !== 'in_progress') return false;
  if (t.brand !== 'Nokia' || ['approved','rejected'].includes(t.status)) return false;
  if (t.published || t.publicationAllowed || t.leaseUntil > nowHours) return false;
  if (t.status === 'under_review' && !['needs_sources','needs_photo','needs_translation','blocked'].includes(t.qualityStatus)) return false;
  if (t.retryCycle >= MAX_RETRY_CYCLES || !t.retryAuthorized && t.retryCycle > 0) return false;
  if (t.attemptsInCycle >= MAX_ATTEMPTS_PER_CYCLE) return false;
  const wait = cooldownHours(t);
  return (t.lastRunAt == null || nowHours - t.lastRunAt >= wait) &&
    (t.lastDispatchedAt == null || nowHours - t.lastDispatchedAt >= wait);
}
function claim(t, nowHours) {
  if (!eligible(t, nowHours)) return false;
  t.attemptsInCycle += 1;
  t.leaseUntil = nowHours + 0.2;
  t.lastDispatchedAt = nowHours;
  return true;
}
const base = () => ({batch:'nokia-20-quality-v1',batchStatus:'in_progress',brand:'Nokia',status:'needs_sources',
  published:false,publicationAllowed:false,leaseUntil:0,retryCycle:0,retryAuthorized:false,
  attemptsInCycle:0,lastRunAt:null,lastDispatchedAt:null,lastEvent:null,qualityStatus:'needs_sources'});

test('new task claims once; active lease prevents duplicate claim', () => {
  const t=base(); assert.equal(claim(t,100),true); assert.equal(claim(t,100),false);
});
test('five-attempt limit blocks sixth attempt', () => {
  const t={...base(),attemptsInCycle:5}; assert.equal(eligible(t,100),false);
});
test('failed task does not restart merely because cooldown elapsed', () => {
  const t={...base(),attemptsInCycle:5,lastRunAt:1,lastDispatchedAt:1,lastEvent:'research_failed'};
  assert.equal(eligible(t,1000),false);
});
test('reviewed retry cycle allows controlled claim, not an unlimited reset', () => {
  const t={...base(),retryCycle:1,retryAuthorized:true,lastRunAt:1,lastDispatchedAt:1,lastEvent:'research_failed'};
  assert.equal(claim(t,100),true);
  t.leaseUntil=0;t.attemptsInCycle=5;
  assert.equal(claim(t,200),false);
});
test('second retry cycle is forbidden by policy', () => {
  assert.equal(eligible({...base(),retryCycle:2,retryAuthorized:true},100),false);
});
test('published, approved and publication-allowed tasks are never claimed', () => {
  for(const override of [{published:true},{status:'approved'},{publicationAllowed:true}])
    assert.equal(eligible({...base(),...override},100),false);
});
test('cooldown 48h duplicate, 4h error, 24h incomplete quality', () => {
  for(const [lastEvent,qualityStatus,elapsed,expected] of [
    ['save_duplicate','needs_sources',47,false],['save_duplicate','needs_sources',48,true],
    ['research_failed','needs_sources',3,false],['research_failed','needs_sources',4,true],
    [null,'needs_sources',23,false],[null,'needs_sources',24,true]
  ]) {
    const t={...base(),lastRunAt:100,lastDispatchedAt:100,lastEvent,qualityStatus};
    assert.equal(eligible(t,100+elapsed),expected);
  }
});
test('batch and brand scope cannot expand accidentally', () => {
  assert.equal(eligible({...base(),brand:'Samsung'},100),false);
  assert.equal(eligible({...base(),batch:'all-870'},100),false);
});
