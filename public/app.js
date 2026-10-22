import { teams, players, generateMatch, statistics, detectMoment, detectPlayerMoment, explain, overlay } from './engine.js';
const $ = id => document.getElementById(id), events = generateMatch(); let count = 0, playing = false, timer, payload;
const time = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
for (const name of players.flat()) $('player').add(new Option(name, name));
$('seek').max = events.length;
function render() {
  const seen = events.slice(0, count), stats = statistics(seen), last = seen.at(-1), mode = $('mode').value, lang = $('language').value, moment = (
    mode === 'player'
      ? detectPlayerMoment(seen, $('player').value)
      : detectMoment(seen)
  ), story = explain(moment, mode, lang, $('player').value);
  $('clock').textContent = time(last?.clock ?? 0); $('score').textContent = `${stats[0].goals} : ${stats[1].goals}`; $('progress').textContent = `${count} / ${events.length} events`; $('seek').value = count;
  $('headline').textContent = story.headline; $('body').textContent = story.body; $('storytime').textContent = moment ? `${time(moment.clock)} · ${teams[moment.team]}` : 'WAITING FOR PLAY';
  $('evidence').replaceChildren(...story.evidence.map(e => { const p = document.createElement('p'); p.textContent = `${e.id} · ${time(e.clock)} · ${e.player} · ${e.type.replaceAll('_', ' ')} · ${e.outcome}`; return p; }));
  $('stats').innerHTML = [['Shots', stats[0].shots, stats[1].shots], ['Pass completion', `${stats[0].accuracy}%`, `${stats[1].accuracy}%`], ['Completed passes', stats[0].completed, stats[1].completed], ['High regains', stats[0].highRegains, stats[1].highRegains]].map(([label, a, b]) => `<div class="stat"><b>${a}</b><span>${label}</span><b>${b}</b></div>`).join('');
  if (last) { const flip = last.team === 1, x = v => 4 + (flip ? 100 - v : v) * .92, y = v => 4 + v * .56; $('ball').setAttribute('cx', x(last.endX)); $('ball').setAttribute('cy', y(last.endY)); $('trail').setAttribute('d', `M${x(last.x)} ${y(last.y)} L${x(last.endX)} ${y(last.endY)}`); $('event').textContent = `${last.player} · ${last.type.replaceAll('_', ' ')} · ${last.outcome}`; } else { $('ball').setAttribute('cx', 50); $('ball').setAttribute('cy', 32); $('trail').setAttribute('d', ''); $('event').textContent = 'Ready for kick-off'; }
  payload = overlay(moment, story, mode, lang);
  maybeAutoInsight(moment);
  if (!$('recapbox').hidden) recap();
}
function schedule() {
  clearInterval(timer);

  if (playing) {
    timer = setInterval(() => {
      if (count >= events.length) {
        playing = false;
        clearInterval(timer);

        $('play').textContent = '↺ Play again';
        $('recapbox').hidden = false;

        recap();
        queueFinalRecap();
        return;
      }

      count++;
      render();
    }, 600 / Number($('speed').value));
  }
}
$('play').onclick = () => {
  if (count === events.length) count = 0;

  playing = !playing;
  $('play').textContent = playing ? 'Ⅱ Pause' : '▶ Play match';

  schedule();
  render();
};

$('reset').onclick = () => {
  playing = false;
  clearInterval(timer);
  count = 0;
  $('play').textContent = '▶ Play match';
  $('recapbox').hidden = true;
  render();
};

$('seek').oninput = event => {
  count = Number(event.target.value);
  render();
};

for (const id of ['mode', 'language', 'player']) {
  $(id).onchange = render;
}

$('speed').onchange = schedule;

document.querySelectorAll('.jump[data-minute]').forEach(button => {
  button.onclick = () => {
    count = events.filter(
      event => event.clock <= Number(button.dataset.minute) * 60
    ).length;

    render();
  };
});
function recap() { const seen = events.slice(0, count), s = statistics(seen), es = $('language').value === 'es', focus = $('mode').value === 'player', name = $('player').value, shots = seen.filter(e => e.player === name && e.type === 'shot').length; $('recaptext').textContent = es ? `Hasta ${time(seen.at(-1)?.clock ?? 0)}: ${teams[0]} ${s[0].goals}–${s[1].goals} ${teams[1]}. Tiros: ${s[0].shots}–${s[1].shots}. Pases completados: ${s[0].completed}–${s[1].completed}. ${focus ? `${name}: ${shots} tiros.` : ''} Resumen de eventos sintéticos; no implica un resultado final antes del fin de la reproducción.` : `Through ${time(seen.at(-1)?.clock ?? 0)}: ${teams[0]} ${s[0].goals}–${s[1].goals} ${teams[1]}. Shots: ${s[0].shots}–${s[1].shots}. Completed passes: ${s[0].completed}–${s[1].completed}. ${focus ? `${name} recorded ${shots} shots.` : ''} This recap covers observed synthetic events only; the result is final only when playback finishes.`; }
$('recap').onclick = () => { $('recapbox').hidden = false; recap(); $('recapbox').scrollIntoView({ behavior: 'smooth' }); };
$('export').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = 'matchlens-overlay.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const aiBox = document.createElement('section'); aiBox.className = 'panel recap';
const aiTitle = document.createElement('p'); aiTitle.className = 'eyebrow'; aiTitle.textContent = 'AZURE AI · EXPLAIN THE CURRENT MOMENT';
const aiButton = document.createElement('button'); aiButton.textContent = 'Ask MatchLens AI';
const aiText = document.createElement('p'); aiText.textContent = 'Each click sends the current synthetic moment to Azure. Uses your Azure credit. The response is a snapshot; replay can continue.'; aiText.setAttribute('aria-live', 'polite');
aiBox.append(aiTitle, aiButton, aiText); document.querySelector('footer').before(aiBox);
fetch('/api/status').then(r => r.json()).then(s => { if (!s.configured) aiText.textContent = 'Azure key not configured yet. Run the local setup helper, then restart MatchLens.'; }).catch(() => { });
let aiRequestInProgress = false;
let lastAiRequestStartedAt = 0;

