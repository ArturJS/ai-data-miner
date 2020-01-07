FROM buildkite/puppeteer
WORKDIR /tmp
RUN npx rimraf dist
CMD npm run start:local
