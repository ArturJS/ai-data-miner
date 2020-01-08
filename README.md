# AI data miner

## How to run
```
npm start
```

## Where is the result

Result will be available in `dist` folder.
There will available the next data: `product_data.csv` and `images` folder with product previews.

### TODO:
- [x] Save big resolution product preview image

- [x] Add support for Docker run
  
- [x] Go to next page of catalog if there are any products available
 
- [x] Introduce tor proxy in order to fix problem with IP detecting
(since there folks have mechanism that prevents our access to their site after 3rd page is viewed via puppeteer)
   
- [ ] Add ability for parallel download in order to speed-up the process

- [ ] Add parameter `maxProductsCount` in order to not download extra data

- [ ] Add `config.js` with `dotenv-safe`

- [ ] Add ability to configure `url` and page selectors from `process.argv`

- [ ] Add progress bar

## Useful notes:

1. Run tor socks5 proxy <br>
    `docker run -d --restart=always --name tor-socks-proxy-run -p 127.0.0.1:9150:9150 peterdavehello/tor-socks-proxy:latest`

   View ip address <br>
   `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' tor-socks-proxy-run`

   Check proxy status (don't forget to change ip address from this example) <br>
   `curl --socks5-hostname 3.137.51.198:9150 https://ipinfo.tw/ip`

2. If you want to change ip address automatically, you can do the following:
    1) Try https://github.com/mattes/rotating-proxy in order to rotate between a number of existing tor proxies
    2) Otherwise turning on and off running one, since there is big a chance that it will change ip address. And maybe you can set up `retryAttemptCount` in order to avoid the situation when say 3 times of turning on and off was not enough to change ip address. But this case seems to be very rare.
