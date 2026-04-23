const axios = require('axios');

class PetpoojaClient {
  constructor() {
    this.baseURL = process.env.PETPOOJA_BASE_URL;
    this.email = process.env.PETPOOJA_EMAIL;
    this.password = process.env.PETPOOJA_PASSWORD;
    this.organizationId = null;
    this.cookieString = null;          // stores the full Cookie header value
    this.refreshingPromise = null;

    // Axios instance for all requests (no interceptor for auth – we handle manually)
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        'Origin': 'https://business.petpooja.com',
        'Referer': 'https://business.petpooja.com/',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
      }
    });

    // Request interceptor – inject the stored cookie (if any)
    this.client.interceptors.request.use(async (config) => {
      if (this.cookieString) {
        config.headers.Cookie = this.cookieString;
      }
      return config;
    });

    // Response interceptor – handle 401 by refreshing token
    this.client.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
          original._retry = true;
          try {
            await this.refreshToken();
            // Update cookie string after refresh
            original.headers.Cookie = this.cookieString;
            return this.client(original);
          } catch (refreshError) {
            // If refresh fails, force login again
            await this.login();
            original.headers.Cookie = this.cookieString;
            return this.client(original);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Extract cookies from 'set-cookie' headers (array) and build a single Cookie string
  _extractCookieString(setCookieHeaders) {
    if (!setCookieHeaders || !setCookieHeaders.length) return null;
    const cookies = setCookieHeaders.map(header => header.split(';')[0]); // take only "key=value"
    return cookies.join('; ');
  }

  // Perform login and store the cookies returned by the server
  async login() {
    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email: this.email,
        password: this.password,
      }, {
        headers: {
          'Origin': 'https://business.petpooja.com',
          'Referer': 'https://business.petpooja.com/',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        },
        withCredentials: false, // we handle cookies manually
      });

      // Extract cookies from the 'set-cookie' header
      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders) {
        this.cookieString = this._extractCookieString(setCookieHeaders);
        console.log('[Petpooja] Cookies stored:', this.cookieString);
      } else {
        console.warn('[Petpooja] No set-cookie headers in login response');
      }

      this.organizationId = response.data.currentOrganization.id;
      console.log('[Petpooja] Login successful, orgId:', this.organizationId);
      return response.data;
    } catch (error) {
      console.error('[Petpooja] Login failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Refresh token using the existing cookies (the refresh token is already in the cookie)
  async refreshToken() {
    if (this.refreshingPromise) return this.refreshingPromise;
    this.refreshingPromise = (async () => {
      try {
        const response = await axios.post(`${this.baseURL}/auth/refresh`, {}, {
          headers: {
            'Origin': 'https://business.petpooja.com',
            'Referer': 'https://business.petpooja.com/',
            'Cookie': this.cookieString,   // send current cookies
            'User-Agent': 'Mozilla/5.0 ...',
          },
          withCredentials: false,
        });
        // Update cookies from refresh response (new tokens)
        const setCookieHeaders = response.headers['set-cookie'];
        if (setCookieHeaders) {
          this.cookieString = this._extractCookieString(setCookieHeaders);
          console.log('[Petpooja] Cookies refreshed');
        }
        return response.data;
      } catch (error) {
        console.error('[Petpooja] Refresh failed:', error.response?.data || error.message);
        throw error;
      } finally {
        this.refreshingPromise = null;
      }
    })();
    return this.refreshingPromise;
  }

  // Ensure we have cookies before making a request
  async _ensureAuth() {
    if (!this.cookieString) {
      await this.login();
    }
    // Optional: check expiry by decoding JWT accessToken in cookie
    // For simplicity, we rely on the 401 interceptor to refresh.
  }

  // ----- API Methods -----
async getItems(page = 1, perPage = 100, options = {}) {
  await this._ensureAuth();

  const params = {
    page,
    per_page: perPage,
    organizationId: this.organizationId,

    sort_by: options.sort_by || 'createdAt',
    sort_order: options.sort_order || 'desc',
    search_by: options.search_by || 'global',

    include_variants: options.include_variants !== false,

    ...(options.category_id && { category_id: options.category_id }),
    ...(options.group_id && { group_id: options.group_id }),
    ...(options.item_name && { item_name: options.item_name }),
    ...(options.item_filter && { item_filter: options.item_filter }),
  };

  const response = await this.client.get('/items', { params });
  return response.data;
}

  async getItemsByCategory(categoryId, page = 1, perPage = 100) {
    
    return this.getItems(page, perPage, { category_id: categoryId, include_variants: true });
  }

  async getItemById(itemId) {
    await this._ensureAuth();
    console.log(itemId)
    const response = await this.client.get(`/items/${itemId}`);
    console.log("response", response)
    return response.data;
  }
  
  async searchItems({ name, groupId, categoryId }) {
  return this.getItems(1, 100, {
    item_name: name,
    group_id: groupId,
    category_id: categoryId,
    include_variants: true,
    item_filter: 'all'
  });
}

async getMasterData() {
  await this._ensureAuth();

  const response = await this.client.get('/items/master-data', {
    params: {
      organizationId: this.organizationId,
    }
  });



  return response.data;
}

// 🔍 Search Party (Customer)
async findParty({ name, mobile }) {
  await this._ensureAuth();

  const response = await this.client.get('/parties', {
    params: {
      page: 1,
      per_page: 10,
      sort_by: 'createdAt',
      sort_order: 'desc',
      filter_by: 'both',
      status: 'all',
      name,
      mobile
    }
  });

  const parties = response.data?.data || [];

  // 🔥 strict match (VERY IMPORTANT)
  return parties.find(p => p.mobile === mobile) || null;
}

// 🔍 Get Party by ID
async getPartyById(partyId) {
  await this._ensureAuth();

  try {
    const response = await this.client.get(`/parties/${partyId}`);
    console.log("getPartyById response:", response.data);

    return response.data?.data || response.data;
  } catch (err) {
    console.log("❌ getPartyById error:", err.response?.data || err.message);
    return null;
  }
}
async findPartyByMobile(mobile) {
  await this._ensureAuth();

  try {
    const response = await this.client.get("/parties", {
      params: {
        page: 1,
        per_page: 10,
        sort_by: "createdAt",
        sort_order: "desc",
        filter_by: "both",
        status: "all",
        mobile,
      },
    });

    const parties = response.data?.data || [];

    // 🔥 exact match filter
    const party = parties.find(p => p.mobile === mobile);

    return party || null;

  } catch (err) {
    console.log("❌ findPartyByMobile error:", err.message);
    return null;
  }
}
// ➕ Create Party
async createParty(payload) {
  await this._ensureAuth();

  

  const response = await this.client.post('/parties', payload);

  return response.data;
}
 

}

module.exports = new PetpoojaClient();