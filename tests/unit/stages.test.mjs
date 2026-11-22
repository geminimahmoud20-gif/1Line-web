import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIPELINE, OPEN_STAGES, STAGE_RANK, STAGE_NAMES, ALL_STATUSES, STAGE_LIMIT_HOURS, stageName } from '../../src/utils/stages.js';
import { STAGE_RULES } from '../../src/utils/stageGate.js';
import { ORDER, STAGE_LABELS } from '../../src/utils/performanceReport.js';

test('one pipeline: order, ranks, open stages and time limits agree', () => {
  assert.deepEqual(PIPELINE.map((s) => STAGE_RANK[s]), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(OPEN_STAGES, PIPELINE.filter((s) => s !== 'closed'));
  assert.deepEqual(Object.keys(STAGE_LIMIT_HOURS), OPEN_STAGES, 'every open stage has a limit, nothing else');
  assert.equal(ORDER, PIPELINE, 'the reports use the same order');
});

test('every status has a name, and the stage lock and reports know the same stages', () => {
  for (const s of ALL_STATUSES) assert.ok(STAGE_NAMES[s]?.ar && STAGE_NAMES[s]?.en, s);
  assert.deepEqual(STAGE_RULES.map((r) => r.id).filter((id) => !ALL_STATUSES.includes(id)), []);
  for (const s of PIPELINE) assert.ok(STAGE_LABELS[s], s);
  assert.equal(stageName('contacted'), 'مؤهل', 'contacted is «مؤهل» everywhere (it used to read «تم التواصل» in one screen)');
  assert.equal(stageName('closed', false), 'Closed won');
});