async function requestInsight() {
  if (aiRequestInProgress) return;

  lastAiRequestStartedAt = Date.now();
  lastAiRequestStartedAt = Date.now();
  aiRequestInProgress = true;
  aiButton.disabled = true;
  aiText.textContent = 'Azure is explaining this moment…';

  try {
    const response = await fetch('/api/insight', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        count,
        mode: $('mode').value,
        language: $('language').value,
        player: $('player').value
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error);
    }

    aiText.textContent =
      `At ${time(result.clock)} · ${result.text} ` +
      'AI generated; event references checked, ' +
      'factual accuracy not fully validated.';
  } catch (error) {
    aiText.textContent = error.message;
  } finally {
    aiRequestInProgress = false;
    aiButton.disabled = false;
  }
}

aiButton.onclick = () => requestInsight();

let autoInsightsEnabled = false;
let automaticRequestCount = 0;
let lastAutomaticRequestTime = 0;
const narratedMoments = new Set();

const autoButton = document.createElement('button');
autoButton.className = 'secondary';
autoButton.textContent = 'Automatic insights: OFF';
autoButton.style.marginLeft = '10px';

aiButton.after(autoButton);

autoButton.onclick = () => {
  autoInsightsEnabled = !autoInsightsEnabled;

  autoButton.textContent = autoInsightsEnabled
    ? 'Automatic insights: ON'
    : 'Automatic insights: OFF';
};
function maybeAutoInsight(moment) {
  if (!autoInsightsEnabled || !playing || !moment) return;
  if (aiRequestInProgress || automaticRequestCount >= 6) return;

  const now = Date.now();

  if (now - lastAutomaticRequestTime < 20000) return;

const storyKey =
  moment.kind === 'goal' || moment.kind === 'chance'
    ? `${moment.kind}:${moment.evidence[0].id}`
    : `${moment.kind}:${moment.team}`;

const momentKey = [
  $('mode').value,
  $('language').value,
  $('player').value,
  storyKey
].join(':');

  if (narratedMoments.has(momentKey)) return;

  narratedMoments.add(momentKey);
  automaticRequestCount++;
  lastAutomaticRequestTime = now;

  requestInsight(); 
}
  let finalRecapScheduled = false;

function queueFinalRecap() {
  if (!autoInsightsEnabled) {
  aiRecapText.textContent =
    'Replay ended. Automatic recap is OFF; use Generate AI recap.';
  return;
}

if (finalRecapScheduled) return;

finalRecapScheduled = true;

aiRecapText.textContent =
  'Replay ended. Automatic recap queued; waiting for the AI request slot…';
  let checks = 0;

  function tryRecap() {
    // Cancel if automation is off or playback has moved.
    if (
      !autoInsightsEnabled ||
      playing ||
      count !== events.length
    ) {
      return;
    }

    const cooldownFinished =
      Date.now() - lastAiRequestStartedAt >= 5500;

    if (!aiRequestInProgress && cooldownFinished) {
      requestRecap();
      return;
    }

    checks++;

    if (checks < 60) {
      setTimeout(tryRecap, 1000);
    }
  }

  setTimeout(tryRecap, 1000);
}
  render();
const aiRecapBox = document.createElement('section');
aiRecapBox.className = 'panel recap';

const aiRecapTitle = document.createElement('p');
aiRecapTitle.className = 'eyebrow';
aiRecapTitle.textContent = 'AZURE AI · MATCH RECAP';

const aiRecapButton = document.createElement('button');
aiRecapButton.textContent = 'Generate AI recap';

const aiRecapText = document.createElement('p');
aiRecapText.setAttribute('aria-live', 'polite');
aiRecapText.textContent =
  'Summarize the synthetic match played so far. Uses Azure credit.';

aiRecapBox.append(
  aiRecapTitle,
  aiRecapButton,
  aiRecapText
);

document.querySelector('footer').before(aiRecapBox);

async function requestRecap() {
  if (aiRequestInProgress) return;

  if (count === 0) {
    aiRecapText.textContent = 'Play some of the match first.';
    return;
  }

  aiRequestInProgress = true;
  aiRecapButton.disabled = true;
  aiButton.disabled = true;
  aiRecapText.textContent = 'Azure is writing your recap…';

  try {
    const response = await fetch('/api/recap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        count,
        mode: $('mode').value,
        language: $('language').value,
        player: $('player').value
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error);
    }

    aiRecapText.textContent =
      `Recap through ${time(result.clock)} · ${result.text} ` +
      'AI generated; event references checked. ' +
      'Factual and numerical accuracy are not fully validated.';
  } catch (error) {
    aiRecapText.textContent = error.message;
  } finally {
    aiRequestInProgress = false;
    aiRecapButton.disabled = false;
    aiButton.disabled = false;
  }
}

aiRecapButton.onclick = () => requestRecap();
render();
