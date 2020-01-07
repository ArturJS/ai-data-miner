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
    productPreview: '.image_gallery .full_content img',
    title: 'h1',
    characteristics: '.short_description',
    description: 'span.h3 + div'
};

const saveProductData = async ({ go, productId, csvStream }) => {
    console.log(`Opening product page ${productId}`);

    const page = await go(
        `https://www.citilink.ru/catalog/mobile/cell_phones/${productId}`
    );

    const savePreview = async () => {
        await page.waitForSelector($.productPreview, {
            timeout: 7000
        });

        const element = await page.$($.productPreview);

        // vipe out some shit of the screen
        await page.evaluate(() => {
            var someShittyElement = document.querySelector(
                '.best-opinion-window__content'
            );

            someShittyElement &&
                someShittyElement.parentElement &&
                someShittyElement.parentElement.parentElement.removeChild(
                    someShittyElement.parentElement
                );
        });

        console.log(`Saving product preview by id ${productId}`);
        await element.screenshot({
            path: `dist/images/${productId}.png`
        });
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
        await savePreview();

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

const crawlPages = async ({
    firstPageNumber = 1,
    lastPageNumber,
    go,
    page,
    csvStream
}) => {
    for (
        let pageNumber = firstPageNumber;
        pageNumber <= lastPageNumber;
        pageNumber++
    ) {
        const baseUrl = `https://www.citilink.ru/catalog/mobile/cell_phones/?p=${pageNumber}`;

        console.log(`Navigating to ${baseUrl}`);
        await go(baseUrl);

        console.log(`Trying to get productIds from page ${pageNumber}...`);
        const productIds = await page.evaluate(() => {
            return [
                ...document.querySelectorAll(
                    '.block_data__gtm-js a[data-product-id]'
                )
            ].map(element => element.getAttribute('data-product-id'));
        });

        console.log('ProductIds received:');
        console.dir(productIds);

        csvStream.pipe(fs.createWriteStream('./dist/products_data.csv'));
        console.log('Tring to save each product data...');

        for (let productId of productIds) {
            console.log(`Processing product with id: ${productId}`);
            await saveProductData({ go, productId, csvStream });
        }
    }
};

const main = async () => {
    // links about using existing chrome for debugging
    // https://github.com/puppeteer/puppeteer/issues/288#issuecomment-322822607
    // https://github.com/puppeteer/puppeteer/issues/288#issuecomment-506925722
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true // todo use config
    });
    const page = await browser.newPage();
    const go = async url => {
        await page.goto(url, { waitUntil: 'networkidle0' });

        return page;
    };

    const baseUrl = 'https://www.citilink.ru/catalog/mobile/cell_phones/?p=1';

    console.log(`Navigating to ${baseUrl}`);
    await go(baseUrl);

    const csvStream = csvWriter();
    await mkdirp('./dist/images');

    const lastPageNumber = await page.evaluate(() => {
        return +document
            .querySelector('.page_listing li.last a')
            .getAttribute('data-page');
    });

    await crawlPages({
        firstPageNumber: 1,
        lastPageNumber,
        go,
        page,
        csvStream
    });

    csvStream.end();

    await browser.close();
    console.log('Done!');
};

main().catch(err => {
    console.log('Some shit happened... See error details:');
    console.log(err);
});
