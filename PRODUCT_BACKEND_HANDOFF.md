# HinchMart Admin Product Section
## Backend API Handoff

This document defines the API contract required by the current admin frontend for the **Products**, **Product Approvals**, and **Product Review** screens.

## 1. Product Workflows

### Product catalog (`/admin/products`)

Admin users can:

- View all products
- Search by product name, SKU, seller, or category
- Filter by status and category
- Create a product
- Edit product information
- View product details in a modal
- Activate or deactivate marketplace visibility
- Delete a product
- Select multiple products and bulk activate, deactivate, or delete
- Export the currently filtered list as CSV in the browser

### Product approvals (`/admin/product-approvals`)

Admin users can:

- View products waiting for approval
- Search pending submissions
- Inspect product data and image gallery
- Approve a product
- Reject a product with a reason

### Product review (`/admin/product-approvals/:id`)

Admin users can:

- Open one product by ID
- View its full image gallery and technical information
- Approve or reject it from the detail page
- Return to the pending approvals queue

## 2. Required Endpoints

The backend may use `/api` as the global prefix. The frontend axios client already receives that prefix from `VITE_API_URL`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/products` | Return product catalog list |
| POST | `/products` | Create a product |
| GET | `/products/:id` | Return one product |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |
| PATCH | `/products/:id/approve` | Approve product |
| PATCH | `/products/:id/reject` | Reject product |
| PATCH | `/products/:id/activate` | Activate product visibility |
| PATCH | `/products/:id/deactivate` | Deactivate product visibility |
| GET | `/admin/products/pending` | Return pending products for approval |
| GET | `/admin/products/:id` | Return one product for admin review |
| PATCH | `/admin/products/:id/approve` | Admin approval action |
| PATCH | `/admin/products/:id/reject` | Admin rejection action |

The frontend currently tries the `/admin/...` approval/detail routes first and then falls back to the equivalent `/products/...` route. Supporting the admin routes is recommended.

## 3. Product List Response

`GET /products` may return either a direct array or a wrapped response. The recommended response is:

```json
{
  "products": [],
  "page": 1,
  "limit": 25,
  "total": 0,
  "totalPages": 0
}
```

The current frontend can read any of these shapes:

```json
[]
```

```json
{ "products": [] }
```

```json
{ "data": [] }
```

Each product should include the fields below.

## 4. Product Object

```json
{
  "id": "prod_1001",
  "name": "Industrial 3-Phase Induction Motor",
  "title": "Industrial 3-Phase Induction Motor (7.5 kW)",
  "sku": "MOT-3PH-750",
  "brand": "Siemens",
  "category": {
    "id": "cat_2",
    "name": "Industrial Machinery & Parts"
  },
  "subcategory": {
    "id": "subcat_21",
    "name": "Electric Motors"
  },
  "seller": {
    "id": "seller_202",
    "name": "Apex Industrial Tools",
    "company": "Apex Industrial Tools",
    "email": "apex@example.com",
    "phone": "+91 98480 23456"
  },
  "mrp": 38000,
  "price": 34500,
  "sellingPrice": 34500,
  "basePrice": 34500,
  "moq": "2 Units",
  "stock": "45 Units",
  "inventory": 45,
  "hsn": "8501",
  "gst": "18%",
  "description": "Heavy-duty induction motor with IP55 protection.",
  "image": "https://cdn.example.com/products/motor-main.jpg",
  "images": [
    "https://cdn.example.com/products/motor-main.jpg",
    "https://cdn.example.com/products/motor-side.jpg"
  ],
  "status": "APPROVED",
  "approvalStatus": "APPROVED",
  "active": true,
  "rejectionReason": null,
  "submittedAt": "2026-08-25T09:30:00.000Z",
  "approvedAt": "2026-08-25T10:00:00.000Z",
  "createdAt": "2026-08-25T09:00:00.000Z",
  "updatedAt": "2026-08-25T10:00:00.000Z"
}
```

### Compatibility requirements

- The frontend accepts either `id` or `_id`.
- `category` may be an object or a string, but an object with `id` and `name` is preferred.
- `seller` may be an object or `sellerName`, but an object with `id` and `name` is preferred.
- `image` is used as the primary image.
- `images` is used for the review gallery. Return an array even when there is one image.
- `price`, `sellingPrice`, `basePrice`, `mrp`, and inventory values should be returned as numbers where possible.
- Preserve `approvalStatus` and `status` consistently. The frontend supports both names for compatibility.

## 5. Create Product

### Request

`POST /products`

The current admin form sends JSON:

```json
{
  "name": "Industrial 3-Phase Induction Motor",
  "sku": "MOT-3PH-750",
  "price": "34500",
  "moq": "2 Units",
  "stock": "45 Units",
  "category": "Industrial Machinery & Parts",
  "sellerName": "Apex Industrial Tools",
  "brand": "Siemens",
  "hsn": "8501",
  "gst": "18%",
  "description": "Heavy-duty induction motor with IP55 protection.",
  "image": "data:image/jpeg;base64,...",
  "imageName": "motor.jpg",
  "status": "APPROVED",
  "active": true
}
```

The backend should normalize this into the Product Object. If product creation by an admin should require review, the backend may override the submitted status to `PENDING`.

### Recommended response

Return HTTP `201` and the complete created product:

```json
{
  "product": {
    "id": "prod_1001",
    "name": "Industrial 3-Phase Induction Motor",
    "status": "APPROVED",
    "approvalStatus": "APPROVED",
    "active": true
  },
  "message": "Product created successfully"
}
```

The current frontend also accepts the product object directly, so returning the object directly is supported:

```json
{
  "id": "prod_1001",
  "name": "Industrial 3-Phase Induction Motor"
}
```

## 6. Update Product

### Request

`PUT /products/:id`

The frontend sends the complete editable form object:

```json
{
  "name": "Updated Product Name",
  "sku": "MOT-3PH-750",
  "price": "35000",
  "moq": "2 Units",
  "stock": "40 Units",
  "category": "Industrial Machinery & Parts",
  "sellerName": "Apex Industrial Tools",
  "brand": "Siemens",
  "hsn": "8501",
  "gst": "18%",
  "description": "Updated specifications",
  "image": "https://cdn.example.com/products/motor-main.jpg",
  "status": "APPROVED",
  "active": true
}
```

Return HTTP `200` with the complete updated product.

## 7. Approval Flow

### Pending products

`GET /admin/products/pending`

Recommended response:

```json
{
  "products": [
    {
      "id": "prod_1002",
      "name": "TMT Steel Rebar",
      "sku": "TMT-550-12",
      "approvalStatus": "PENDING",
      "status": "PENDING",
      "active": false
    }
  ],
  "total": 1
}
```

Only products with `approvalStatus = PENDING` should be returned. The current frontend also filters the general `/products` response if the pending endpoint is unavailable.

### Approve product

`PATCH /admin/products/:id/approve`

No request body is required.

Recommended result:

```json
{
  "product": {
    "id": "prod_1002",
    "approvalStatus": "APPROVED",
    "status": "APPROVED",
    "active": true,
    "approvedAt": "2026-08-25T10:15:00.000Z"
  },
  "message": "Product approved successfully"
}
```

Recommended transition:

```text
PENDING -> APPROVED
active: false -> true
```

### Reject product

`PATCH /admin/products/:id/reject`

Request body:

```json
{
  "reason": "Incomplete product specifications or missing documentation."
}
```

Recommended result:

```json
{
  "product": {
    "id": "prod_1002",
    "approvalStatus": "REJECTED",
    "status": "REJECTED",
    "active": false,
    "rejectionReason": "Incomplete product specifications or missing documentation.",
    "rejectedAt": "2026-08-25T10:15:00.000Z"
  },
  "message": "Product rejected"
}
```

Recommended transition:

```text
PENDING -> REJECTED
active: false
```

The rejection reason should be saved and returned by both list and detail endpoints.

## 8. Visibility Actions

### Activate

`PATCH /products/:id/activate`

```json
{
  "active": true,
  "status": "APPROVED",
  "approvalStatus": "APPROVED"
}
```

### Deactivate

`PATCH /products/:id/deactivate`

```json
{
  "active": false,
  "status": "INACTIVE"
}
```

A pending or rejected product should not become marketplace-visible through an activation request. The backend should return HTTP `409` if the approval state does not allow activation.

The catalog frontend also uses `PUT /products/:id` with `{ "active": true/false }` for bulk actions, so the normal update endpoint should support that payload.

## 9. Delete Product

`DELETE /products/:id`

Recommended response:

```json
{
  "message": "Product deleted successfully",
  "id": "prod_1001"
}
```

Return HTTP `404` if the product does not exist. If deletion is restricted because of orders or invoices, return HTTP `409` with a clear message.

## 10. Supporting Lookup APIs

The product page loads these APIs at the same time as products:

| Method | Endpoint | Required response |
|---|---|---|
| GET | `/categories` | Array or `{ "categories": [] }` |
| GET | `/sellers` | Array or `{ "sellers": [] }` |

Category response example:

```json
{
  "categories": [
    {
      "id": "cat_2",
      "name": "Industrial Machinery & Parts",
      "active": true,
      "subcategories": [
        { "id": "subcat_21", "name": "Electric Motors" }
      ]
    }
  ]
}
```

Seller response example:

```json
{
  "sellers": [
    {
      "id": "seller_202",
      "businessName": "Apex Industrial Tools",
      "ownerName": "Rajesh Khandelwal",
      "status": "ACTIVE",
      "approvalStatus": "APPROVED"
    }
  ]
}
```

Only active/approved categories and sellers should be offered for new product assignment.

## 11. Image Handling

The current frontend supports:

- Local image upload
- Drag and drop image upload
- Image data URL submission
- Image URL/preset selection
- One primary image and an optional image gallery

The frontend currently sends the selected image in the JSON `image` field. Recommended backend options:

1. Accept the data URL, upload it to object storage, and return a permanent HTTPS URL.
2. Add a dedicated multipart upload endpoint and update the frontend later.

Recommended image rules:

- Accept JPG, PNG, and WebP.
- Home hero banner: exactly `1080 x 540px`, JPG/WebP, maximum `300 KB`.
- Category image: `16:5` ratio, PNG/JPG, maximum `5 MB`; recommended `1200 x 375px`.
- Subcategory image: exactly `400 x 400px`, PNG/JPG, maximum `100 KB`.
- Product image: square ratio, JPG/WebP, maximum `10 MB`; recommended `1200 x 1200px`.
- Thumbnail: maximum `100 KB`.
- Profile image: maximum `80 KB`.
- Document/PDF: maximum `1 MB`.
- Return permanent URLs, not temporary local paths.
- Validate image MIME type and file size server-side.
- Return `image` and `images` in every product response.

## 12. Validation Rules

The backend should validate all rules even though the frontend also performs basic validation:

- `name`: required, maximum 200 characters
- `sku`: required, unique, maximum 100 characters
- `price`: required, numeric, greater than or equal to zero
- `mrp`: numeric, greater than or equal to price when supplied
- `moq`: required and greater than zero
- `stock` / `inventory`: non-negative
- `category`: required and must reference an existing active category
- `seller`: required and must reference an approved seller, unless admin-created products are allowed without a seller
- `hsn`: valid HSN format when supplied
- `gst`: valid configured GST rate
- `description`: maximum length enforced server-side
- `image`: safe image URL or validated uploaded image

The current form sends seller and category names. The recommended next frontend change is to send `categoryId` and `sellerId`; the backend should support those IDs now so the contract can evolve without ambiguity.

## 13. Authentication and Errors

All product endpoints must require an authenticated admin or authorized seller context according to the endpoint.

Recommended errors:

```json
{
  "message": "SKU already exists",
  "code": "DUPLICATE_SKU",
  "errors": {
    "sku": "A product with this SKU already exists."
  }
}
```

Use these status codes:

- `200`: successful read/update/action
- `201`: successful creation
- `400`: validation failure
- `401`: unauthenticated
- `403`: insufficient permission
- `404`: product/category/seller not found
- `409`: duplicate SKU, invalid state transition, or deletion conflict
- `413`: image too large
- `500`: unexpected server error

The frontend displays `response.data.message`, so every failed request should include a readable `message`.

## 14. Acceptance Checklist

The backend integration is ready when:

- `GET /products` loads the catalog without frontend fallback data.
- Product list supports all fields displayed in the catalog table.
- `POST /products` creates a product and returns its ID.
- `PUT /products/:id` preserves unspecified fields.
- `GET /admin/products/pending` returns only pending products.
- Approve and reject actions update status immediately.
- Rejection reasons are persisted.
- Product detail endpoint returns the full image gallery.
- Activate/deactivate correctly controls marketplace visibility.
- Delete returns a clear success or conflict response.
- Categories and sellers can be selected from lookup data.
- Image URLs remain accessible after a page refresh.
- All unauthorized and invalid requests return the documented error shape.
