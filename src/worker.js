const { workerData, parentPort } = require('worker_threads');
const puppeteer = require('puppeteer');

const log = message => {
    parentPort.postMessage(message);
};

const catchPossibleError = async fn => {
    try {
        return await fn();
    } catch (err) {
        log({
            err
        });
    }
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

const saveProductData = async ({ go, productId, baseUrl }) => {
    log(`Opening product page ${productId}`);

    const page = await go(`${baseUrl}/${productId}`);

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

        log(`Saving product preview by id ${productId}`);
        await element.screenshot({
            // todo figure out: may be in main thread?
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

    parentPort.postMessage(productData);
};

const crawlPages = async ({
    firstPageNumber = 1,
    lastPageNumber,
    go,
    page,
    baseUrl
}) => {
    for (
        let pageNumber = firstPageNumber;
        pageNumber <= lastPageNumber;
        pageNumber++
    ) {
        baseUrl = `${baseUrl}?p=${pageNumber}`;

        log(`Navigating to ${baseUrl}`);
        await go(baseUrl);

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
            await saveProductData({ go, productId, baseUrl });
        }
    }
};

const main = async ({
    baseUrl,
    firstPageNumber,
    lastPageNumber,
    headless = true
}) => {
    // links about using existing chrome for debugging
    // https://github.com/puppeteer/puppeteer/issues/288#issuecomment-322822607
    // https://github.com/puppeteer/puppeteer/issues/288#issuecomment-506925722
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless
    });
    const page = await browser.newPage();
    const go = async url => {
        await page.goto(url, { waitUntil: 'networkidle0' });

        return page;
    };

    log(`Navigating to ${baseUrl}`);
    await go(baseUrl);

    const lastPageNumberInCatalog = await page.evaluate(() => {
        return +document
            .querySelector('.page_listing li.last a')
            .getAttribute('data-page');
    });

    await crawlPages({
        firstPageNumber,
        lastPageNumber: Math.min(lastPageNumber, lastPageNumberInCatalog),
        go,
        page,
        baseUrl
    });

    await browser.close();
    log('Done!');
};

main(workerData).catch(err => {
    log('Some shit happened... See error details:');
    log(err);
});
