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

// User & Auth Models
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

// Category Models
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

// Product Models
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
  created_at: string;
  updated_at: string;
}

// Inventory Models
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

// Supplier Models
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

// Order Models
export interface OrderItemCreate {
  product_id: string;
  quantity: number;
}

export interface OrderCreate {
  items: OrderItemCreate[];
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
  total_amount: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  items: OrderItemResponse[];
}

export interface OrderStatusUpdate {
  status: OrderStatus;
}

// Purchase Order Models
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