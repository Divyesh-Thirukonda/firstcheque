# Seed Street: 60-90 second demo

Open https://seed-street.vercel.app/?view=Proposals and select **Try the demo**.

1. **0-15s:** Choose **Find missing info** or **Make an offer**. The offer starts at $1,000; **Edit offer** changes it. The company entry also exposes these two actions directly.
2. **15-50s:** Select **Start voice demo**. ElevenLabs generates a short narrated fictional conversation while Nicrron extracts exact transcript passages in parallel. The UI shows the actual operations and clearly labels the example fictional. Listen to the short clip, or choose **Skip to contract** once the terms are ready.
3. **50-75s:** When playback ends, the unsigned contract draft opens automatically. Point out the SAFE cap, missing details and blank signatures. Terms remain editable using the Terms step.
4. **75-90s:** Select **Download contract**. The browser generates a PDF locally, marked Draft - Pending Signatures on every page.

Suggested narration: “Seed Street discovers companies and organizes public evidence. These actions close the information gap between research and a proposed investment. This example uses fictional founder answers, real ElevenLabs audio and real Nicrron extraction. Interest becomes an unsigned draft, never a signature or completed investment.”

The demo needs the existing TTS, Nicrron and PRISM configuration. No Twilio account, recipient verification, microphone permission or paid phone call is required. Voice failure preserves a route to the prepared draft; model failure is shown and can be retried. **Try the demo** creates a fresh browser-local rehearsal without replacing older draft records. Fictional answers are never written to company profiles, financials or shared research.

## Contact discovery and future phone calls

Deep research now follows up to three same-domain Contact/About/Team pages and retains published E.164 phone numbers, original evidence, source URLs and check dates. Website `tel:` links and explicit international numbers in page/footer text qualify; local numbers without a country code are not guessed. Unknown or blocked contact data remains unknown. Old profiles can refresh contacts from the call screen.

The optional real-call adapter supports ElevenLabs Twilio/SIP initiation, signed two-hour conversation-status tokens, automatic transcript retrieval and term extraction. It is **not configured or telephone-tested** in this demo. Real calls require an imported outbound number, an Agents-scoped key and the configured custom LLM endpoint. They also require the recipient to have agreed to the AI call and transcription. Published phone data alone is not consent. No startup has been called during implementation.

The voice-model endpoint uses Nicrron with private-content-redacted PRISM traces and only permits the end-call tool. It was tested through a real model request with a fictional declining recipient; the model produced `end_call`. Before connecting an external phone agent, configure authenticated external access to that endpoint while retaining deployment protection; do not disable protection or publish the bearer secret. The agent must use Custom LLM, include `{{brief}}` in its prompt, permit the first-message override and stay within a three-minute maximum. The adapter checks those model/brief settings before initiating a call. A signed token is required to retrieve a conversation; phone initiation is never automatically retried after an ambiguous error.

Twilio’s current trial has a shared trial number and blocks media streaming required for the ElevenLabs phone integration. The user selected the browser demo instead of a paid upgrade. Twilio credentials were used only for read-only account/number checks and are not saved in source or deployed environments. ElevenAgents Terms were accepted with explicit user approval; no phone number was purchased or imported.

References: [Twilio Voice trial](https://www.twilio.com/docs/usage/trials/try-out-voice), [ElevenLabs outbound call API](https://elevenlabs.io/docs/eleven-agents/api-reference/integrations/twilio/outbound-call), [ElevenLabs custom LLM](https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm).
