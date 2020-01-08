const path = require('path');
const { promisify } = require('util');
const mkdirp = promisify(require('mkdirp'));
const spawnd = require('spawnd');
const cpuCores = require('physical-cpu-count'); // for some reason it doesn't work under virtual machine

const spawnWorker = ({ baseUrl, firstPageNumber, lastPageNumber }) => {
    const worker = spawnd(
        `node ${path.resolve(
            __dirname,
            'worker.js'
        )} --baseUrl ${baseUrl} --firstPageNumber ${firstPageNumber} --lastPageNumber ${lastPageNumber}`,
        { shell: true, stdio: ['inherit', 'inherit', 'pipe'] }
    );
    const threadId = worker.pid;

    console.log(`Spawned worker with pid ${threadId}`);

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

const main = async () => {
    await mkdirp('./dist/images');

    console.log(`cpuCores: ${cpuCores}`);

    spawnWorker({
        baseUrl: 'https://www.citilink.ru/catalog/mobile/cell_phones/',
        firstPageNumber: 4,
        lastPageNumber: 31
    });

    // for (let i = 0; i < cpuCores; i++) {
    //     const firstPageNumber = i * 10 + 1;

    //     spawnWorker({
    //         baseUrl: 'https://www.citilink.ru/catalog/mobile/cell_phones/',
    //         firstPageNumber,
    //         lastPageNumber: firstPageNumber + 9
    //     });
    // }
};

main().catch(err => {
    console.log('Some shit happened... See error details:');
    console.log(err);
    process.exit(1);
});
