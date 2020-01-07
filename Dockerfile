FROM buildkite/puppeteer
WORKDIR /tmp
RUN npx rimraf dist
CMD node ./src/main.js
