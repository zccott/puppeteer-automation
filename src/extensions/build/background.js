let activeCall = null;
let device = null;

async function ensureOffscreenScript() {
  const hasOffscreen = await chrome.offscreen.hasDocument();
  console.log("Offscreen document exists:", hasOffscreen);

  if (!hasOffscreen) {
    try {
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL("offScreen.html"),
        reasons: ["IFRAME_SCRIPTING"],
        justification: "Handle Twilio calls in the background",
      });
      console.log("Offscreen document created successfully.");
    } catch (error) {
      console.error("Failed to create offscreen document:", error);
    }
  }
  return hasOffscreen;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background.js:", message);
  if (message.type === "disconnect") {
    console.log(
      "====================Disconnecting from Twilio (BACKGROUND JS)==================="
    );
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "disconnected" },
          (response) => {
            console.log("Response from content script:", response);
          }
        );
      }
    });
  }

  if (message.type === "SEND_PHONE_NUMBER") {
    console.log("Processing SEND_PHONE_NUMBER in background.js...");
    const phoneNumber = message.phoneNumber;
    const appointmentId = message.appointmentId;

    if (phoneNumber) {
      sendResponse({ success: true, message: "Phone Number reveived" });
      console.log("Phone number received:", phoneNumber);

      // Ensure offscreen script is ready
      ensureOffscreenScript()
        .then((offScreen) => {
          console.log("Offscreen status:", offScreen);

          chrome.runtime.sendMessage(
            {
              type: "connect",
              recipient: phoneNumber,
              appointmentId: appointmentId,
            },
            (response) => {
              console.log("Response from offscreen:", response);
              sendResponse({ status: "initiated", phoneNumber });
            }
          );
        })
        .catch((error) => {
          console.error("Error ensuring offscreen script:", error);
          sendResponse({ status: "error", error: error.message });
          x;
        });
    } else {
      console.error("Phone number is missing.");
      sendResponse({ status: "error", error: "Phone number is missing" });
    }
  } else if (message.type === "HANGUP_CALL") {
    console.log("Forwarding HANGUP_CALL to offscreen...");

    chrome.runtime.sendMessage({ type: "hangup" }, (response) => {
      console.log("Call hangup response:", response);
      sendResponse({ status: "call hangup requested" });
    });
  } else if (message.type === "MUTE_CALL") {
    console.log("Forwarding MUTE_CALL to offscreen...");
    chrome.runtime.sendMessage({ type: "mute" }, (response) => {
      console.log("Call mute response:", response);
      sendResponse({ status: "call mute requested" });
    });
  } else {
    console.warn("Unhandled message type:", message.type);
    sendResponse({ status: "error", error: "Unhandled message type" });
  }

  return true; // Keeps the message channel open for async response
});

// Old code

// Called when the service worker is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed. Checking permissions...");

  // Check if microphone permission is not granted
  navigator.permissions
    .query({ name: "microphone" }) // Use Permissions API to check microphone access
    .then((permissionStatus) => {
      if (permissionStatus.state !== "granted") {
        // Permission not granted, navigate to permissions page
        console.log(
          "Microphone permission not granted. Navigating to permissions page."
        );

        chrome.tabs.create({
          url: chrome.runtime.getURL("offScreen.html"), // Replace with your permissions page
        });
      } else {
        console.log("Microphone permission is already granted.");
      }
    })
    .catch((error) => {
      console.error("Error checking microphone permission:", error);
    });
});

const myURLs = ["https://oscaremr.quipohealth.com/*"];

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    myURLs.some((url) => tab?.url && tab?.url.includes(url))
  ) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["js/jquery-3.2.1.min.js", "js/sites_cs.js"],
    });
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ELEMENT_CLICKED") {
    console.log("Element clicked on the webpage:", request.details);

    sendToActiveTab({ type: "UPDATE_REACT_APP", data: request })
      .then((response) =>
        sendResponse({ status: "Message received", response })
      )
      .catch((error) => sendResponse({ status: "Error", error }));

    return true; // Keeps the message channel open for async response
  }
});

// Function to get the active tab
async function getActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      console.log("Active tab:", tabs[0]);
      return tabs[0]; // Return the active tab
    } else {
      console.log("No active tabs found.");
      return null; // Return null if no active tab
    }
  } catch (error) {
    console.error("Error retrieving active tab:", error);
    return null; // Return null on error
  }
}

// Function to send a message to the active tab
async function sendToActiveTab(message) {
  const activeTab = await getActiveTab();
  if (activeTab) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(activeTab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error sending message to active tab:",
            chrome.runtime.lastError
          );
          reject(chrome.runtime.lastError);
        } else {
          console.log("Response from content script:", response);
          resolve(response);
        }
      });
    });
  } else {
    console.error(
      "No active tab found or it does not contain the content script."
    );
    throw new Error("No active tab found");
  }
}
