const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { promisify } = require('util');
const mkdirp = promisify(require('mkdirp'));
const csvWriter = require('csv-write-stream');

const cpuCores = os.cpus().length;

const processWorkerMessage = ({ csvStream, message, threadId }) => {
    console.log(`Message from worker ${threadId}`);
    console.log(message);
    console.log('');

    if (typeof message === 'object') {
        const productData = message;

        console.log(`Saving productData to csv file:`);
        console.dir(productData);
        csvStream.write(productData);
    }
};

const spawnWorker = ({ workerData, csvStream }) => {
    const worker = new Worker(path.resolve(__dirname, 'worker.js'), {
        workerData
    });
    const { threadId } = worker;

    worker.on('message', message => {
        processWorkerMessage({
            csvStream,
            message,
            threadId
        });
    });
    worker.on('error', error => {
        console.log(`Error from worker ${threadId}`);
        console.log(error);
        console.log('');
    });
    worker.on('exit', code => {
        if (code !== 0) {
            console.log(`Worker ${threadId} stopped with exit code ${code}!`);
            console.log('');
        }
    });
};

const prepareFileSystem = async () => {
    await mkdirp('./dist/images');

    const csvStream = csvWriter();

    csvStream.pipe(fs.createWriteStream('./dist/products_data.csv'));

    return {
        csvStream
    };
};

const main = async () => {
    debugger;
    const { csvStream } = await prepareFileSystem();

    console.log(`cpuCores: ${cpuCores}`);

    for (let i = 1; i <= 4 || cpuCores; i++) {
        spawnWorker({
            csvStream,
            workerData: {
                baseUrl: 'https://www.citilink.ru/catalog/mobile/cell_phones/',
                firstPageNumber: i * 10,
                lastPageNumber: i * 10 + 10
            }
        });
    }

    csvStream.end();
};

main().catch(err => {
    console.log('Some shit happened... See error details:');
    console.log(err);
    process.exit(1);
});
