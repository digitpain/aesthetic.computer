(function () {
  const vscode = acquireVsCodeApi();
  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data; // The json data that the extension sent
    console.log("📶 Received message:", message);
    switch (message.type) {
      // case "externallyAuthenticate": {
      //   vscode.postMessage({
      //     type: "openExternal",
      //     url: message.authUrl,
      //   });
      // }
      case "setCode": {
        vscode.postMessage({ type: "setCode", value: message.value });
      }
      case "runPiece": {
        vscode.postMessage({ type: "runPiece" });
        break;
      }
    }
  });
})();
