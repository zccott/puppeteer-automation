
const { waitAndCheckInnerHtml, waitAndClick, waitAndType} = require('./utils')


async function checkExtensionData(page, name, number){
    console.log(`Checking ${name} ${number}`);
    await waitAndCheckInnerHtml(page, '.qpeTimerContainer > span:first-child',name);
    console.log("Closing Extension ");
    await waitAndClick(page, "svg[width='48']");
    await new Promise(resolve => setTimeout(resolve, 5000));
}

async function launchExtesion(page, name, number, selector){
    await waitAndClick(page, selector);
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Extension launched')
    const usernameField = await page.$('input#username');
    const passwordField = await page.$('input#password');
    if (usernameField && passwordField) {
        console.log('Login fields detected. Filling credentials.');
        await waitAndType(page, '#username', 'aaronrahul2k03@gmail.com');
        await waitAndType(page, '#password', 'Rahul@123');
        await waitAndClick(page, 'button#loginBtn');
        console.log('Login successful. Checking extension data...');
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
    await checkExtensionData(page, name, number);
}




module.exports = { checkExtensionData, launchExtesion }