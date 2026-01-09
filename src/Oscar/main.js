// main.js
require('dotenv').config();
const { launchBrowser, login } = require('./oscarWork.js/login');
const { verifyUrl, interactWithElements } = require('./oscarWork.js/navigation');
const { findAppointment } = require('./oscarWork.js/oscarActions');
const { waitAndClick } = require('./utils/utils');

(async () => {
  const extensionPath = process.env.EXTENSION_PATH || './src/extensions/build';
  // const head= process.env.HEADLESS || 'false';
  const head= false;
  const credentials = {
    username: process.env.USERNAME1,
    password: process.env.PASSWORD,
    pin: process.env.PIN,
  };

  const browser = await launchBrowser(extensionPath,head);

  console.log('launched ' + head);

  // browser.on('targetcreated', async target => {
  //   try {
  //     const newPage = await target.page();
  //     if (newPage) {
  //       const url = newPage.url();
  //       console.log(`New page detected: ${url}`);
  
  //       // Check if the new page is the extension permissions tab
  //       if (url.includes('chrome-extension://') && url.includes('offScreen.html')) {
  //         console.log('Extension permissions page detected.');

  //         waitAndClick(newPage,"#requestPermissions");
  
  //         // Handle the browser dialog
  //         newPage.on('dialog', async dialog => {
  //           console.log(`Dialog detected: ${dialog.message()}`);
  //           if (dialog.message().includes("allow this time")) {
  //             await dialog.accept(); // Accepts the "allow this time" option
  //             console.log('Selected "Allow this time".');
  //           } else {
  //             await dialog.dismiss(); // Dismiss any other dialogs
  //             console.log('Dialog dismissed.');
  //           }
  //         });
  
  //         // Wait for the dialog to be handled
  //         await newPage.waitForTimeout(2000); // Adjust if needed
  
  //         // Close the permissions tab
  //         await newPage.close();
  //         console.log('Permissions tab closed.');
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error handling the new tab:', error);
  //   }
  // });
  
  
  // Attach a global dialog handler for any new pages that open
  browser.on('targetcreated', async target => {
    const newPage = await target.page();
    if (newPage) {
      newPage.on('dialog', async dialog => {
        console.log(`Dialog detected: ${dialog.message()}`);
        if (dialog.message().includes("Do you wish to continue?")) {
          await dialog.accept();
          console.log("Dialog accepted.");
        } else {
          await dialog.dismiss();
          console.log("Dialog dismissed.");
        }
      });
    }
  });

  const page = await browser.newPage();

  try {
    await login(page, credentials);

    const targetDate = new Date(process.env.TARGET_DATE);
    const expectedUrl = `https://oscaremr.quipohealth.com/oscar/provider/providercontrol.jsp?year=${targetDate.getFullYear()}&month=${targetDate.getMonth() + 1}&day=${targetDate.getDate()}&view=0&displaymode=day&dboperation=searchappointmentday&viewall=1`;

    await verifyUrl(page, expectedUrl);
    await interactWithElements(page);

    console.log("Extension is available");

    await findAppointment(page);
    console.log("All tests passed successfully!");
  } catch (error) {
    console.error("An error occurred during test execution:", error);
    process.exit(1);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
