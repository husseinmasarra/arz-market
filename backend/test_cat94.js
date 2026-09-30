const db = require('./src/config/db');
const { getProducts } = require('./src/controllers/productController');

async function test() {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const req = { query: { category_id: '94' } };
  const res = {
    setHeader: () => {},
    json: (data) => {
      console.log('SUCCESS! Products returned for Category 94:', data.length);
      if (data.length > 0) {
        console.log('Sample item:', data[0]?.name_ar, '| Price:', data[0]?.price_usd, '| Old Price:', data[0]?.old_price_usd);
      }
      process.exit(0);
    },
    status: (code) => ({
      json: (err) => {
        console.error('Error:', code, err);
        process.exit(1);
      }
    })
  };
  await getProducts(req, res);
}

test();
