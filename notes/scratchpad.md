const BEARER_TOKEN = process.env.BEARER_TOKEN;
const STARLING_API_BASE_URL =
process.env.STARLING_API_BASE_URL ?? "https://api.starlingbank.com";

if (!BEARER_TOKEN) {
throw new Error("BEARER_TOKEN environment variable is required");
}

Calling Tools with User Input

The view can call tools/call directly. So your UI can render a form, collect input from the user, then fire a tool call with those
arguments:

User fills form → View calls tools/call → Server processes → View receives tool-result notification

App-Only Tools

You can define tools with visibility: ["app"] — these are hidden from the model but callable by your UI. This is perfect for form
submission endpoints that shouldn't be exposed to the agent:

{
"name": "submit_transfer",
"visibility": ["app"]
}

Sending to Chat

If you want the input to trigger a model response, the view can send ui/message which adds a message to the conversation:

{ "method": "ui/message", "params": { "role": "user", "content": { "type": "text", "text": "..." } } }

Practical Pattern

So a full input-first flow could be:

1. Model calls a tool (e.g. open_transfer_form) with minimal/no args
2. Your UI renders — user fills in recipient, amount, etc.
3. On submit, view calls an app-only submit_transfer tool with the collected data
4. View renders the result (success/error)

This is a legitimate and well-supported pattern in the spec — the UI isn't just for pretty output, it's a full interaction surface.

❯ Can I generate the UI just before we execute the tool for the tool response. I want to create a delete payee tool but fetch the
payee details just before the payee is created to show in the UI as the deleted payee

Session to resume from to add visibility param to framework:

- claude --resume 82bc3a85-a13d-4efd-b507-ce3964f2707a

Problem: For spaces without photos, the Starling API sometimes returns a 200 OK with data that passes the truthiness check but isn't valid image
data. The <img> tag then gets an invalid src and renders a broken image icon instead of falling back to initials.

Fix: Added onError handlers to the <img> tags in all three photo components across both widgets:

- SpacePhoto in get-space.tsx (line 37)
- SpacePhoto in get-spaces.tsx (line 55)
- SpaceListPhoto in get-spaces.tsx (line 68)

Each component now tracks a failed state. If the image fails to load, onError fires, setting failed = true, which causes the component to
re-render with the initials fallback instead of the broken <img>
