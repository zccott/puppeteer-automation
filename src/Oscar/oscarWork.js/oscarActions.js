// oscarActions.js
const { navigateToUrl, waitForNavigation, waitAndCheck, waitAndClick } = require('../utils/utils');
const { checkExtensionData, launchExtesion} = require('../utils/helper');
const WebSocket = require('ws');

async function findAppointment(page) {
  await waitAndCheck(page, '#mygroup_no');
  await page.select('#mygroup_no', '_grp_Knight'); // change the value if the clinic is different
  console.log("Clinic selected successfully");

  await waitForNavigation(page);

  const targetUrl = 'https://oscaremr.quipohealth.com/oscar/provider/providercontrol.jsp?year=2024&month=11&day=11&view=0&displaymode=day&dboperation=searchappointmentday&viewall=1';
  await navigateToUrl(page, targetUrl);

  await handleActions(page);
}

async function handleActions(page) {

  const selectors = [
    { pname: "Joe,Ashik", number: " (613) 454-6546 | ", selector: "img[src='../images/walkin.png']", name: "Walkin", action: walkinFunction },
    { pname: "Krishna,Abhinav", number: " (613) 454-6546 | ", selector: "img[alt='Video Call Icon']", name: "Video", action: videoFunction},
    { pname: "Thomas,Priya", number: " (613) 456-0988 | ", selector: "img[src='https://oscaremr.quipohealth.com/oscar/images/audio.png']", name: "Voice", action: voiceCallFunction }
  ];
  
  for (const item of selectors) {
    const element = await page.$(item.selector);
    const visible = !!element;
    console.log(`${item.name} element is ${visible ? 'available' : 'not available'} on the page.`);
    if (visible){
      await launchExtesion(page, item.pname, item.number, item.selector);
      await item.action(page, item.pname, item.number, item.selector);
    }
  }
}


async function walkinFunction(page,name,number,selector) {
  console.log('Executed walk-in action...');
  await waitAndClick(page, selector);
  // const ws = new WebSocket(''); //web socket connection url
  // await new Promise((resolve, reject) => {
  //   ws.on('open', () => {
  //     console.log('WebSocket connected');
  //     resolve();
  //   });
  //   ws.on('error', (err) => {
  //     console.error('WebSocket error:', err);
  //     reject(err);
  //   });
  // });
  // await new Promise(resolve => setTimeout(resolve, 5000));
  // await waitAndClick(page, 'button#clinic-recording-button');
  // console.log('Clicked on clinic-recording-button');
  // const dataToSend = {
  //   name: name,
  //   number: number,
  //   action: 'recordingStarted',
  //   timestamp: new Date().toISOString()
  // };
  // ws.send(JSON.stringify(dataToSend));
  // console.log('Data sent to WebSocket:', dataToSend);
  // ws.on('message', (message) => {
  //   console.log('Received message from WebSocket server:', message);
  // });
  // ws.on('close', () => {
  //   console.log('WebSocket connection closed');
  // });
  // await new Promise(resolve => setTimeout(resolve, 500000));
  // ws.close();
}


async function voiceCallFunction(page,name,number,selector) {
  console.log('Executing voice call action...');
}

async function videoFunction(page,name,number,selector) {
  console.log('Executing video call action...');
}

module.exports = { findAppointment };

