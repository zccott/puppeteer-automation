// navigation.js
const { waitAndCheck } = require('../utils/utils');

async function verifyUrl(page, expectedUrl) {
  const currentUrl = page.url();
  if (currentUrl === expectedUrl) {
    console.log("Successfully navigated to the expected URL:", currentUrl);
  } else {
    throw new Error(`Failed to navigate to the expected URL. Current URL is: ${currentUrl} - expected URL is: ${expectedUrl}`);
  }
}

async function interactWithElements(page) {
  const elements = [
    { selector: '#firstMenu', name: "firstMenu" },
    { selector: "#upToDateSearch", name: "#upToDateSearch" }
  ];

  for (const element of elements) {
    await waitAndCheck(page, element.selector);
  }
}

module.exports = { verifyUrl, interactWithElements };
