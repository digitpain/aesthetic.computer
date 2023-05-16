// Ask, 23.05.16.13.49
// A vercel edge function to handle OpenAI text prediction APIs.

import { OpenAI } from "openai-streams";
export const config = { runtime: "edge" };

export default async function ask(request, context) {
  const origin = request.headers.get("Origin");
  const production = origin === "https://aesthetic.computer";
  const allowedOrigin = production ? "https://aesthetic.computer" : "*";

  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
  }; // Define CORS headers.

  if (request.method === "OPTIONS")
    return new Response("Success!", { headers });

  if (request.method === "POST") {
    const body = await request.json();
    let { prompt, program } = body;

    try {
      // A. Completions
      if (program.before.length > 0)
        prompt = `${body.program.before} - ${prompt}`;
      if (program.after.length > 0) prompt += ` - ${program.after}`;

      // const controller = new AbortController();

      const stream = await OpenAI(
        "completions",
        {
          model: "text-davinci-003",
          prompt,
          max_tokens: 1024,
          temperature: 0.2,
        },
        {
          mode: "raw",
          // controller,
        }
      );

      // TODO: How can I cancel this readable stream?
      // This is not currently working: 23.05.16.13.49
      // request.signal.addEventListener("abort", () => {
        // console.log("Cancelled stream!");
        // controller.abort(); // Send to a new abort controller.
      // });

      return new Response(stream, { headers });
    } catch (error) {
      console.error("Failed to process the request:", error);
      return new Response("Error", {
        status: 500,
        headers: { "Content-Type": "text/plain", ...headers },
      });
    }
  }
}