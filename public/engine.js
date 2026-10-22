export const teams=['Northbridge FC','Harbour Athletic'];
export const players=[['Amir Khan','Leo Costa','Noah Reed'],['Mateo Silva','Eli Brooks','Sam Okoro']];
// Entirely fictional, deterministic event sequences. Pitch coordinates are 0–100.
export function generateMatch(){
 const events=[];let clock=0;
const add = (
  type, team, player, x, y, endX, endY, outcome,
  receiverIndex = null
) => {
  clock += 6;

  events.push({
    id: `evt_${events.length + 1}`,
    clock,
    type,
    team,
    player: players[team][player],
    receiver:
      type === 'pass' &&
      outcome === 'complete' &&
      receiverIndex !== null
        ? players[team][receiverIndex]
        : null,
    x, y, endX, endY,
    outcome
  });
};
 for(let sequence=0;sequence<60;sequence++){
  const team=sequence<20?sequence%2:sequence<40?0:1;
  const previous = events.at(-1);

const isHighRegain =
  sequence >= 20 &&
  sequence < 40 &&
  sequence % 2 === 0;

if (isHighRegain) {
  const opponent = 1 - team;

  if (previous?.team === team) {
    // First, the attacking team loses possession.
    add(
      'pass', team, 0,
      previous.endX, previous.endY,
      28, 60, 'incomplete'
    );

    add(
      'possession', opponent, 0,
      72, 40, 72, 40, 'won'
    );
  }

  const opponentLocation = events.at(-1);

  // The opponent then misplaces a pass near their own goal.
  add(
    'pass', opponent, 0,
    opponentLocation.endX, opponentLocation.endY,
    28, 60, 'incomplete'
  );

  add(
    'high_regain', team, 0,
    72, 40, 72, 40, 'won'
  );
} else if (
  previous?.type === 'possession' ||
  previous?.type === 'restart'
) {
  if (previous.team !== team) {
    add(
      'pass', previous.team, 0,
      previous.endX, previous.endY,
      70, 50, 'incomplete'
    );

    add('possession', team, 0, 30, 50, 30, 50, 'won');
  }
} else {
  add('possession', team, 0, 30, 50, 30, 50, 'won');
}
const startingEvent = events.at(-1);

add(
  'pass', team, 0,
  startingEvent.endX, startingEvent.endY,
  48, 35, 'complete', 1
);
  add('pressure',1-team,1,48,35,48,35,'applied');
  add('pass',team,1,48,35,70,55,'complete',2);
  if(sequence%4===0){add('pass',team,2,70,55,88,45,'incomplete');add('possession',1-team,0,12,55,12,55,'won');}
 else {
  const createsShot =
    sequence % 10 === 3 ||
    sequence === 29 ||
    sequence === 51;

   if (createsShot) {
  add('pass', team, 2, 70, 55, 83, 46, 'complete', 0);

  const shotOutcome =
    sequence === 29 || sequence === 51
      ? 'goal'
      : sequence % 3 === 0
        ? 'saved'
        : 'off_target';

  add(
    'shot', team, 0, 83, 46, 100, 50,
    shotOutcome
  );
    const defendingTeam = 1 - team;

    if (shotOutcome === 'goal') {
    add(
        'restart', defendingTeam, 0,
        50, 50, 50, 50, 'kick_off'
    );
    } else if (shotOutcome === 'off_target') {
    add(
        'restart', defendingTeam, 0,
        5, 50, 30, 50, 'goal_kick_received'
    );
    } else {
    add(
        'restart', defendingTeam, 0,
        5, 50, 30, 50, 'keeper_distribution_received'
    );
    }
  } else {
    add('pass', team, 2, 70, 55, 55, 40, 'complete', 1);
    add('pass', team, 1, 55, 40, 35, 50, 'complete', 0);

    add('pass', team, 0, 35, 50, 50, 45, 'incomplete');
    add('possession', 1 - team, 0, 50, 55, 50, 55, 'won');
  }
 }
}
 return events;
}
export function statistics(events){
 return teams.map((name,team)=>{const own=events.filter(e=>e.team===team),passes=own.filter(e=>e.type==='pass');return {name,goals:own.filter(e=>e.type==='shot'&&e.outcome==='goal').length,shots:own.filter(e=>e.type==='shot').length,passes:passes.length,completed:passes.filter(e=>e.outcome==='complete').length,accuracy:passes.length?Math.round(100*passes.filter(e=>e.outcome==='complete').length/passes.length):0,highRegains:own.filter(e=>e.type==='high_regain').length};});
}
export function detectMoment(events){
 if(!events.length)return null;
 const now=events.at(-1).clock,recent=events.filter(e=>e.clock>now-300),goal=events.at(-1);
 if(goal.type==='shot'&&goal.outcome==='goal')return {kind:'goal',team:goal.team,evidence:[goal],clock:now};
 for(let team=0;team<2;team++){const regains=recent.filter(e=>e.team===team&&e.type==='high_regain');if(regains.length>=3)return {kind:'pressure',team,evidence:regains,clock:now};}
 const passes=recent.filter(e=>e.type==='pass'&&e.outcome==='complete');
 for(let team=0;team<2;team++){const own=passes.filter(e=>e.team===team);if(own.length>=8&&own.length/passes.length>=.75)return {kind:'control',team,evidence:own,clock:now};}
 const shots = recent.filter(e => e.type === 'shot');

if (shots.length) {
  const shot = shots.at(-1);
  const shotIndex = events.indexOf(shot);
  const nextEvent = events[shotIndex + 1];
  const evidence = [shot];

  if (
    nextEvent?.type === 'restart' &&
    nextEvent.team === 1 - shot.team
  ) {
    evidence.push(nextEvent);
  }

  return {
    kind: 'chance',
    team: shot.team,
    evidence,
    clock: now
  };
}
 return null;
}
export function detectPlayerMoment(events, player) {
  if (!events.length) return null;

  const now = events.at(-1).clock;

  const recent = events.filter(event =>
    event.clock > now - 300 &&
    event.player === player
  );

  const selected =
    recent.findLast(event =>
      event.type === 'shot' && event.outcome === 'goal'
    ) ??
    recent.findLast(event => event.type === 'shot') ??
    recent.findLast(event => event.type === 'high_regain');

  if (!selected) return null;

  const evidence = [selected];

  if (selected.type === 'shot') {
    const next = events[events.indexOf(selected) + 1];

    if (
      next?.type === 'restart' &&
      next.team === 1 - selected.team
    ) {
      evidence.push(next);
    }
  }

  return {
    kind:
      selected.type === 'high_regain'
        ? 'pressure'
        : selected.outcome === 'goal'
          ? 'goal'
          : 'chance',
    team: selected.team,
    evidence,
    clock: now
  };
}
export function explain(moment,mode='casual',language='en',player=players[0][0]){
  if (!moment && mode === 'player') {
  return {
    headline: language === 'es'
      ? 'Sin momento destacado reciente'
      : 'No qualifying recent moment',
    body: language === 'es'
      ? `${player} no tiene goles, tiros ni recuperaciones altas en los últimos cinco minutos.`
      : `${player} has no goals, shots or high regains in the last five minutes.`,
    evidence: []
  };
}
 if(!moment)return {headline:language==='es'?'La historia está tomando forma':'The story is taking shape',body:language==='es'?'Reproduce el partido para descubrir momentos clave.':'Play the match to uncover its first key moment.',evidence:[]};
 const {kind,team,evidence}=moment,name=teams[team],n=evidence.length;
 const copy=language==='es'?{
  goal:['¡Gol! Un momento decisivo',`${evidence[0].player} marca para ${name}. El marcador cambia; revisa la jugada en las pruebas.`],
  pressure:['La presión gana terreno',`${name} recuperó el balón ${n} veces en campo rival en los últimos cinco minutos. Estas recuperaciones permiten iniciar ataques cerca de la portería.`],
  control:['El ritmo tiene dueño',`${name} concentra al menos el 75% de los pases completados en los últimos cinco minutos. Es una señal de control del pase, no una medida de posesión.`],
  chance:['Una oportunidad para cambiarlo',`${name} acaba de disparar. La ubicación del tiro ayuda a entender la oportunidad, pero no garantiza su calidad.`]
 }:{
  goal:['A goal changes the picture',`${evidence[0].player} scores for ${name}. The score changes—open the evidence to inspect the shot.`],
  pressure:['Pressure is winning territory',`${name} won the ball high up the pitch ${n} times in the last five minutes. Those regains offer a shorter route to goal.`],
  control:['A different rhythm emerges',`${name} made at least 75% of completed passes in the last five minutes. That suggests control of passing rhythm; it is not a possession measurement.`],
  chance:['A chance to change the story',`${name} takes a shot. Its location helps explain the opportunity, although location alone cannot establish shot quality.`]
 };
 let [headline,body]=copy[kind];
 if(mode==='analyst')body+=(language==='es'?` Ventana: 300 s. Eventos de apoyo: ${n}.`:` Window: 300 seconds. Supporting events: ${n}.`);
 if(mode==='player'){
  const involved=evidence.filter(e=>e.player===player).length;
  body=language==='es'?`${player}: participa en ${involved} de los ${n} eventos de apoyo. ${body}`:`${player}: involved in ${involved} of ${n} supporting events. ${body}`;
 }
 return {headline,body,evidence};
}
export function overlay(moment,story,mode,language){return {moment_id:moment?`${moment.kind}_${moment.evidence.at(-1).id}`:'waiting',match_clock_seconds:moment?.clock??0,display_duration_seconds:8,headline:story.headline,body:story.body,evidence_event_ids:story.evidence.map(e=>e.id),audience_mode:mode,language,source:'synthetic',generation:'rules_preview'};}

