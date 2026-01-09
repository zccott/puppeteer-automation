const CONFIG = {
  SELECTORS: {
    TABLE_ROWS: "table tr",
    APPT_LINK: ".apptLink",
    CONSULTATION_BUTTONS: '[onclick^="initiateConsultation"]',
    WALKIN_IMAGES: 'a img[src$="../images/walkin.png"]',
    REACT_APP: "#react-chrome-extension",
    PHONE_NUMBER: "a.walkinButton + text() + a.attachmentBtn",
    PHONE_CALL_BTN: "#phone-call-button",
    HANGUP_BTN: "#hangup-button",
    MUTE_BTN: "#mute-button",
  },
  CLASSES: {
    VIDEO_CALL: "videoCallAnchor",
    WALKIN: "walkinButton",
    INIT_BUTTON: "initButton",
  },
  DELAY: 1e3,
};

let globalDemographicId = "";
let globalAppointmentNumber = "";
let sessionID = "";
let globalCallStatus = false;
let globalSessionStatus = false;
let globalPhoneNumber = "";

const checkProgressStatus = () => {
  globalSessionStatus = sessionStorage.getItem("sessionStatus");

  if (globalSessionStatus === "true") {
    return true;
  }

  return false;
};

const response = checkProgressStatus();

const createElementWithAttributes = (e, t = {}) => {
    const n = document.createElement(e);
    return (
      Object.entries(t).forEach(([e, t]) => {
        if ("dataset" === e)
          Object.entries(t).forEach(([e, t]) => {
            n.dataset[e] = t;
          });
        else if ("style" === e)
          Object.entries(t).forEach(([e, t]) => {
            n.style[e] = t;
          });
        else if ("listeners" === e)
          Object.entries(t).forEach(([e, t]) => {
            n.addEventListener(e, t);
          });
        else n[e] = t;
      }),
      n
    );
  },
  extractors = {
    extractPhoneNumber: (container) => {
      try {
        if (!container) {
          throw new Error("Container not found.");
        }

        const nearButton =
          container.querySelector(".walkinButton") ||
          container.querySelector(".videoCallAnchor");

        if (!nearButton) {
          throw new Error("Button not found.");
        }

        let phoneNumber = nearButton.nextSibling;

        while (
          phoneNumber &&
          phoneNumber.nodeType !== 1 &&
          phoneNumber.nodeType !== 3
        ) {
          phoneNumber = phoneNumber.nextSibling;
        }

        if (!phoneNumber) {
          throw new Error("Phone number not found next to the button.");
        }

        if (phoneNumber.nodeType === 3) {
          phoneNumber = phoneNumber.textContent.trim();
        }

        if (phoneNumber.nodeType === 1) {
          phoneNumber = phoneNumber.textContent.trim();
        }

        if (!phoneNumber) {
          throw new Error("No valid phone number found.");
        }
        globalPhoneNumber = phoneNumber;
        return phoneNumber;
      } catch (error) {
        console.error("Error extracting phone number:", error.message);
        return null;
      }
    },

    demographicId: (e) => {
      const t = e?.match(/demographic_no\s*=\s*['"]?(\d+)['"]?/);
      return t ? ((globalDemographicId = t[1]), globalDemographicId) : null;
    },
    nameFromTitle: (e) => {
      const t = e.split("\n")[0].trim();
    },
    typeFromTitle: (e) => {
      const t = e.split("\n").find((e) => e.trim().startsWith("type:")),
        n = t ? t.split(":")[1].trim() : "No Type";
      return n;
    },
    appointmentNumber: (e) => {
      const a = e?.match(/appointment_no\s*=\s*['"]?(\d+)['"]?/);
      return a
        ? ((globalAppointmentNumber = a[1]), globalAppointmentNumber)
        : null;
    },
  },
  messageHandlers = {
    sendMessagetoApp(e, targetOrigin = "*") {
      setTimeout(() => {
        try {
          if (!e || typeof e !== "object") {
            throw new Error("Invalid message payload.");
          }
          window.postMessage(
            { type: "UPDATE_DEMOGRAPHIC_INFO", ...e },
            targetOrigin
          );
        } catch (error) {
          console.error("Failed to send message to app:", error.message);
        }
      }, CONFIG.DELAY);
    },

    sendClickEvent(e) {
      chrome.runtime.sendMessage({ type: "ELEMENT_CLICKED", payload: e });
    },
  },
  clickHandlers = {
    tableRow(e) {
      if (!checkProgressStatus()) {
        if (
          e.matches(
            `${CONFIG.SELECTORS.CONSULTATION_BUTTONS}, ${CONFIG.SELECTORS.WALKIN_IMAGES}`
          )
        ) {
          const t = e.closest("div")?.querySelector(CONFIG.SELECTORS.APPT_LINK);
          if (t) {
            const phoneNumber = extractors.extractPhoneNumber(e.closest("div"));

            const n = t.getAttribute("onclick"),
              r = t.getAttribute("title") || "No Title",
              o = n ? extractors.demographicId(n) : "No Demographic ID",
              i = extractors.nameFromTitle(r),
              s = extractors.typeFromTitle(r),
              p = n ? extractors.appointmentNumber(n) : "No Appointment ID";

            messageHandlers.sendMessagetoApp({
              demographicId: o,
              linkType: s,
              name: i,
              phoneNumber: phoneNumber,
              appointmentNumber: p,
            });

            {
              sessionID &&
                messageHandlers.sendClickEvent({
                  tagName: e.tagName,
                  id: e.id || "No ID",
                });
            }
          }
        }
      } else {
        console.error("Cannot proceed: Session is in progress");
      }
    },

    handleClick(e) {
      if (!checkProgressStatus()) {
        const t = e.currentTarget;
        t.classList.contains(CONFIG.CLASSES.VIDEO_CALL)
          ? clickHandlers.videoCall(e)
          : t.classList.contains(CONFIG.CLASSES.WALKIN)
          ? clickHandlers.walkin(e)
          : t.classList.contains(CONFIG.CLASSES.INIT_BUTTON)
          ? clickHandlers.initButton(e)
          : e.target.closest(CONFIG.SELECTORS.CONSULTATION_BUTTONS) &&
            clickHandlers.consultationButtonClick(e);
      } else {
        console.error("Cannot proceed: Session is in progress");
      }
    },

    videoCall(e) {
      if (!checkProgressStatus()) {
        e.preventDefault();
        sessionID = sessionStorage.getItem("JSessionID");
        const t = e.currentTarget
          .closest("div")
          ?.querySelector(CONFIG.SELECTORS.APPT_LINK);

        const phoneNumber = extractors.extractPhoneNumber(
          e.currentTarget.closest("div")
        );

        if (t) {
          const e = t.getAttribute("onclick"),
            n = t.getAttribute("title") || "No Title",
            r = extractors.demographicId(e),
            o = extractors.nameFromTitle(n),
            i = extractors.typeFromTitle(n),
            p = extractors.appointmentNumber(e);

          messageHandlers.sendMessagetoApp({
            demographicId: r,
            name: o,
            linkType: i,
            phoneNumber: phoneNumber,
            appointmentNumber: p,
          });

          if (sessionID && !globalCallStatus) {
            if (i === "Phone call") {
              globalCallStatus = true;
              makePhoneCall();
            }
          } else {
            console.error("No session id found or call already in progress");
          }

          createReactChromeExtension({
            demographicId: r,
            name: o,
            linkType: i,
            appointmentNumber: p,
          });
        } else {
          createReactChromeExtension({ demographicId: globalDemographicId });
        }
      } else {
        console.error("Cannot proceed: Session is in progress");
      }
    },

    walkin(e) {
      if (!checkProgressStatus()) {
        e.preventDefault();

        const t = e.currentTarget
          .closest("div")
          ?.querySelector(CONFIG.SELECTORS.APPT_LINK);

        if (t) {
          const e = t.getAttribute("onclick"),
            n = t.getAttribute("title") || "No Title",
            r = extractors.demographicId(e),
            o = extractors.nameFromTitle(n),
            i = extractors.typeFromTitle(n),
            p = extractors.appointmentNumber(e);

          messageHandlers.sendMessagetoApp({
            demographicId: r,
            name: o,
            linkType: i,
            appointmentNumber: p,
          });

          createReactChromeExtension({
            demographicId: r,
            name: o,
            linkType: i,
            appointmentNumber: p,
          });
        } else {
          createReactChromeExtension({});
        }
      } else {
        console.error("Cannot proceed: Session is in progress");
      }
    },

    consultationButtonClick(e) {
      if (!checkProgressStatus()) {
        e.preventDefault();
        const t = e.target.closest(CONFIG.SELECTORS.CONSULTATION_BUTTONS),
          n = t.getAttribute("onclick"),
          r = t.getAttribute("title") || "No Title",
          o = extractors.demographicId(n),
          i = extractors.nameFromTitle(r),
          s = extractors.typeFromTitle(r),
          p = extractors.appointmentNumber(n);

        messageHandlers.sendMessagetoApp({
          demographicId: o,
          name: i,
          linkType: s,
          appointmentNumber: p,
        });

        createReactChromeExtension({
          demographicId: o,
          name: i,
          linkType: s,
          appointmentNumber: p,
        });
      } else {
        console.error("Cannot proceed: Session is in progress");
      }
    },

    initButton(e) {
      if (!checkProgressStatus()) {
        e.preventDefault();
        createReactChromeExtension({ demographicId: globalDemographicId });
      } else {
        console.error("Cannot proceed: Session is in progress");
      }
    },
  };

const replaceConsultationButtons = () => {
    document
      .querySelectorAll(CONFIG.SELECTORS.CONSULTATION_BUTTONS)
      .forEach((e) => {
        const t = e.querySelector("img")?.src;
        if (t) {
          const n = createElementWithAttributes("a", {
            href: "#",
            className: CONFIG.CLASSES.VIDEO_CALL,
            innerHTML: `<img src="${t}" alt="Video Call Icon" class="videoCallImage" style="width:14px;height:14px;margin-bottom:-2px;">`,
            listeners: { click: clickHandlers.handleClick },
          });
          e.parentNode.replaceChild(n, e);
        }
      }),
      document.querySelectorAll(CONFIG.SELECTORS.WALKIN_IMAGES).forEach((e) => {
        const t = e.closest("a");
        t &&
          (t.classList.add(CONFIG.CLASSES.WALKIN),
          t.addEventListener("click", clickHandlers.handleClick));
      }),
      document
        .querySelectorAll(CONFIG.SELECTORS.CONSULTATION_BUTTONS)
        .forEach((e) => {
          e.addEventListener("click", clickHandlers.handleClick);
        });
  },
  createReactChromeExtension = (e = {}) => {
    const t = document.querySelector(CONFIG.SELECTORS.REACT_APP);
    if (t)
      return void console.warn("React app already exists, skipping creation.");
    const n = createElementWithAttributes("div", {
      id: "react-chrome-extension",
      className: "custom-scrollbar",
      dataset: { ...e },
    });
    document.body.appendChild(n), loadReactAppScript();
  },
  loadReactAppScript = () => {
    const e = createElementWithAttributes("script", {
      id: "react-app-script",
      src: chrome.runtime.getURL("static/js/main.js"),
      listeners: {
        load: () => {
          console.info("React App Script Loaded");
        },
        error: (e) => {
          console.error("Failed to Load React App Script", e);
        },
      },
    });
    document.body.appendChild(e);
  };

const initContentScript = async () => {
  const getSessionData = (key) => {
    sessionID = sessionStorage.getItem(key);
  };
  getSessionData("JSessionID");
  const e = createElementWithAttributes("link", {
    rel: "stylesheet",
    href: chrome.runtime.getURL("static/css/main.css"),
  });
  document.head.appendChild(e),
    replaceConsultationButtons(),
    document.querySelectorAll(CONFIG.SELECTORS.TABLE_ROWS).forEach((e) => {
      e.addEventListener("click", (e) => clickHandlers.tableRow(e.target));
    });
  const t = new MutationObserver(replaceConsultationButtons);
  t.observe(document.body, { childList: !0, subtree: !0 }),
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "UPDATE_REACT_APP") {
        console.log("React App Update Triggered");

        sendResponse({ status: "Success" });
      } else if (message.action === "disconnected") {
        console.log("Disconnected from Twilio");
        globalCallStatus = false;
        messageHandlers.sendMessagetoApp({
          type: "DISCONNECTED_CALL",
          message: "disconnected",
        });
        sendResponse({ status: "Disconnected handled" });
      }
    });

  handleCallControls();
};
initContentScript();

const makePhoneCall = () => {
  const reactApp = document.querySelector(CONFIG.SELECTORS.REACT_APP);
  if (reactApp) {
    setTimeout(() => {
      handleCallControls();
      console.log("Phone call button found and event listener added.");
    }, 4000);
  }
};
const hangupHandler = (e) => {
  e.preventDefault();
  globalCallStatus = false;
  chrome.runtime.sendMessage({ type: "HANGUP_CALL" });
};

const muteHandler = (e) => {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: "MUTE_CALL" });
};

