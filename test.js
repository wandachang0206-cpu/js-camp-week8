// ========================================
// 第八週期末專案 Jest 測試
// 執行方式：npm test
// ========================================

jest.mock('./api');

// ========================================
// 載入模組
// ========================================
require('dotenv').config({ path: '.env' });

const { API_PATH, ADMIN_TOKEN } = require('./config');
const api = require('./api'); 
const utils = require('./utils');
const productService = require('./services/productService');
const cartService = require('./services/cartService');
const orderService = require('./services/orderService');

jest.setTimeout(30000);

// ========================================
// 確認必要的 config 已正確載入（測試一）
// ========================================
beforeAll(() => {
  if (!API_PATH) {
    throw new Error('❌ 缺少 API_PATH，請確認 .env 已設定');
  }
  if (!ADMIN_TOKEN) {
    throw new Error('❌ 缺少 API_KEY，請確認 .env 已設定');
  }
});

// 每次測試前清除呼叫記錄（注意：不清除 implementation，測試一的真實實作會保留）
beforeEach(() => {
  jest.clearAllMocks();
});

// ========================================
// 測試資料
// ========================================
const mockProduct = { price: 1000, origin_price: 1250 };
const mockProducts = [
  { category: '衣服' },
  { category: '褲子' },
  { category: '衣服' }
];
const validUser = {
  name: '測試',
  tel: '0912345678',
  email: 'test@test.com',
  address: '測試地址',
  payment: 'ATM'
};
const invalidUser = {
  name: '',
  tel: '1234',
  email: 'invalid',
  address: '',
  payment: 'Bitcoin'
};
const mockOrder = {
  id: 'order-1',
  total: 1000,
  paid: false,
  createdAt: 1609459200
};

// ========================================
// Mock：模擬真實 API 會回傳的格式（測試三～五使用）
// ========================================
const mockApiProducts = [
  { id: 'product-1', title: '商品A', category: '衣服', price: 800, origin_price: 1000 },
  { id: 'product-2', title: '商品B', category: '褲子', price: 600, origin_price: 800 },
  { id: 'product-3', title: '商品C', category: '衣服', price: 500, origin_price: 700 }
];

const mockCartData = {
  carts: [
    { id: 'cart-1', product: mockApiProducts[0], qty: 2, total: 1600, final_total: 1600 }
  ],
  total: 1600,
  finalTotal: 1600
};

const mockOrdersData = [
  {
    id: 'order-1',
    user: { name: '測試', tel: '0912345678', email: 'test@test.com', address: '測試地址', payment: 'ATM' },
    products: {},
    total: 1000,
    paid: false,
    createdAt: 1609459200
  },
  {
    id: 'order-2',
    user: { name: '測試2', tel: '0987654321', email: 'test2@test.com', address: '測試地址2', payment: 'Credit Card' },
    products: {},
    total: 2000,
    paid: true,
    createdAt: 1609545600
  }
];

