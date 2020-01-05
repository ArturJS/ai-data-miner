const fs = require('fs');
const { promisify } = require('util');
const mkdirp = promisify(require('mkdirp'));
const puppeteer = require('puppeteer');
const csvWriter = require('csv-write-stream');

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
    console.log('Text content: ' + text);
    return text;
};

const $ = {
    productPreviews: '.mCS_img_loaded',
    title: 'h1',
    characteristics: '.short_description',
    description: 'span.h3 + div'
};

const saveProductData = async ({ go, productId, csvStream }) => {
    console.log(`Opening product page ${productId}`);

    const page = await go(
        `https://www.citilink.ru/catalog/mobile/cell_phones/${productId}`
    );

    const savePreviews = async () => {
        await page.waitForSelector($.productPreviews, {
            timeout: 7000
        });

        const elements = await page.$$($.productPreviews);
        let previewNumber = 0;

        for (let element of elements) {
            previewNumber++;
            console.log(
                `Saving product preview ${JSON.stringify({
                    productId,
                    previewNumber
                })}`
            );
            const productFolderPath = `./dist/images/${productId}/`;
            await mkdirp(productFolderPath);
            await element.screenshot({
                // todo save big resolution picture
                path: `${productFolderPath}/${previewNumber}.png`
            });
        }
    };

    const getProductInfo = async () => {
        const getText = async selector =>
            await getTextContent({ page, element: await page.$(selector) });

        return {
            title: await getText($.title),
            characteristics: await getText($.characteristics),
            description: await getText($.description)
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

    console.log(`Saving productData to csv file:`);
    console.dir(productData);
    csvStream.write(productData);
};

const main = async () => {
    mkdirp.sync('images');

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const go = async url => {
        await page.goto(url, { waitUntil: 'networkidle0' });

        return page;
    };

    const baseUrl = 'https://www.citilink.ru/catalog/mobile/cell_phones/';

    console.log(`Navigating to ${baseUrl}`);
    await go(baseUrl);

    console.log(`Trying to get productIds...`);
    const productIds = await page.evaluate(`
    [...document.querySelectorAll('.block_data__gtm-js a[data-product-id]')]
      .map((element) => element.getAttribute('data-product-id'));
    `);

    console.log('ProductIds received:');
    console.dir(productIds);

    const csvStream = csvWriter();
    await mkdirp('./dist');
    csvStream.pipe(fs.createWriteStream('./dist/products_data.csv'));
    console.log('Tring to save each product data...');

    for (let productId of productIds) {
        console.log(`Processing product with id: ${productId}`);
        await saveProductData({ go, productId, csvStream });
    }

    csvStream.end();

    await browser.close();
    console.log('Done!');
};

main().catch(err => {
    console.log('Some shit happened... See error details:');
    console.log(err);
});