const initCall = () => {
  chrome.runtime.sendMessage({
    type: "SEND_PHONE_NUMBER",
    phoneNumber: globalPhoneNumber,
    appointmentId: globalAppointmentNumber,
  });
};

function handleCallControls() {
  const hangupBtn = document.querySelector(CONFIG.SELECTORS.HANGUP_BTN);
  const muteBtn = document.querySelector(CONFIG.SELECTORS.MUTE_BTN);
  const startCall = document.querySelector(CONFIG.SELECTORS.PHONE_CALL_BTN);

  if (hangupBtn) {
    hangupBtn.removeEventListener("click", hangupHandler);
    hangupBtn.addEventListener("click", hangupHandler);
  }

  if (muteBtn) {
    muteBtn.removeEventListener("click", muteHandler);
    muteBtn.addEventListener("click", muteHandler);
  }

  if (startCall) {
    startCall.removeEventListener("click", initCall);
    startCall.addEventListener("click", initCall);
  }
}

const callControlsObserver = new MutationObserver((mutations) => {
  for (let mutation of mutations) {
    if (mutation.type === "childList") {
      handleCallControls();
    }
  }
});

callControlsObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

window.addEventListener("beforeunload", () => {
  if (globalCallStatus) {
    chrome.runtime.sendMessage({ type: "HANGUP_CALL" });
    globalCallStatus = false;
  }
  sessionStorage.setItem("sessionStatus", false);
});