// ========================================
// 測試一：API 模組
// ========================================
describe('測試一：API 模組', () => {

  // 在測試一開始前，讓所有 mock 函式借用真實實作
  // jest.requireActual('./api') 繞過 jest.mock，取得原始的 api.js
  beforeAll(() => {
    const actualApi = jest.requireActual('./api');
    Object.keys(actualApi).forEach(key => {
      if (typeof api[key] === 'function') {
        api[key].mockImplementation((...args) => actualApi[key](...args));
      }
    });
  });

  describe('fetchProducts', () => {
    test('應回傳非空陣列', async () => {
      const result = await api.fetchProducts();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('fetchCart', () => {
    test('應回傳含 carts、total、finalTotal 的物件', async () => {
      const result = await api.fetchCart();
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      expect(Array.isArray(result.carts)).toBe(true);
      expect(typeof result.total).toBe('number');
      expect(typeof result.finalTotal).toBe('number');
    });
  });

  describe('addToCart', () => {
    test('應回傳含 carts 陣列的物件', async () => {
      const products = await api.fetchProducts();
      const result = await api.addToCart(products[0].id, 1);
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('carts');
      expect(Array.isArray(result.carts)).toBe(true);
    });
  });

  describe('updateCartItem', () => {
    test('應回傳物件', async () => {
      const products = await api.fetchProducts();
      await api.addToCart(products[0].id, 1);
      const cart = await api.fetchCart();
      if (cart.carts.length > 0) {
        const result = await api.updateCartItem(cart.carts[0].id, 2);
        expect(typeof result).toBe('object');
        expect(result).not.toBeNull();
      }
    });
  });

  describe('deleteCartItem', () => {
    test('應回傳物件', async () => {
      const products = await api.fetchProducts();
      await api.addToCart(products[0].id, 1);
      const cart = await api.fetchCart();
      if (cart.carts.length > 0) {
        const result = await api.deleteCartItem(cart.carts[0].id);
        expect(typeof result).toBe('object');
        expect(result).not.toBeNull();
      }
    });
  });

  describe('clearCart', () => {
    test('應回傳物件，且清空後 carts 為空陣列、total 為 0', async () => {
      const products = await api.fetchProducts();
      await api.addToCart(products[0].id, 1);
      const result = await api.clearCart();
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      expect(result.carts.length).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('createOrder', () => {
    test('當 status 為 true 時，應有 id 且為 string', async () => {
      const products = await api.fetchProducts();
      await api.addToCart(products[0].id, 1);
      const result = await api.createOrder(validUser);
      if (result.status === true) {
        expect(result).toHaveProperty('id');
        expect(typeof result.id).toBe('string');
      }
    });
  });

  describe('fetchOrders', () => {
    test('應回傳陣列', async () => {
      const result = await api.fetchOrders();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updateOrderStatus', () => {
    test('應回傳物件', async () => {
      const orders = await api.fetchOrders();
      if (orders.length > 0) {
        const result = await api.updateOrderStatus(orders[0].id, true);
        expect(typeof result).toBe('object');
        expect(result).not.toBeNull();
      }
    });

    test('當 status 為 true 時，應有 orders 屬性', async () => {
      const orders = await api.fetchOrders();
      if (orders.length > 0) {
        const result = await api.updateOrderStatus(orders[0].id, true);
        if (result.status === true) {
          expect(result).toHaveProperty('orders');
          expect(Array.isArray(result.orders)).toBe(true);
        }
      }
    });

    test('當 status 為 false 時，應有 message 屬性', async () => {
      try {
        const result = await api.updateOrderStatus('不存在的訂單ID', true);
        if (result.status === false) {
          expect(result).toHaveProperty('message');
          expect(typeof result.message).toBe('string');
        }
      } catch (e) {
        if (e.response?.data?.status === false) {
          expect(e.response.data).toHaveProperty('message');
          expect(typeof e.response.data.message).toBe('string');
        }
      }
    });
  });

  describe('deleteOrder', () => {
    test('應回傳物件', async () => {
      const orders = await api.fetchOrders();
      if (orders.length > 0) {
        const result = await api.deleteOrder(orders[0].id);
        expect(typeof result).toBe('object');
        expect(result).not.toBeNull();
      }
    });

    test('當 status 為 false 時，應有 message 屬性', async () => {
      try {
        const result = await api.deleteOrder('不存在的訂單ID');
        if (result.status === false) {
          expect(result).toHaveProperty('message');
          expect(typeof result.message).toBe('string');
        }
      } catch (e) {
        if (e.response?.data?.status === false) {
          expect(e.response.data).toHaveProperty('message');
          expect(typeof e.response.data.message).toBe('string');
        }
      }
    });
  });
});

// ========================================
// 測試二：工具函式
// ========================================
//describe('測試二：工具函式', () => {

  describe('getDiscountRate', () => {
    test('應回傳字串', () => {
      const result = utils.getDiscountRate(mockProduct);
      expect(typeof result).toBe('string');
    });

    test('應包含 "折"', () => {
      const result = utils.getDiscountRate(mockProduct);
      expect(result).toContain('折');
    });

    test('應正確四捨五入：7.4折應為7折', () => {
      const product = { price: 740, origin_price: 1000 };
      const result = utils.getDiscountRate(product);
      expect(result).toMatch(/^7\s*折$/);
    });
  });

  describe('getAllCategories', () => {
    test('應回傳陣列', () => {
      const result = utils.getAllCategories(mockProducts);
      expect(Array.isArray(result)).toBe(true);
    });

    test('應去除重複（2 個分類）', () => {
      const result = utils.getAllCategories(mockProducts);
      expect(result.length).toBe(2);
    });

    test('結果不應有重複的分類', () => {
      const result = utils.getAllCategories(mockProducts);
      const uniqueResult = [...new Set(result)];
      expect(result.length).toBe(uniqueResult.length);
    });
  });

  describe('formatDate', () => {
    const timestamp = 1704067200; // 2024/01/01 08:00

    test('應有實作（不為 undefined）', () => {
      const result = utils.formatDate(timestamp);
      expect(result).toBeDefined();
    });

    test('應回傳字串', () => {
      const result = utils.formatDate(timestamp);
      expect(typeof result).toBe('string');
    });

    test('格式應為 YYYY/MM/DD HH:mm', () => {
      const result = utils.formatDate(timestamp);
      expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    });
  });

  describe('getDaysAgo', () => {
    test('應有實作（不為 undefined）', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 86400 * 3;
      const result = utils.getDaysAgo(timestamp);
      expect(result).toBeDefined();
    });

    test('應回傳字串', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 86400 * 3;
      const result = utils.getDaysAgo(timestamp);
      expect(typeof result).toBe('string');
    });

    test('今天的時間戳應回傳「今天」', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const result = utils.getDaysAgo(timestamp);
      expect(result).toBe('今天');
    });

    test('應包含中文時間關鍵字', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 86400 * 3;
      const result = utils.getDaysAgo(timestamp);
      expect(result).toMatch(/天|今/);
    });
  });

  describe('validateOrderUser', () => {
    test('應有實作（不為 undefined）', () => {
      const result = utils.validateOrderUser(validUser);
      expect(result).toBeDefined();
    });

    test('有效資料應回傳物件', () => {
      const result = utils.validateOrderUser(validUser);
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    test('有效資料 isValid 應為 true', () => {
      const result = utils.validateOrderUser(validUser);
      expect(result.isValid).toBe(true);
    });

    test('無效資料 isValid 應為 false', () => {
      const result = utils.validateOrderUser(invalidUser);
      expect(result.isValid).toBe(false);
    });

    test('無效資料應有 errors 陣列', () => {
      const result = utils.validateOrderUser(invalidUser);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('姓名為空應驗證失敗', () => {
      const emptyName = { ...validUser, name: '' };
      const result = utils.validateOrderUser(emptyName);
      expect(result.isValid).toBe(false);
    });

    test('電話格式不正確應驗證失敗', () => {
      const wrongTel = { ...validUser, tel: '1234567890' };
      const result = utils.validateOrderUser(wrongTel);
      expect(result.isValid).toBe(false);
    });

    test('Email 格式不正確應驗證失敗', () => {
      const wrongEmail = { ...validUser, email: 'notanemail' };
      const result = utils.validateOrderUser(wrongEmail);
      expect(result.isValid).toBe(false);
    });

    test('地址為空應驗證失敗', () => {
      const emptyAddress = { ...validUser, address: '' };
      const result = utils.validateOrderUser(emptyAddress);
      expect(result.isValid).toBe(false);
    });

    test('付款方式不在允許清單應驗證失敗', () => {
      const wrongPayment = { ...validUser, payment: 'Bitcoin' };
      const result = utils.validateOrderUser(wrongPayment);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateCartQuantity', () => {
    test('應有實作（不為 undefined）', () => {
      const result = utils.validateCartQuantity(5);
      expect(result).toBeDefined();
    });

    test('應回傳物件', () => {
      const result = utils.validateCartQuantity(5);
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    test('有效數量應驗證成功', () => {
      const result = utils.validateCartQuantity(5);
      expect(result.isValid).toBe(true);
    });

    test('數量 0 應驗證失敗', () => {
      const result = utils.validateCartQuantity(0);
      expect(result.isValid).toBe(false);
    });

    test('數量 100 應驗證失敗', () => {
      const result = utils.validateCartQuantity(100);
      expect(result.isValid).toBe(false);
    });

    test('小數應驗證失敗', () => {
      const result = utils.validateCartQuantity(5.5);
      expect(result.isValid).toBe(false);
    });
  });

  describe('formatCurrency', () => {
    test('應有實作（不為 undefined）', () => {
      const result = utils.formatCurrency(1000);
      expect(result).toBeDefined();
    });

    test('應包含 NT$ 前缀', () => {
      const result = utils.formatCurrency(1000);
      expect(result).toContain('NT$');
    });

    test('1000 應格式化為千位分隔符 1,000', () => {
      const result = utils.formatCurrency(1000);
      expect(result).toContain('1,000');
    });

    test('1000000 應正確格式化為 1,000,000', () => {
      const result = utils.formatCurrency(1000000);
      expect(result).toContain('1,000,000');
    });
  });


// ========================================
// 測試三：產品服務
// ========================================
//describe('測試三：產品服務', () => {

  // 從測試三開始，用 mockResolvedValue 覆蓋測試一設定的真實實作
  // 每個 describe 的 beforeEach 會在「檔案層級 beforeEach（clearAllMocks）」之後執行
  beforeEach(() => {
    api.fetchProducts.mockResolvedValue(mockApiProducts);
  });

  describe('getProducts', () => {
    test('應回傳物件', async () => {
      const result = await productService.getProducts();
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    test('count 應為數字且等於 products 長度', async () => {
      const result = await productService.getProducts();
      expect(typeof result.count).toBe('number');
      expect(result.count).toBe(result.products.length);
    });

    test('應只呼叫一次 fetchProducts', async () => {
      await productService.getProducts();
      expect(api.fetchProducts).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProductsByCategory', () => {
    // 【注意】mock 版直接使用假資料裡的分類名稱，不需要先呼叫 getCategories() 取得真實分類
    test('應回傳符合分類的陣列', async () => {
      const result = await productService.getProductsByCategory('衣服');
      expect(Array.isArray(result)).toBe(true);
      expect(result.every(p => p.category === '衣服')).toBe(true);
    });

    test('不存在的分類應回傳空陣列', async () => {
      const result = await productService.getProductsByCategory('不存在的分類');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getProductById', () => {
    // 【注意】mock 版直接使用假資料裡已知的 id，不需要先呼叫 getProducts()
    test('找到的產品應有 id 屬性且 id 正確', async () => {
      const result = await productService.getProductById('product-1');
      expect(result).toHaveProperty('id');
      expect(result.id).toBe('product-1');
    });

    test('找不到產品應回傳 null', async () => {
      expect(await productService.getProductById('不存在的ID')).toBeNull();
    });
  });

  describe('getCategories', () => {
    test('應回傳非空字串陣列', async () => {
      const result = await productService.getCategories();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(cat => typeof cat === 'string')).toBe(true);
    });

    // 【Mock 版新增】假資料中「衣服」出現兩次，可明確驗證去重邏輯
    test('應去除重複分類（衣服出現兩次，結果應只有一次）', async () => {
      const result = await productService.getCategories();
      const uniqueResult = [...new Set(result)];
      expect(result.length).toBe(uniqueResult.length);
    });
  });


// ========================================
// 測試四：購物車服務
// ========================================
//describe('測試四：購物車服務', () => {

  describe('getCart', () => {
    test('應回傳含 carts、total、finalTotal 的物件', async () => {
      api.fetchCart.mockResolvedValue(mockCartData);

      const result = await cartService.getCart();
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      expect(Array.isArray(result.carts)).toBe(true);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('finalTotal');
    });
  });

  describe('addProductToCart', () => {
    test('有效加入應回傳 success: true 且有 data 屬性', async () => {
      api.addToCart.mockResolvedValue(mockCartData);

      const result = await cartService.addProductToCart('product-1', 1);
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('data');
    });

    // 【重點示範】驗證失敗應在 API 呼叫前就被擋下來
    test('無效數量應回傳 success: false 且有 error 屬性', async () => {
      const result = await cartService.addProductToCart('any-id', -1);
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');

      // 驗證 addToCart 根本沒被呼叫（因為在驗證就失敗了）
      expect(api.addToCart).not.toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    // 【重點示範】同上，無效數量應在呼叫 API 前就被擋下來
    test('無效數量應回傳 success: false 且有 error 屬性', async () => {
      const result = await cartService.updateProduct('test-cart-id', -1);
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');

      // 驗證 updateCartItem 沒被呼叫
      expect(api.updateCartItem).not.toHaveBeenCalled();
    });

    test('應回傳有 success 屬性的物件', async () => {
      api.updateCartItem.mockResolvedValue({ message: '已更新' });

      const result = await cartService.updateProduct('cart-1', 2);
      expect(result).toHaveProperty('success');
    });
  });

  describe('removeProduct', () => {
    test('應回傳 success: true 的物件', async () => {
      api.deleteCartItem.mockResolvedValue({ message: '已刪除' });

      const result = await cartService.removeProduct('cart-1');
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });
  });

  describe('getCartTotal', () => {
    test('應有實作且回傳非 null 物件', async () => {
      api.fetchCart.mockResolvedValue(mockCartData);

      const result = await cartService.getCartTotal();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    test('應有 total、finalTotal、itemCount 屬性（皆為數字），且 itemCount 為非負數', async () => {
      api.fetchCart.mockResolvedValue(mockCartData);

      const result = await cartService.getCartTotal();
      expect(typeof result.total).toBe('number');
      expect(typeof result.finalTotal).toBe('number');
      expect(typeof result.itemCount).toBe('number');
      expect(result.itemCount).toBeGreaterThanOrEqual(0);
    });
  });


// ========================================
// 測試五：訂單服務
// ========================================
//describe('測試五：訂單服務', () => {
  
  describe('placeOrder', () => {
    // 【重點示範】驗證失敗時完全不打 API
    test('無效資料應回傳 success: false 且有非空 errors 陣列', async () => {
      const result = await orderService.placeOrder(invalidUser);
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);

      // 驗證資料不合格時，createOrder 不應被呼叫
      expect(api.createOrder).not.toHaveBeenCalled();
    });

    test('有效資料應回傳 success: true 且無 errors', async () => {
      api.createOrder.mockResolvedValue({ status: true, id: 'new-order-id' });

      const result = await orderService.placeOrder(validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.errors).toBeUndefined();
      }
    });
  });

  describe('getOrders', () => {
    test('應回傳非 undefined 的陣列，且每筆訂單含必要欄位', async () => {
      api.fetchOrders.mockResolvedValue(mockOrdersData);

      const result = await orderService.getOrders();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('user');
        expect(result[0]).toHaveProperty('paid');
      }
    });
  });

  describe('getUnpaidOrders', () => {
    test('應回傳陣列且有實作，所有訂單的 paid 應為 false', async () => {
      // mockOrdersData 包含 paid: false 和 paid: true 各一筆，驗證篩選邏輯
      api.fetchOrders.mockResolvedValue(mockOrdersData);

      const result = await orderService.getUnpaidOrders();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result.every(o => !o.paid)).toBe(true);
        expect(result.find(o => o.paid)).toBeUndefined();
      }
    });
  });

  describe('getPaidOrders', () => {
    test('應回傳陣列且有實作，所有訂單的 paid 應為 true', async () => {
      api.fetchOrders.mockResolvedValue(mockOrdersData);

      const result = await orderService.getPaidOrders();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result.every(o => o.paid)).toBe(true);
        expect(result.find(o => !o.paid)).toBeUndefined();
      }
    });
  });

  describe('updatePaymentStatus', () => {
    test('應回傳有 success 屬性的物件', async () => {
      api.updateOrderStatus.mockResolvedValue({ status: true, orders: mockOrdersData });

      const result = await orderService.updatePaymentStatus('order-1', true);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });
  });

  describe('removeOrder', () => {
    test('應回傳有 success 屬性的物件', async () => {
      api.deleteOrder.mockResolvedValue({ status: true });

      const result = await orderService.removeOrder('order-1');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });
  });

  describe('formatOrder', () => {
    // formatOrder 是純函式，不呼叫 API，不需要設定 mock
    test('應回傳物件', () => {
      const result = orderService.formatOrder(mockOrder);
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    test('應有 totalFormatted 屬性', () => {
      const result = orderService.formatOrder(mockOrder);
      expect(result).toHaveProperty('totalFormatted');
    });

    test('未付款訂單 paidText 應為「未付款」', () => {
      const result = orderService.formatOrder(mockOrder);
      expect(result.paidText).toBe('未付款');
    });

    test('已付款訂單 paidText 應為「已付款」', () => {
      const paidOrder = { ...mockOrder, paid: true };
      const result = orderService.formatOrder(paidOrder);
      expect(result.paidText).toBe('已付款');
    });

    test('createdAt 應為格式化日期字串', () => {
      const result = orderService.formatOrder(mockOrder);
      expect(result.createdAt).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    });
  });

