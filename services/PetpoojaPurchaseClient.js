const axios = require("axios");

class PetpoojaPurchaseClient {

  constructor() {

    this.baseURL =
      process.env.PETPOOJA_PURCHASE_BASE_URL ||
      "https://purchase-api.petpooja.com/api/web";

    this.userContact =
      process.env.PETPOOJA_USER_CONTACT;

    // Authentication state
    this.token = null;
    this.user = null;
    this.cookieString = null;

    this.client = axios.create({
      baseURL: this.baseURL,

      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/145.0.0.0 Safari/537.36",

        "Origin":
          "https://business.petpooja.com",

        "Referer":
          "https://business.petpooja.com/",

        "Accept":
          "application/json, text/plain, */*",

        "Accept-Language":
          "en-GB,en-US;q=0.9,en;q=0.8"
      }
    });

    // ----------------------------------------------------
    // Request interceptor
    // ----------------------------------------------------

    this.client.interceptors.request.use(
      (config) => {

        // Add token if Petpooja uses Authorization
        if (this.token) {

          config.headers.Authorization =
            `Bearer ${this.token}`;
        }

        // Add cookies if Petpooja uses session cookies
        if (this.cookieString) {

          config.headers.Cookie =
            this.cookieString;
        }

        return config;
      }
    );
  }


  // ======================================================
  // COOKIE HELPER
  // ======================================================

  _extractCookieString(setCookieHeaders) {

    if (
      !setCookieHeaders ||
      !setCookieHeaders.length
    ) {
      return null;
    }

    const cookies =
      setCookieHeaders.map(
        header =>
          header.split(";")[0]
      );

    return cookies.join("; ");
  }


  // ======================================================
  // OTP - REQUEST
  // ======================================================

  async requestOtp(
    userContact = this.userContact
  ) {

    if (!userContact) {

      throw new Error(
        "Petpooja user contact is required"
      );
    }

    const response =
      await this.client.post(
        "/authentication/v1/request-auth-otp",

        {
          user_contact: userContact
        },

        {
          headers: {
            "Content-Type":
              "application/json"
          }
        }
      );

    return response.data;
  }


  // ======================================================
  // OTP - VERIFY
  // ======================================================

  async verifyOtp({
    otp,
    user,
    userContact = this.userContact,
    keepMeLoggedIn = true
  }) {

    if (!otp) {
      throw new Error("OTP is required");
    }

    if (!user) {
      throw new Error("Petpooja user is required");
    }

    const response =
      await this.client.post(

        "/authentication/v1/request-auth-verify-otp",

        {
          otp: String(otp),

          user,

          user_contact:
            userContact,

          keep_me_logged_in:
            keepMeLoggedIn
        },

        {
          headers: {
            "Content-Type":
              "application/json"
          }
        }
      );


    // --------------------------------------------------
    // Store cookies
    // --------------------------------------------------

    const setCookieHeaders =
      response.headers["set-cookie"];

    if (setCookieHeaders) {

      this.cookieString =
        this._extractCookieString(
          setCookieHeaders
        );
    }


    // --------------------------------------------------
    // Store token
    // --------------------------------------------------

    const data =
      response.data || {};

    this.token =
      data.token ||
      data.access_token ||
      data.accessToken ||
      data.data?.token ||
      data.data?.access_token ||
      null;


    this.user =
      data.user ||
      data.data?.user ||
      user;


    console.log(
      "[Petpooja] OTP verification successful"
    );

    return response.data;
  }


  // ======================================================
  // SET AUTH MANUALLY
  // Useful if token is stored in DB
  // ======================================================

  setAuth({
    token,
    user,
    cookies
  }) {

    this.token = token || null;

    this.user = user || null;

    this.cookieString =
      cookies || null;
  }


  // ======================================================
  // CHECK AUTH
  // ======================================================

  isAuthenticated() {

    console.log("this.token",this.token);
    return !!(
      this.token ||
      this.cookieString
    );
  }


  // ======================================================
  // INVOICE LIST
  // ======================================================

  async getInvoices({

    statusGroup = "uploaded",

    page = 1,

    pageSize = 10,

    sortBy = "createdAt",

    sortOrder = "DESC"

  } = {}) {


    if (!this.isAuthenticated()) {

      throw new Error(
        "Petpooja authentication required"
      );
    }


    const response =
      await this.client.get(

        "/invoice/v1/invoice-list",

        {
          params: {

            invoice_status_group:
              statusGroup,

            sort_by:
              sortBy,

            sort_order:
              sortOrder,

            page,

            page_size:
              pageSize
          }
        }
      );


    return response.data;
  }


  // ======================================================
  // INVOICE DETAIL
  // ======================================================

  async getInvoiceDetail(
    invoiceId
  ) {

    if (!invoiceId) {

      throw new Error(
        "Invoice ID is required"
      );
    }


    if (!this.isAuthenticated()) {

      throw new Error(
        "Petpooja authentication required"
      );
    }


    const response =
      await this.client.get(

        "/invoice/v1/invoice-detail",

        {
          params: {
            id: invoiceId
          }
        }
      );


    return response.data;
  }


  // ======================================================
  // SIMPLIFIED INVOICE
  // ======================================================

  async getInvoice(
    invoiceId
  ) {

    const data =
      await this.getInvoiceDetail(
        invoiceId
      );


    return {

      id:
        data.id,

      invoiceNumber:
        data.invoice_no,

      invoiceDate:
        data.invoice_date,

      documentType:
        data.document_type,

      status:
        data.invoice_status,

      buyer: {

        name:
          data.buyer?.company_name,

        gstNo:
          data.buyer?.gst_no
      },

      seller: {

        name:
          data.seller?.company_name,

        gstNo:
          data.seller?.gst_no,

        petpoojaSupplierId:
          data.seller
            ?.petpooja_supplier_tag
            ?.petpooja_supplier_id
      },

      source:
        data.sources?.[0]
          ? {

              name:
                data.sources[0].name,

              url:
                data.sources[0].path,

              type:
                data.sources[0].type,

              size:
                data.sources[0].size,

              pageCount:
                data.sources[0].page_count
            }
          : null,


      products:
        (data.products || [])
          .map(product => ({

            hsn:
              product.hsn,

            description:
              product.description,

            quantity:
              Number(
                product.quantity || 0
              ),

            rate:
              Number(
                product.rate || 0
              ),

            mrp:
              Number(
                product.mrp || 0
              ),

            unit:
              product.unit || null,

            gstRate:
              Number(
                product.gst_rate || 0
              ),

            cgstRate:
              Number(
                product.cgst_rate || 0
              ),

            sgstRate:
              Number(
                product.sgst_rate || 0
              ),

            cgstAmount:
              Number(
                product.cgst_amount || 0
              ),

            sgstAmount:
              Number(
                product.sgst_amount || 0
              ),

            discountRate:
              Number(
                product.discount_rate || 0
              ),

            petpoojaTag:
              product.petpooja_tag
                ? {
                    id:
                      product.petpooja_tag.id,

                    tags:
                      product.petpooja_tag.tags || []
                  }
                : null

          }))
    };
  }

  async checkAuth() {

  await this._ensureAuth();

  try {

    const response =
      await this.client.get(
        "/api/web/invoice/v1/invoice-list",
        {
          params: {
            invoice_status_group: "uploaded",
            sort_by: "createdAt",
            sort_order: "DESC",
            page: 1,
            page_size: 1,
          },
        }
      );

    return response.data;

  } catch (error) {

    if (
      error.response?.status === 401 ||
      error.response?.status === 403
    ) {
      throw error;
    }

    throw error;
  }
}

  async getInvoiceList({
  invoiceStatusGroup = "uploaded",
  sortBy = "createdAt",
  sortOrder = "DESC",
  page = 1,
  pageSize = 10,
} = {}) {

  if (!this.isAuthenticated()) {
    throw new Error(
      "Petpooja authentication required"
    );
  }

  const response = await this.client.get(
    "/invoice/v1/invoice-list",
    {
      params: {
        invoice_status_group: invoiceStatusGroup,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
      },
    }
  );

  return response.data;
}
}


module.exports =
  new PetpoojaPurchaseClient();