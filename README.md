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
   
- [ ] Add ability for parallel download in order to speed-up the process

- [ ] Add parameter `maxProductsCount` in order to not download extra data

- [ ] Add `config.js` with `dotenv-safe`

- [ ] Add ability to configure `url` and page selectors from `process.argv`

- [ ] Add progress bar
