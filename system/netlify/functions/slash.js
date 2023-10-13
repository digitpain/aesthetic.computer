// Slash, 23.10.13.00.08
// A helpful Discord webhook for auto-linking AC pieces.

// TODO: Test via the Netlify logs.

import { respond } from "../../backend/http.mjs";
import {
  verifyKey,
  InteractionResponseType,
  InteractionType,
} from "discord-interactions";

export async function handler(event) {
  const timestamp = event.headers["x-signature-timestamp"];
  const signature = event.headers["x-signature-ed25519"];

  // ⚠️ Uncomment these routes for manual initialization.
  // Run with httpie: `https DELETE :8888/slash`
  // if (event.httpMethod === "DELETE") {
  //   await deleteAllCommands(process.env.DISCORD_PAL_APP_ID);
  //   return respond(200, { message: "Commands deleted successfully." });
  // }

  // Run with httpie: `https PUT :8888/slash`
  // if (event.httpMethod === "PUT") {
  //   await createACCommand(process.env.DISCORD_PAL_APP_ID);
  //   return respond(200, { message: "Command created successfully!" });
  // }

  if (!timestamp && !signature)
    return respond(500, { message: "😈 Unauthorized." });

  const isValidRequest = verifyKey(
    Buffer.from(event.body, "utf8"),
    signature,
    timestamp,
    process.env.DISCORD_PAL_PUBLIC,
  );

  if (!isValidRequest) {
    return respond(401, { message: "😫 Invalid request signature." });
  }

  const body = JSON.parse(event.body);

  if (body.type === InteractionType.PING) {
    return respond(200, { type: InteractionResponseType.PONG });
  }

  if (
    body.type === InteractionType.APPLICATION_COMMAND &&
    body.data.name === "ac"
  ) {
    const slug = body.data.options[0].value; // Assume user input is 1st option.
    const content = `[${slug}](<https://prompt.ac/~${slug
      .split(" ")
      .join("~")}>)`;

    return respond(200, {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content },
    });
  }

  return respond(400, { message: "🫠 Unhandled interaction type." });
}

// Removes all discord commands.
const deleteAllCommands = async (clientId) => {
  // Guild-specific commands URL
  const url = `https://discord.com/api/v10/applications/${clientId}/guilds/${process.env.DISCORD_SERVER_ID}/commands`;
  // Global commands URL
  // const url = `https://discord.com/api/v10/applications/${clientId}/commands`;

  const headers = {
    Authorization: `Bot ${process.env.DISCORD_PAL_BOT}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method: "GET",
    headers: headers,
  });

  const commands = await response.json();

  console.log("Commands available:", commands.errors);

  for (const command of commands) {
    await fetch(`${url}/${command.id}`, {
      method: "DELETE",
      headers: headers,
    });
  }
};

const createACCommand = async (clientId) => {
  const url = `https://discord.com/api/v10/applications/${clientId}/commands`;

  const headers = {
    Authorization: `Bot ${process.env.DISCORD_PAL_BOT}`,
    "Content-Type": "application/json",
  };

  const commandData = {
    name: "ac",
    description: "Jump to any piece.",
    options: [
      {
        name: "piece",
        type: 3,
        description: "Type as you would on aesthetic.computer to make a link.",
        required: true,
      },
    ],
  };

  await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(commandData),
  });
};
