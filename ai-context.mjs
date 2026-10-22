import {teams,players,statistics} from './public/engine.js';
export function buildContext(seen,moment,mode,language,player) {
    const formatClock = seconds => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};
 return {mode,language,selected_player:{name:player,team_name:teams[players.findIndex(roster=>roster.includes(player))],supporting_event_count:moment.evidence.filter(e=>e.player===player).length},team_directory:teams.map((name,id)=>({team_id:id,team_name:name,players:players[id]})),statistics:statistics(seen),moment:{...moment,match_clock:formatClock(moment.clock),team_name:teams[moment.team],window_seconds:300,evidence:moment.evidence.map(e=>({...e,team_name:teams[e.team]}))}};
}
export const instructions = `
You are MatchLens, a football storyteller.

Use only the supplied synthetic match facts.
Use team_name and team_directory to check team membership,
but never print field names, the directory, or raw data.

Write two natural sentences, no more than 60 words.
Use the requested language.

Sentence 1: describe the supported observation.
Sentence 2: explain its significance, or state what remains unknown.

Do not invent causes, tactics, measurements or outcomes.
Completed passes do not establish possession or lateral circulation.
An off-target shot does not establish a rebound or defensive reaction.
Use "may" only for interpretations supported by the evidence.
If significance is unclear, say the evidence is insufficient.
Casual mode: use everyday language.
Analyst mode: include relevant supplied numbers and time windows.

In casual and analyst modes, ignore the selected player.
Do not include a player-absence statement.

Player mode: focus on the selected player's supporting events.
Only in player mode, if supporting_event_count is zero, say:
"The selected player is not involved in the events supporting this insight."
Do not suggest they were inactive or absent from the match.
Do not assess their overall performance from another player's event.

Use match_clock when referring to the current match time.
Numeric clock fields are seconds, not minutes.
Describe completed passes as a count within the window.
Do not call them consecutive or uninterrupted unless explicitly verified.

A shot is already a scoring attempt.
Do not question whether a recorded shot created a scoring opportunity.
For a saved shot, explain that the goalkeeper stopped the attempt.
Describe the aftermath only when a supplied restart event confirms it.
keeper_distribution_received means the goalkeeper held the shot
and distributed the ball to an outfield player.
goal_kick_received means an outfield player received the goal kick.
Never invent a rebound.

Cite one or two supporting event IDs.
Never cite events that were not supplied.
Do not use headings such as "Observed facts" or "Interpretation".
`;

export function buildRecapContext(
  seen, mode, language, player, replayComplete
) {
  const lastEvent = seen.at(-1);
  const seconds = lastEvent?.clock ?? 0;

  const matchClock =
    `${Math.floor(seconds / 60)}:` +
    String(seconds % 60).padStart(2, '0');

  const playerEvents = seen.filter(
    event => event.player === player
  );

  return {
    source: 'synthetic',
    mode,
    language,
    match_clock: matchClock,
    replay_complete: replayComplete,
    statistics: statistics(seen),

    selected_player: {
      name: player,
      goals: playerEvents.filter(
        event => event.type === 'shot' &&
          event.outcome === 'goal'
      ).length,
      shots: playerEvents.filter(
        event => event.type === 'shot'
      ).length,
      completed_passes: playerEvents.filter(
        event => event.type === 'pass' &&
          event.outcome === 'complete'
      ).length,
      high_regains: playerEvents.filter(
        event => event.type === 'high_regain'
      ).length
    },

    key_events: seen
      .filter(event =>
        event.type === 'shot' ||
        event.type === 'high_regain'
      )
      .map(event => ({
        ...event,
        team_name: teams[event.team]
      }))
  };
}