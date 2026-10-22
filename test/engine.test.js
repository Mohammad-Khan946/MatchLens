import {test} from 'node:test';import assert from 'node:assert/strict';
import {
  generateMatch, statistics, detectMoment,
  detectPlayerMoment, explain, overlay
} from '../public/engine.js';
test('replay is deterministic and clocks and pitch coordinates are valid',()=>{const e=generateMatch();assert.deepEqual(e,generateMatch());assert.equal(new Set(e.map(x=>x.id)).size,e.length);e.forEach((x,i)=>{assert.ok(x.clock>(e[i-1]?.clock??0));for(const k of ['x','y','endX','endY'])assert.ok(x[k]>=0&&x[k]<=100);});});
test('goals reconcile with the scoreboard and no future events leak',()=>{const e=generateMatch();assert.deepEqual(statistics(e).map(s=>s.goals),[1,1]);assert.deepEqual(statistics(e.slice(0,100)).map(s=>s.goals),[0,0]);});
test('pressure insight cites only recent observed high regains',()=>{const e=generateMatch();let moment;for(let i=1;i<=e.length;i++){const m=detectMoment(e.slice(0,i));if(m?.kind==='pressure'){moment=m;break;}}assert.ok(moment);assert.ok(moment.evidence.length>=3);assert.ok(moment.evidence.every(x=>x.type==='high_regain'&&x.clock>moment.clock-300&&x.clock<=moment.clock));const s=explain(moment);assert.deepEqual(overlay(moment,s,'casual','en').evidence_event_ids,s.evidence.map(x=>x.id));});
test('completed passes reach the next player on the ball', () => {
  const events = generateMatch();

  events.forEach((event, index) => {
    if (event.type !== 'pass' || event.outcome !== 'complete') {
      return;
    }

    assert.ok(event.receiver, `${event.id} needs a receiver`);

    // Pressure describes an opponent's action, not a ball transfer.
    const nextAction = events
      .slice(index + 1)
      .find(next => next.type !== 'pressure');

    assert.ok(nextAction, `${event.id} needs a following action`);
    assert.equal(
      nextAction.player,
      event.receiver,
      `${event.id}: the receiver should perform the next action`
    );
    assert.equal(
      nextAction.team,
      event.team,
      `${event.id}: a completed pass should stay with the same team`
    );
  }); 
}); test('possession wins are not repeated without an intervening ball action', () => {
  const events = generateMatch();

  for (let index = 1; index < events.length; index++) {
    const previous = events[index - 1];
    const current = events[index];

    assert.ok(
      !(previous.type === 'possession' &&
        current.type === 'possession'),
      `${previous.id} → ${current.id}: consecutive possession wins`
    );
  }
}); test('every shot has the correct opposing restart', () => {
  const events = generateMatch();

  const expectedRestarts = {
    goal: 'kick_off',
    off_target: 'goal_kick_received',
    saved: 'keeper_distribution_received'
  };

  events.forEach((event, index) => {
    if (event.type !== 'shot') return;

    const next = events[index + 1];

    assert.ok(next, `${event.id} needs a restart`);
    assert.equal(next.type, 'restart');
    assert.equal(next.team, 1 - event.team);
    assert.equal(
      next.outcome,
      expectedRestarts[event.outcome],
      `${event.id}: incorrect restart after ${event.outcome}`
    );
  });
});
test('the first pass starts at the recovery or restart location', () => {
  const events = generateMatch();
  const startingTypes = ['possession', 'high_regain', 'restart'];

  events.forEach((event, index) => {
    const next = events[index + 1];

    if (
      !startingTypes.includes(event.type) ||
      next?.type !== 'pass' ||
      next.team !== event.team
    ) {
      return;
    }

    assert.equal(next.x, event.endX, `${event.id}: x position jumps`);
    assert.equal(next.y, event.endY, `${event.id}: y position jumps`);
  });
});
test('high regains follow an opponent losing the ball', () => {
  const events = generateMatch();

  events.forEach((event, index) => {
    if (event.type !== 'high_regain') return;

    const previous = events[index - 1];

    assert.ok(previous, `${event.id} needs a preceding event`);
    assert.equal(previous.type, 'pass');
    assert.equal(previous.outcome, 'incomplete');
    assert.equal(
      previous.team,
      1 - event.team,
      `${event.id}: the opponent must lose possession`
    );
  });
});
test('player focus selects Mateo’s shot and observed restart', () => {
  const events = generateMatch();

  const shotIndex = events.findIndex(event =>
    event.type === 'shot' && event.player === 'Mateo Silva'
  );

  assert.ok(shotIndex >= 0);

  const seen = events.slice(0, shotIndex + 2);
  const moment = detectPlayerMoment(seen, 'Mateo Silva');

  assert.ok(moment);
  assert.equal(moment.kind, 'chance');
  assert.equal(moment.evidence[0].player, 'Mateo Silva');
  assert.equal(moment.evidence[0].type, 'shot');
  assert.equal(moment.evidence[1].type, 'restart');
});

test('player focus returns no qualifying moment for Leo', () => {
  const moment = detectPlayerMoment(generateMatch(), 'Leo Costa');

  assert.equal(moment, null);
});