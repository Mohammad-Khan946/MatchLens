# MatchLens

An early local prototype for Inside the Game. Every club, player and event is fictional. No Premier League match data is included.

## Run
Install Node.js if needed, open a terminal in this folder and run `npm start`. Open http://127.0.0.1:3000. No package installation is needed. Run `npm test` for engine checks.

## Implemented
Deterministic synthetic event replay; scoreboard and passing/shot statistics; rolling five-minute pressure and passing-control triggers; evidence panel; casual, analyst and player-context views; English/Spanish rule templates; observed-events recap; downloadable overlay JSON. A full replay is about 36 match minutes, not a regulation 90-minute match. Playback pauses between events rather than tracking continuous movement.

## Important limitations
This is a **rules preview, not an AI-powered submission yet**. Azure hosting and model integration are pending. Language text is predefined. Player focus currently adds involvement context to the detected team story; player-specific story selection is still pending. Overlay JSON includes duration, but automatic on-screen overlay expiry/priority scheduling is pending. No video auto-eventing, measured speed, possession percentage or expected goals is claimed. Synthetic passes and regains use scripted sequences, not a calibrated football simulation; improving spatial continuity, team possession consistency and player roles is a next step.

## Planned Azure engine
Keep event ingestion, deterministic metrics and source-event IDs in server code. Give an Azure-hosted model tools for recent events, team comparisons and player contributions. Require structured output and validate all cited IDs and numerical claims before display. Store credentials server-side in environment variables, never in the public folder or GitHub. Verify available model access before selecting the deployment.

## Submission checklist
- Deploy functioning insights engine on Azure and document actual Microsoft services used.
- Improve and document synthetic data realism and validation.
- Add grounded AI story selection, explanations and recaps, plus meaningful evaluation.
- Public GitHub repository without credentials.
- Public demo video less than two minutes using original visuals and fictional teams.
- Check official submission deadline/timezone and mandatory hero technologies.
