const path = require('path');
const fs = require('fs');
const commandLineArgs = require('command-line-args');
const puppeteer = require('puppeteer');
const csvWriter = require('csv-write-stream');

const workerData = commandLineArgs([
    {
        name: 'baseUrl',
        type: String
    },
    {
        name: 'firstPageNumber',
        type: Number
    },
    {
        name: 'lastPageNumber',
        type: Number
    }
]);

const log = message => {
    console.log(message);
};

const getTextContent = async ({ page, element }) => {
    const text = await page.evaluate(element => element.textContent, element);
    log('Text content: ' + text);
    return text;
};

const $ = {
    productPreview: '.image_gallery .full_content img',
    title: 'h1',
    characteristics: '.short_description',
    description: 'span.h3 + div'
};

const saveProductData = async ({ go, productId, baseUrl, csvStream }) => {
    log(`Opening product page ${productId}`);

    const page = await go(`${baseUrl}/${productId}`);

    const savePreview = async () => {
        await page.waitForSelector($.productPreview, {
            timeout: 50000
        });

        const element = await page.$($.productPreview);

        // wipe out the shit of the screen
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

        log(`Saving product preview by id ${productId}`);
        await element.screenshot({
            // todo figure out: may be it should be in the main thread?
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

    try {
        await savePreview();

        const productInfo = await getProductInfo();

        const productData = {
            productId,
            ...productInfo
        };

        csvStream.write(productData);
    } catch (err) {
        log({ err });
    }
};

const crawlPages = async ({
    firstPageNumber = 1,
    lastPageNumber,
    go,
    page,
    baseUrl,
    csvStream
}) => {
    for (
        let pageNumber = firstPageNumber;
        pageNumber <= lastPageNumber;
        pageNumber++
    ) {
        const pageUrl = `${baseUrl}?p=${pageNumber}`;

        log(`Navigating to ${pageUrl}`);
        await go(pageUrl, { waitUntil: 'domcontentloaded' });

        log(`Trying to get productIds from page ${pageNumber}...`);
        const productIds = await page.evaluate(() => {
            return [
                ...document.querySelectorAll(
                    '.block_data__gtm-js a[data-product-id]'
                )
            ].map(element => element.getAttribute('data-product-id'));
        });

        log('ProductIds received:');
        log(JSON.stringify(productIds, null, 2));
        log('Tring to save each product data...');

        for (let productId of productIds) {
            log(`Processing product with id: ${productId}`);
            await saveProductData({ go, productId, baseUrl, csvStream });
        }
    }
};

const main = async workerData => {
    console.log({ workerData });

    const {
        baseUrl,
        firstPageNumber,
        lastPageNumber,
        headless = true
    } = workerData;
    // links about using existing chrome for debugging
    // https://github.com/puppeteer/puppeteer/issues/288#issuecomment-322822607
    // https://github.com/puppeteer/puppeteer/issues/288#issuecomment-506925722
    const browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1040',
            '--proxy-server=socks5://3.137.51.198:9150'
        ],
        headless
    });
    const page = await browser.newPage();
    const go = async (url, { waitUntil = 'networkidle2' } = {}) => {
        console.log({ waitUntil });
        await page.goto(url, {
            waitUntil,
            timeout: 120000 /* 2 minutes just to overcome some weird shit */
        });

        return page;
    };

    log(`Navigating to ${baseUrl}`);
    await go(baseUrl, { waitUntil: 'domcontentloaded' });

    const lastPageNumberInCatalog = await page.evaluate(() => {
        return +document
            .querySelector('.page_listing li.last a')
            .getAttribute('data-page');
    });

    const csvStream = csvWriter();

    csvStream.pipe(
        fs.createWriteStream(
            path.resolve(__dirname, '../dist/products_data.csv'),
            {
                // append only in order to avoid locks on the file
                flags: 'a'
            }
        )
    );

    await crawlPages({
        firstPageNumber,
        lastPageNumber: Math.min(lastPageNumber, lastPageNumberInCatalog),
        go,
        page,
        baseUrl,
        csvStream
    });

    await browser.close();

    csvStream.end();
    log('Done!');
};

main(workerData).catch(err => {
    log('Some shit happened... See error details:');
    log(err);
});
