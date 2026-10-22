import {test} from 'node:test';import assert from 'node:assert/strict';
import {generateMatch,detectMoment} from '../public/engine.js';
import {buildContext, buildRecapContext} from '../ai-context.mjs';
test('late-match context identifies Harbour players and separates absent player from whole-match involvement',()=>{const seen=generateMatch(),moment=detectMoment(seen),c=buildContext(seen,moment,'player','en','Amir Khan');assert.equal(c.moment.team_name,'Harbour Athletic');assert.ok(c.moment.evidence.every(e=>e.team_name==='Harbour Athletic'));assert.equal(c.selected_player.team_name,'Northbridge FC');assert.equal(c.selected_player.supporting_event_count,0);});
test('early recap contains only observed events and statistics', () => {
  const all = generateMatch();
  const seen = all.slice(0, 10);

  const recap = buildRecapContext(
    seen, 'player', 'en', 'Leo Costa', false
  );

  assert.equal(recap.replay_complete, false);
  assert.deepEqual(
    recap.statistics.map(team => team.goals),
    [0, 0]
  );

  const observedIds = new Set(seen.map(event => event.id));

  assert.ok(
    recap.key_events.every(event => observedIds.has(event.id))
  );

  assert.equal(recap.selected_player.name, 'Leo Costa');
});