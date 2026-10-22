import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {
  buildContext, buildRecapContext, instructions
} from './ai-context.mjs';
import {
  generateMatch, statistics, detectMoment,
  detectPlayerMoment, teams, players
} from './public/engine.js';
let config={};try{config=JSON.parse((await readFile(new URL('./.azure.local.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));}catch{}
let busy=false,lastCall=0;
async function api(req,res){
 const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:3000'&&req.headers.origin!=='http://localhost:3000')return reply(403,{error:'Origin not allowed'});
 if(req.method==='GET'&&req.url==='/api/status')return reply(200,{configured:Boolean(config.key)});
 if (
  req.method !== 'POST' ||
  !['/api/insight', '/api/recap'].includes(req.url)
) {
  return reply(404, {error: 'Not found'});
}

const isRecap = req.url === '/api/recap';
 if(!config.key)return reply(503,{error:'Run setup-azure.ps1, then restart MatchLens.'});
 if(busy||Date.now()-lastCall<5000)return reply(429,{error:'Please wait a few seconds before requesting another insight.'});
 let body='';try{for await(const chunk of req){body+=chunk;if(body.length>2048)return reply(413,{error:'Request too large'});}const {count,mode,language,player}=JSON.parse(body);
 const all=generateMatch();if(!Number.isInteger(count)||count<1||count>all.length||!['casual','analyst','player'].includes(mode)||!['en','es'].includes(language)||!players.flat().includes(player))return reply(400,{error:'Invalid match settings'});
 const seen = all.slice(0, count);

const recapContext = isRecap
  ? buildRecapContext(
      seen, mode, language, player,
      count === all.length
    )
  : null;

const moment = isRecap
  ? {
      clock: seen.at(-1).clock,
      evidence: recapContext.key_events
    }
  : mode === 'player'
    ? detectPlayerMoment(seen, player)
    : detectMoment(seen);

if (!moment) {
  return reply(400, {
    error: mode === 'player'
      ? 'No goal, shot or high regain for this player in the last five match minutes.'
      : 'Play more of the match to find a moment first.'
  });
}

const requestContext = isRecap
  ? recapContext
  : buildContext(seen, moment, mode, language, player);

const requestInstructions = isRecap
  ? `
    Write a MatchLens recap in the requested language.
    Use only the supplied synthetic facts.
    Write at most 100 words.
    Include the score and describe supported highlights.
    Casual mode: use everyday language.
    Analyst mode: include relevant supplied statistics.
    Player mode: focus on the selected player's supplied totals.
    In other modes, ignore the selected player.
    Do not equate passing totals with possession or dominance.
    Do not invent causes, tactics, milestones or outcomes.
    Use match_clock for the current time; event clocks are seconds.
    If replay_complete is false, clearly say this is a recap so far.
    If true, say the synthetic replay has ended.
    Never imply this is a regulation 90-minute match.
    Cite one or two key event IDs when key_events is nonempty.
    When key_events is empty, summarize the supplied totals
    without inventing highlights or citations.
    Do not print internal field names.
  `
  : instructions;
 busy=true;lastCall=Date.now();
 const response = await fetch(
  'https://matchlens-mk-20261021.services.ai.azure.com/openai/v1/responses',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.key
    },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model: 'matchlens-insight',
      store: false,
      max_output_tokens: 1600,
      instructions: requestInstructions,
      input: JSON.stringify(requestContext)
    })
  }
);
 if(!response.ok)return reply(502,{error:`Azure returned ${response.status}. Check the local key, deployment access and available quota.`});
 const result=await response.json(),text=result.output?.flatMap(x=>x.content??[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
 if (!text?.trim()) {
  return reply(502, {
    error: 'Azure returned no text. Please retry.'
  });
}
 const wordCount = text.trim().split(/\s+/).length;

const containsInternalLabels =
  /\b(team_directory|team_name|supporting_event_count)\b/i.test(text);

if (wordCount > (isRecap ? 100 : 60) || containsInternalLabels) {
  return reply(502, {
    error: 'The explanation failed the presentation check. Please retry.'
  });
}
 const allowed=new Set(moment.evidence.map(e=>e.id)),cited=text.match(/evt_\d+/g)??[];
 if (
  (allowed.size > 0 && !cited.length) ||
  cited.some(id => !allowed.has(id))
) {
  return reply(502, {
    error: 'The response failed the event-reference check. Please retry.'
  });
}
 reply(200,{text,clock:moment.clock,evidence:moment.evidence,source:'azure_ai',validation:'Event references checked; factual and numerical accuracy are not fully validated.'});
 }catch{return reply(502,{error:'Could not complete the Azure request. Check your connection and local configuration.'});}finally{busy=false;}
}
const root=new URL('./public/',import.meta.url);
http.createServer(async(req,res)=>{if(req.url.startsWith('/api/'))return api(req,res);try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=new URL('.'+(path==='/'?'/index.html':path),root);if(!file.href.startsWith(root.href)){res.writeHead(403).end();return;}const data=await readFile(fileURLToPath(file));res.writeHead(200,{'Content-Type':file.pathname.endsWith('.js')?'text/javascript':file.pathname.endsWith('.css')?'text/css':'text/html'});res.end(data);}catch{res.writeHead(404).end('Not found');}}).listen(3000,'127.0.0.1',()=>console.log('MatchLens: http://127.0.0.1:3000'));

