// login.js
const puppeteer = require('puppeteer');
const { waitAndType, waitAndClick, waitForNavigation, navigateToUrl } = require('../utils/utils');  // Import navigateToUrl

async function launchBrowser(extensionPath, head) {
    return await puppeteer.launch({
        headless: false,
        timeout: 1200000,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--disable-popup-blocking',
            '--disable-notifications',
            '--disable-infobars',
            '--use-fake-ui-for-media-stream', // Automatically allow media permissions
            '--use-fake-device-for-media-stream',
            '--use-file-for-fake-audio-capture=./src/extensions/test.wav'

        ],
    });
}

async function login(page, { username, password, pin }) {
    const loginUrl = 'https://oscaremr.quipohealth.com/oscar/index.jsp';
    const screenWidth = 1050;
    const screenHeight = 670;
    await page.setViewport({ width: screenWidth, height: screenHeight });

    await navigateToUrl(page, loginUrl);  // Now navigateToUrl is defined

    await waitAndType(page, '#username', username);
    await waitAndType(page, '#password2', password);
    await waitAndType(page, '#pin2', pin);
    await waitAndClick(page, "button[name='submit']");
    await waitForNavigation(page);
}

module.exports = { launchBrowser, login };
