# AI data miner

## How to run
```
npm start
```

## Where is the result

Result will be available in `dist` folder.
There will available the next data: `product_data.csv` and `images` folder with product previews.

### TODO:
1. Go to next page of catalog if there are any products available 
   and if we not yet exceeded max product count (add product count as a parameter in configuration)
2. Save big resolution product preview images
3. Add support for Docker run
4. Add ability to configure `url` and page selectors from `process.argv`
5. Add progress bar