// Auth
// Logs a user into a session via passwordless email confirmation. 

/* #region todo 📓 
#endregion */

import {
  requestPasswordRecovery,
  confirmPasswordRecovery,
} from "@netlify/identity-client";

async function fun (event) {

  // *** Passwordless Authentication ***
  // Send an email to the user.
  if (event.httpMethod === "POST" && event.path === "/auth") {
    try {
      const body = JSON.parse(event.body);
      const email = body.email;

      await requestPasswordRecovery({ email });
      return {
        statusCode: 200,
        body: "Passwordless login link sent!",
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: "Error sending passwordless login link: " + err.message,
      };
    }
  }

  // *** Logging In *** 
  // Via query string parameter from emailed link above.
  if (event.httpMethod === "GET" && event.path === "/auth") {
    try {
      const recoveryToken = event.queryStringParameters.recovery_token;
      await confirmPasswordRecovery({ recoveryToken });
      return {
        statusCode: 200,
        body: "Logged in!",
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: "Error logging in: " + err.message,
      };
    }
  }
}

export const handler = fun;