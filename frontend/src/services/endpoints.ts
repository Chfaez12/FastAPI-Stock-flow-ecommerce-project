import { apiClient } from './apiClient';
import type * as T from '../types/api';

const MAX_PAGE_SIZE = 100;

/** Walk every page of a paginated endpoint. For screens that need the full list (lookups, dashboards). */
async function fetchAllPages<Item>(url: string, params: object = {}): Promise<Item[]> {
  const items: Item[] = [];
  for (let page = 1; ; page++) {
    const res = await apiClient.get<T.Page<Item>>(url, { params: { ...params, page, size: MAX_PAGE_SIZE } });
    items.push(...res.data.items);
    if (page >= res.data.pages) return items;
  }
}

export const HealthService = {
  check: () => apiClient.get<{ status: string; app: string }>('/'),
};

export const AuthService = {
  register: (payload: T.UnifiedRegisterRequest) =>
    apiClient.post<T.AuthResponse>('/auth/register', payload),

  login: (payload: T.LoginRequest) => apiClient.post<T.AuthResponse>('/auth/login', payload),

  refresh: (payload: T.TokenRefreshRequest) =>
    apiClient.post<T.TokenRefreshResponse>('/auth/refresh', payload),

  logout: () => apiClient.post<{ message: string }>('/auth/logout'),

  forgotPassword: (email: string) => apiClient.post<T.MessageResponse>('/auth/forgot-password', { email }),

  resetPassword: (accessToken: string, newPassword: string) =>
    apiClient.post<T.MessageResponse>('/auth/reset-password', {
      access_token: accessToken,
      new_password: newPassword,
    }),

  resendVerification: (email: string) =>
    apiClient.post<T.MessageResponse>('/auth/resend-verification', { email }),
};

export const UserService = {
  getMe: () => apiClient.get<T.UserResponse>('/users/me'),

  updateMe: (payload: T.UpdateAccountRequest) =>
    apiClient.patch<T.UserResponse>('/users/me', payload),

  deleteMe: () => apiClient.delete<void>('/users/me'),

  changePassword: (payload: T.ChangePasswordRequest) =>
    apiClient.post<{ message: string }>('/users/me/change-password', payload),
};

export const CategoryService = {
  getAll: () => apiClient.get<T.CategoryResponse[]>('/categories/'),

  getById: (categoryId: string) => apiClient.get<T.CategoryResponse>(`/categories/${categoryId}`),

  create: (payload: T.CategoryCreate) => apiClient.post<T.CategoryResponse>('/categories/', payload),

  update: (categoryId: string, payload: T.CategoryUpdate) =>
    apiClient.patch<T.CategoryResponse>(`/categories/${categoryId}`, payload),

  delete: (categoryId: string) => apiClient.delete<void>(`/categories/${categoryId}`),
};

