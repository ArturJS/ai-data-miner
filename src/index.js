const puppeteer = require('puppeteer');
const csvWriter = require('csv-write-stream');
const writer = csvWriter();
// todo use config for baseUrl

const catchPossibleError = async fn => {
    try {
        return await fn();
    } catch (err) {
        console.log({
            err
        });
    }
};

const getNextProduct = async ({ go, productId }) => {
    const page = await go(
        `https://www.citilink.ru/catalog/mobile/cell_phones/${productId}`
    );
    const savePreviews = async () => {
        const productPreviewsSelector = '.mCS_img_loaded';

        await page.waitForSelector(productPreviewsSelector, {
            timeout: 7000
        });

        const elements = await page.$$(productPreviewsSelector);
        let previewNumber = 0;

        for (let element of elements) {
            previewNumber++;
            await element.screenshot({
                path: `./images/${productId}/${previewNumber}.png`
            });
        }
    };
    const getProductInfo = async () => {
        // todo get this info
        return {
            title,
            characteristics,
            description
        };
    };

    const { title, characteristics, description } = await catchPossibleError(
        async () => {
            await savePreviews();

            return await getProductInfo();
        }
    );

    // todo save to csv as stream
};

const main = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const go = async url => {
        await page.goto(url, { waitUntil: 'networkidle1' });

        return page;
    };
    // todo extract productIds from page (and navigate to the next page if needed)
    for (let count = 1; count < 10; count++) {
        console.log(`count: ${count}`); // todo rework
        await getNextProduct({ go, productId });
    }

    await browser.close();
    console.log('Done!');
};

main().catch(err => {
    console.log('Some shit happened... See error details:');
    console.log(err);
});
