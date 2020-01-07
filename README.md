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
  
- [ ] Go to next page of catalog if there are any products available 
   
- [ ] and if we not yet exceeded max product count (add product count as a parameter in configuration)

- [ ] Add ability for parallel download in order to speed-up the process

- [ ] Add ability to configure `url` and page selectors from `process.argv`

- [ ] Add progress bar