export const ProductService = {
  /** One page of products, searched, filtered and sorted on the server. */
  list: (query: T.ProductQuery = {}) => apiClient.get<T.Page<T.ProductResponse>>('/products/', { params: query }),

  /** Every product (all pages), for admin tables and id-to-name lookups. */
  getAll: (categoryId?: string) =>
    fetchAllPages<T.ProductResponse>('/products/', categoryId ? { category_id: categoryId } : {}),

  getById: (productId: string) => apiClient.get<T.ProductResponse>(`/products/${productId}`),

  create: (payload: T.ProductCreate) => apiClient.post<T.ProductResponse>('/products/', payload),

  update: (productId: string, payload: T.ProductUpdate) =>
    apiClient.patch<T.ProductResponse>(`/products/${productId}`, payload),

  delete: (productId: string) => apiClient.delete<void>(`/products/${productId}`),

  uploadImage: (productId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<T.ProductResponse>(`/products/${productId}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteImage: (productId: string) =>
    apiClient.delete<T.ProductResponse>(`/products/${productId}/image`),
};

export const InventoryService = {
  getAll: () => apiClient.get<T.InventoryResponse[]>('/inventory/'),

  adjust: (productId: string, payload: T.InventoryAdjustmentRequest) =>
    apiClient.post<T.InventoryResponse>(`/inventory/${productId}/adjust`, payload),
};

export const SupplierService = {
  getAll: () => apiClient.get<T.SupplierResponse[]>('/suppliers/'),

  getById: (supplierId: string) => apiClient.get<T.SupplierResponse>(`/suppliers/${supplierId}`),

  create: (payload: T.SupplierCreate) => apiClient.post<T.SupplierResponse>('/suppliers/', payload),

  update: (supplierId: string, payload: T.SupplierUpdate) =>
    apiClient.patch<T.SupplierResponse>(`/suppliers/${supplierId}`, payload),

  delete: (supplierId: string) => apiClient.delete<void>(`/suppliers/${supplierId}`),
};

export const OrderService = {
  placeOrder: (payload: T.OrderCreate) => apiClient.post<T.OrderResponse>('/orders/', payload),

  listMyOrders: (query: T.OrderQuery = {}) => apiClient.get<T.Page<T.OrderResponse>>('/orders/me', { params: query }),

  listAllOrders: (query: T.OrderQuery = {}) =>
    apiClient.get<T.Page<T.OrderResponse>>('/orders/all', { params: query }),

  getMyOrders: () => fetchAllPages<T.OrderResponse>('/orders/me'),

  getAllOrders: () => fetchAllPages<T.OrderResponse>('/orders/all'),

  updateStatus: (orderId: string, payload: T.OrderStatusUpdate) =>
    apiClient.patch<T.OrderResponse>(`/orders/${orderId}/status`, payload),

  cancelOrder: (orderId: string) => apiClient.post<T.OrderResponse>(`/orders/${orderId}/cancel`),
};

export const PurchaseOrderService = {
  getAll: () => apiClient.get<T.PurchaseOrderResponse[]>('/purchase-orders/'),

  getById: (poId: string) => apiClient.get<T.PurchaseOrderResponse>(`/purchase-orders/${poId}`),

  create: (payload: T.PurchaseOrderCreate) =>
    apiClient.post<T.PurchaseOrderResponse>('/purchase-orders/', payload),

  updateStatus: (poId: string, payload: T.PurchaseOrderStatusUpdate) =>
    apiClient.patch<T.PurchaseOrderResponse>(`/purchase-orders/${poId}/status`, payload),
};

export const ReviewService = {
  list: (productId: string, query: T.PageQuery & { rating?: number; sort?: T.ReviewSort } = {}) =>
    apiClient.get<T.Page<T.ReviewResponse>>(`/products/${productId}/reviews`, { params: query }),

  summary: (productId: string) => apiClient.get<T.ReviewSummary>(`/products/${productId}/reviews/summary`),

  eligibility: (productId: string) =>
    apiClient.get<T.ReviewEligibility>(`/products/${productId}/reviews/eligibility`),

  create: (productId: string, payload: T.ReviewCreate) =>
    apiClient.post<T.ReviewResponse>(`/products/${productId}/reviews`, payload),

  update: (reviewId: string, payload: T.ReviewUpdate) =>
    apiClient.patch<T.ReviewResponse>(`/reviews/${reviewId}`, payload),

  delete: (reviewId: string) => apiClient.delete<void>(`/reviews/${reviewId}`),
};

export const WishlistService = {
  getAll: () => apiClient.get<T.WishlistItemResponse[]>('/wishlist/'),

  add: (productId: string) => apiClient.post<T.WishlistItemResponse>('/wishlist/', { product_id: productId }),

  remove: (productId: string) => apiClient.delete<void>(`/wishlist/${productId}`),
};

export const CouponService = {
  list: (query: T.PageQuery & { search?: string; is_active?: boolean } = {}) =>
    apiClient.get<T.Page<T.CouponResponse>>('/coupons/', { params: query }),

  create: (payload: T.CouponCreate) => apiClient.post<T.CouponResponse>('/coupons/', payload),

  update: (couponId: string, payload: T.CouponUpdate) =>
    apiClient.patch<T.CouponResponse>(`/coupons/${couponId}`, payload),

  delete: (couponId: string) => apiClient.delete<void>(`/coupons/${couponId}`),

  validate: (code: string, subtotal: number) =>
    apiClient.post<T.CouponValidateResponse>('/coupons/validate', { code, subtotal }),
};
