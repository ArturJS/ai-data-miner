const fs = require('fs');
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

const getTextContent = async ({ page, element }) => {
    const text = await page.evaluate(element => element.textContent, element);

    return text;
};

const $ = {
    productPreviews: '.mCS_img_loaded',
    title: 'h1',
    characteristics: '.short_description',
    description: 'span.h3 + div'
};

const getNextProduct = async ({ go, productId, csvStream }) => {
    const page = await go(
        `https://www.citilink.ru/catalog/mobile/cell_phones/${productId}`
    );

    const savePreviews = async () => {
        await page.waitForSelector($.productPreviews, {
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
        const getText = async selector =>
            await getTextContent({ page, element: page.$(selector) });

        return {
            title: getText($.title),
            characteristics: getText($.characteristics),
            description: getText($.description)
        };
    };

    const productData = await catchPossibleError(async () => {
        await savePreviews();

        const productInfo = await getProductInfo();

        return {
            productId,
            ...productInfo
        };
    });

    csvStream.write(productData);
};

const main = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const go = async url => {
        await page.goto(url, { waitUntil: 'networkidle0' });

        return page;
    };

    await go('https://www.citilink.ru/catalog/mobile/cell_phones/');

    const links = await page.evaluate(`
    [...document.querySelectorAll('.block_data__gtm-js a[data-product-id]')]
      .map((element) => ({
        productId: element.getAttribute('data-product-id'),
        url: element.getAttribute('href')
      }));
    `);

    console.dir(links);

    // todo remove next 2 lines
    await browser.close();
    return;

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
