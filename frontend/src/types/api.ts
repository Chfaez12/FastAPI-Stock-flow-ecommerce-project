export type UserRole = 'BUSINESS' | 'CUSTOMER';
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: any;
  ctx?: Record<string, any>;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
}

export interface AuthResponse {
  user: UserResponse;
  access_token: string;
  refresh_token: string;
  token_type?: string;
  email_verification_required?: boolean;
}

export interface MessageResponse {
  message: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface PageQuery {
  page?: number;
  size?: number;
}

export interface UnifiedRegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

export interface UpdateAccountRequest {
  name?: string | null;
  phone?: string | null;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface CategoryCreate {
  name: string;
  description?: string | null;
}

export interface CategoryUpdate {
  name?: string | null;
  description?: string | null;
}

export interface CategoryResponse {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ProductCreate {
  sku: string;
  name: string;
  price: number | string;
  description?: string | null;
  status?: ProductStatus;
  category_id?: string | null;
  initial_quantity?: number;
}

export interface ProductUpdate {
  sku?: string | null;
  name?: string | null;
  description?: string | null;
  price?: number | string | null;
  status?: ProductStatus | null;
  category_id?: string | null;
}

export interface ProductResponse {
  id: string;
  sku: string;
  name: string;
  price: string;
  description: string | null;
  status?: ProductStatus;
  category_id: string | null;
  available_stock: number | null;
  image_url?: string | null;
  average_rating?: number | null;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

export type ProductSort =
  | 'featured'
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'
  | 'rating';

export interface ProductQuery extends PageQuery {
  search?: string;
  category_id?: string;
  status?: ProductStatus;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  sort?: ProductSort;
}

export interface InventoryResponse {
  product_id: string;
  quantity: number;
  reorder_level: number;
  updated_at: string;
}

export interface InventoryAdjustmentRequest {
  quantity_delta: number;
  reorder_level?: number | null;
}

export interface SupplierCreate {
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface SupplierUpdate {
  name?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface SupplierResponse {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface OrderItemCreate {
  product_id: string;
  quantity: number;
}

export interface OrderCreate {
  items: OrderItemCreate[];
  coupon_code?: string | null;
}

export interface OrderItemResponse {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
}

export interface OrderResponse {
  id: string;
  customer_id: string;
  subtotal_amount: string;
  discount_amount: string;
  total_amount: string;
  coupon_code: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  items: OrderItemResponse[];
}

export interface OrderStatusUpdate {
  status: OrderStatus;
}

export interface PurchaseOrderItemCreate {
  product_id: string;
  quantity: number;
  unit_cost: number | string;
}

export interface PurchaseOrderCreate {
  supplier_id: string;
  items: PurchaseOrderItemCreate[];
}

export interface PurchaseOrderItemResponse {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: string;
}

export interface PurchaseOrderResponse {
  id: string;
  supplier_id: string;
  total_amount: string;
  status: PurchaseOrderStatus;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItemResponse[];
}

export interface PurchaseOrderStatusUpdate {
  status: PurchaseOrderStatus;
}

export type OrderSort = 'newest' | 'oldest' | 'total_desc' | 'total_asc';

export interface OrderQuery extends PageQuery {
  status?: OrderStatus;
  date_from?: string;
  date_to?: string;
  sort?: OrderSort;
}

export interface ReviewResponse {
  id: string;
  product_id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewCreate {
  rating: number;
  title?: string | null;
  comment?: string | null;
}

export type ReviewUpdate = Partial<ReviewCreate>;

export interface ReviewSummary {
  product_id: string;
  average_rating: number | null;
  review_count: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface ReviewEligibility {
  can_review: boolean;
  reason?: string | null;
  existing_review?: ReviewResponse | null;
}

export type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest';

export interface WishlistItemResponse {
  id: string;
  product_id: string;
  created_at: string;
  product: ProductResponse;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface CouponCreate {
  code: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value: number | string;
  min_order_amount?: number | string | null;
  max_discount_amount?: number | string | null;
  starts_at?: string | null;
  expires_at?: string | null;
  usage_limit?: number | null;
  usage_limit_per_user?: number | null;
  is_active?: boolean;
}

export type CouponUpdate = Partial<Omit<CouponCreate, 'code'>>;

export interface CouponResponse {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: string;
  min_order_amount: string | null;
  max_discount_amount: string | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponValidateResponse {
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: string;
  subtotal: string;
  discount_amount: string;
  total: string;
}
