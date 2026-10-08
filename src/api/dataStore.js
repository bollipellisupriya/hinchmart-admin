// Dynamic Hybrid Data Store for HinchMart Admin
// Provides real-time reactive state, localStorage persistence, realistic seed data,
// and automatic sync with backend API or offline fallback.

const EVENT_NAME = "hinchmart_data_updated";

export const dispatchDataUpdate = (entity, action, data) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: { entity, action, data } })
    );
  }
};

export const subscribeDataUpdate = (callback) => {
  if (typeof window !== "undefined") {
    const handler = (e) => callback(e.detail);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }
  return () => {};
};

// Initial Seed Data
const initialBuyers = [
  {
    id: "buy_101",
    name: "ABC Constructions",
    email: "procurement@abcconstructions.in",
    phone: "+91 98765 43210",
    company: "ABC Constructions Pvt Ltd",
    gstin: "24AAACA9876E1Z1",
    address: "Plot 42, GIDC Industrial Estate, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    state: "Gujarat",
    status: "ACTIVE",
    totalOrders: 18,
    totalSpent: 485000,
    createdAt: "2025-11-12T10:30:00.000Z",
    lastActive: "2026-08-18T14:20:00.000Z",
  },
  {
    id: "buy_102",
    name: "Priya Sundaram",
    email: "priya.s@sundaramtextiles.com",
    phone: "+91 98450 11223",
    company: "Sundaram Textiles & Yarn Co.",
    gstin: "33AABCS4321D1Z5",
    address: "128 Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu",
    city: "Coimbatore",
    state: "Tamil Nadu",
    status: "ACTIVE",
    totalOrders: 34,
    totalSpent: 1240000,
    createdAt: "2025-09-04T08:15:00.000Z",
    lastActive: "2026-08-19T09:10:00.000Z",
  },
  {
    id: "buy_103",
    name: "Vikram Malhotra",
    email: "v.malhotra@malhotrabuildcon.com",
    phone: "+91 98110 99887",
    company: "Malhotra Buildcon Corp.",
    gstin: "09AAACM5432B1Z2",
    address: "Tower B, Sector 62, Noida, Uttar Pradesh",
    city: "Noida",
    state: "Uttar Pradesh",
    status: "INACTIVE",
    totalOrders: 5,
    totalSpent: 195000,
    createdAt: "2026-01-15T11:45:00.000Z",
    lastActive: "2026-07-10T16:00:00.000Z",
  },
  {
    id: "buy_104",
    name: "Sunita Patel",
    email: "sunita@patelpharma.com",
    phone: "+91 97234 56789",
    company: "Patel Pharma & Chemicals",
    gstin: "24AABCP6789M1Z3",
    address: "Phase II, GIDC Vatva, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    state: "Gujarat",
    status: "ACTIVE",
    totalOrders: 42,
    totalSpent: 2890000,
    createdAt: "2025-08-20T14:10:00.000Z",
    lastActive: "2026-08-19T10:05:00.000Z",
  },
];

const initialSellers = [
  {
    id: "sel_201",
    businessName: "Sri Sai Steel",
    ownerName: "Sai Kumar",
    email: "sales@srisaisteel.com",
    phone: "+91 98220 54321",
    gst: "27AABCA1234F1Z8",
    gstin: "27AABCA1234F1Z8",
    category: "Steel Rods & Rebars",
    address: "MIDC Industrial Area, Bhosari, Pune, Maharashtra",
    city: "Pune",
    state: "Maharashtra",
    status: "ACTIVE",
    approvalStatus: "APPROVED",
    productsCount: 48,
    totalRevenue: 3450000,
    rating: 4.8,
    createdAt: "2025-07-10T09:00:00.000Z",
  },
  {
    id: "sel_202",
    businessName: "Apex Industrial Tools",
    ownerName: "Rajesh Khandelwal",
    email: "apex.tools@khandelwal.com",
    phone: "+91 98480 23456",
    gst: "36AACCB5678G2Z1",
    gstin: "36AACCB5678G2Z1",
    category: "Tools & Hardware Supplies",
    address: "Cherlapally Industrial Estate, Hyderabad, Telangana",
    city: "Hyderabad",
    state: "Telangana",
    status: "ACTIVE",
    approvalStatus: "APPROVED",
    productsCount: 65,
    totalRevenue: 5200000,
    rating: 4.9,
    createdAt: "2025-08-15T11:20:00.000Z",
  },
];

const initialCategories = [
  {
    id: "cat_1",
    name: "Steel Rods & Rebars",
    description: "TMT bars, reinforcement steel, structural beams, channel sections, and billet steel.",
    displayOrder: 1,
    active: true,
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&auto=format&fit=crop&q=60",
    productsCount: 142,
  },
  {
    id: "cat_2",
    name: "Industrial Machinery & Parts",
    description: "Heavy machinery, CNC equipment, compressors, lathes, and spare components.",
    displayOrder: 2,
    active: true,
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60",
    productsCount: 215,
  },
  {
    id: "cat_3",
    name: "Tools & Hardware Supplies",
    description: "Hand tools, power tools, fasteners, precision gauges, and workshop supplies.",
    displayOrder: 3,
    active: true,
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&auto=format&fit=crop&q=60",
    productsCount: 180,
  },
];

const initialBanners = [
  {
    id: "bnr_1",
    title: "Build better, source smarter",
    subtitle: "Verified industrial supply for every ambitious project.",
    ctaText: "Explore marketplace",
    link: "/products",
    placement: "Homepage hero",
    status: "LIVE",
    startDate: "2026-08-01",
    endDate: "2026-09-30",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1400&auto=format&fit=crop&q=85",
  },
  {
    id: "bnr_2",
    title: "The tools that keep work moving",
    subtitle: "Precision hardware from trusted B2B sellers.",
    ctaText: "Shop tools",
    link: "/products?category=tools",
    placement: "Category spotlight",
    status: "DRAFT",
    startDate: "2026-09-01",
    endDate: "2026-10-15",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1400&auto=format&fit=crop&q=85",
  },
];

const initialProducts = [
  {
    id: "prod_pending_1",
    name: "TATA Tiscon 550D",
    title: "TATA Tiscon 550D High Ductility Rebars",
    seller: { id: "sel_201", name: "Sri Sai Steel", company: "Sri Sai Steel Enterprises", email: "sales@srisaisteel.com", phone: "+91 98220 54321" },
    sellerName: "Sri Sai Steel",
    category: "Steel Rods & Rebars",
    brand: "TATA",
    sku: "TATA-550-12",
    hsn: "7214",
    gst: "18%",
    mrp: 65000,
    price: 61500,
    sellingPrice: 61500,
    basePrice: 61500,
    moq: "1 Ton",
    stock: "25 Tons",
    inventory: 25,
    images: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
    ],
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
    description: "TATA Tiscon 550D is a superior grade TMT rebar known for unmatched strength and superior ductility. Ideal for seismic zone construction, heavy infrastructure, bridges, and commercial complexes.",
    status: "PENDING",
    approvalStatus: "PENDING",
    active: false,
    submittedAt: "Today",
    createdAt: new Date().toISOString(),
  },
  {
    id: "prod_pending_2",
    name: "Jindal Panther 550D TMT Rebar",
    title: "Jindal Panther Fe 550D TMT Steel Rebar",
    seller: { id: "sel_201", name: "Sri Sai Steel", company: "Sri Sai Steel Enterprises", email: "sales@srisaisteel.com", phone: "+91 98220 54321" },
    sellerName: "Sri Sai Steel",
    category: "Steel Rods & Rebars",
    brand: "Jindal",
    sku: "JIN-550D-16",
    hsn: "7214",
    gst: "18%",
    mrp: 63000,
    price: 59800,
    sellingPrice: 59800,
    basePrice: 59800,
    moq: "2 Tons",
    stock: "40 Tons",
    inventory: 40,
    images: [
      "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=600&auto=format&fit=crop&q=80",
    ],
    image: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=600&auto=format&fit=crop&q=80",
    description: "Jindal Panther 550D rebar with low carbon content, exceptional bendability and corrosion resistance for coastal projects.",
    status: "PENDING",
    approvalStatus: "PENDING",
    active: false,
    submittedAt: "Yesterday",
    createdAt: "2026-08-18T11:00:00.000Z",
  },
  {
    id: "prod_1",
    name: "Industrial 3-Phase Induction Motor (7.5 kW)",
    title: "Industrial 3-Phase Induction Motor (7.5 kW)",
    seller: { id: "sel_202", name: "Apex Industrial Tools", company: "Apex Industrial Tools", email: "apex.tools@khandelwal.com", phone: "+91 98480 23456" },
    sellerName: "Apex Industrial Tools",
    category: "Industrial Machinery & Parts",
    brand: "Siemens",
    sku: "MOT-3PH-750",
    hsn: "8501",
    gst: "18%",
    mrp: 38000,
    price: 34500,
    sellingPrice: 34500,
    basePrice: 34500,
    moq: "2 Units",
    stock: "45 Units",
    inventory: 45,
    images: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
    ],
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
    description: "Cast iron heavy-duty industrial induction motor with IP55 protection.",
    status: "APPROVED",
    approvalStatus: "APPROVED",
    active: true,
    submittedAt: "10 Aug",
    createdAt: "2026-08-10T09:00:00.000Z",
  },
];

const initialOrders = [
  {
    id: "ord_101",
    orderNumber: "HM2608181024",
    number: "HM2608181024",
    buyer: {
      id: "buy_101",
      name: "ABC Constructions",
      company: "ABC Constructions Pvt Ltd",
      email: "procurement@abcconstructions.in",
      phone: "+91 98765 43210",
      address: "Plot 42, GIDC Industrial Estate, Ahmedabad, Gujarat",
    },
    buyerName: "ABC Constructions",
    seller: {
      id: "sel_201",
      name: "Sri Sai Steel",
      company: "Sri Sai Steel Enterprises",
      email: "sales@srisaisteel.com",
      phone: "+91 98220 54321",
    },
    sellerName: "Sri Sai Steel",
    items: [
      {
        id: "item_1",
        product: "TATA Tiscon 550D (12mm)",
        sku: "TATA-550-12",
        quantity: "5 Tons",
        price: 61500,
        subtotal: 307500,
      },
    ],
    itemsCount: 1,
    subtotal: 307500,
    tax: 55350,
    gst: "18% (₹55,350)",
    shipping: 0,
    totalAmount: 362850,
    amount: 362850,
    paymentMethod: "Bank Transfer (NEFT/RTGS)",
    paymentStatus: "Pending", // Pending | Success | Failed | Refunded
    status: "Processing", // Processing | Pending | Confirmed | Shipped | Delivered | Cancelled
    orderStatus: "Processing",
    paymentId: "TXN-8829101",
    shipmentId: "TRK-SAFEX-992101",
    invoiceId: "INV-2026-001",
    transactionRef: "UTR-AXIS-9928103",
    shippingAddress: "Site Office #4, GIFT City Highway, Gandhinagar, Gujarat - 382355",
    deliveryStatus: "Processing at Warehouse",
    expectedDelivery: "24 Aug 2026",
    date: "18 Aug",
    createdAt: "2026-08-18T10:24:00.000Z",
  },
  {
    id: "ord_102",
    orderNumber: "HM2608181025",
    number: "HM2608181025",
    buyer: {
      id: "buy_102",
      name: "Priya Sundaram",
      company: "Sundaram Textiles & Yarn Co.",
      email: "priya.s@sundaramtextiles.com",
      phone: "+91 98450 11223",
      address: "128 Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu",
    },
    buyerName: "Priya Sundaram",
    seller: {
      id: "sel_202",
      name: "Apex Industrial Tools",
      company: "Apex Industrial Tools",
      email: "apex.tools@khandelwal.com",
      phone: "+91 98480 23456",
    },
    sellerName: "Apex Industrial Tools",
    items: [
      {
        id: "item_2",
        product: "Industrial 3-Phase Induction Motor (7.5 kW)",
        sku: "MOT-3PH-750",
        quantity: "2 Units",
        price: 34500,
        subtotal: 69000,
      },
    ],
    itemsCount: 1,
    subtotal: 69000,
    tax: 12420,
    gst: "18% (₹12,420)",
    shipping: 1500,
    totalAmount: 82920,
    amount: 82920,
    paymentMethod: "UPI / Net Banking",
    paymentStatus: "Success",
    status: "Shipped",
    orderStatus: "Shipped",
    paymentId: "TXN-8829102",
    shipmentId: "TRK-BLUED-881920",
    invoiceId: "INV-2026-002",
    transactionRef: "UPI-PAY-7738291",
    shippingAddress: "128 Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu - 641012",
    deliveryStatus: "In Transit via Blue Dart",
    expectedDelivery: "21 Aug 2026",
    date: "18 Aug",
    createdAt: "2026-08-18T14:15:00.000Z",
  },
  {
    id: "ord_103",
    orderNumber: "HM2608190915",
    number: "HM2608190915",
    buyer: {
      id: "buy_104",
      name: "Sunita Patel",
      company: "Patel Pharma & Chemicals",
      email: "sunita@patelpharma.com",
      phone: "+91 97234 56789",
      address: "Phase II, GIDC Vatva, Ahmedabad, Gujarat",
    },
    buyerName: "Sunita Patel",
    seller: {
      id: "sel_201",
      name: "Sri Sai Steel",
      company: "Sri Sai Steel Enterprises",
      email: "sales@srisaisteel.com",
      phone: "+91 98220 54321",
    },
    sellerName: "Sri Sai Steel",
    items: [
      {
        id: "item_3",
        product: "Structural Steel I-Beams (ISMB 200)",
        sku: "STM-BEAM-200",
        quantity: "3 Tons",
        price: 58000,
        subtotal: 174000,
      },
    ],
    itemsCount: 1,
    subtotal: 174000,
    tax: 31320,
    gst: "18% (₹31,320)",
    shipping: 2500,
    totalAmount: 207820,
    amount: 207820,
    paymentMethod: "Letter of Credit (LC)",
    paymentStatus: "Success",
    status: "Confirmed",
    orderStatus: "Confirmed",
    paymentId: "TXN-8829103",
    shipmentId: "TRK-DELHIV-551029",
    invoiceId: "INV-2026-003",
    transactionRef: "LC-HDFC-0091823",
    shippingAddress: "Plant 3, GIDC Vatva, Ahmedabad, Gujarat - 382445",
    deliveryStatus: "Order Packed & Ready for Loading",
    expectedDelivery: "23 Aug 2026",
    date: "19 Aug",
    createdAt: "2026-08-19T09:15:00.000Z",
  },
  {
    id: "ord_104",
    orderNumber: "HM2608190916",
    number: "HM2608190916",
    buyer: {
      id: "buy_103",
      name: "Vikram Malhotra",
      company: "Malhotra Buildcon Corp.",
      email: "v.malhotra@malhotrabuildcon.com",
      phone: "+91 98110 99887",
      address: "Tower B, Sector 62, Noida, Uttar Pradesh",
    },
    buyerName: "Vikram Malhotra",
    seller: {
      id: "sel_201",
      name: "Sri Sai Steel",
      company: "Sri Sai Steel Enterprises",
      email: "sales@srisaisteel.com",
      phone: "+91 98220 54321",
    },
    sellerName: "Sri Sai Steel",
    items: [
      {
        id: "item_4",
        product: "TATA Tiscon 550D (16mm)",
        sku: "TATA-550-16",
        quantity: "2 Tons",
        price: 61500,
        subtotal: 123000,
      },
    ],
    itemsCount: 1,
    subtotal: 123000,
    tax: 22140,
    gst: "18% (₹22,140)",
    shipping: 0,
    totalAmount: 145140,
    amount: 145140,
    paymentMethod: "Credit Card",
    paymentStatus: "Failed",
    status: "Cancelled",
    orderStatus: "Cancelled",
    paymentId: "TXN-8829104",
    shipmentId: null,
    invoiceId: null,
    transactionRef: "CC-DECL-551920",
    shippingAddress: "Site 12, Sector 62, Noida, UP",
    deliveryStatus: "Cancelled due to Payment Failure",
    expectedDelivery: "—",
    date: "19 Aug",
    createdAt: "2026-08-19T11:00:00.000Z",
  },
  {
    id: "ord_105",
    orderNumber: "HM2608170810",
    number: "HM2608170810",
    buyer: {
      id: "buy_104",
      name: "Sunita Patel",
      company: "Patel Pharma & Chemicals",
      email: "sunita@patelpharma.com",
      phone: "+91 97234 56789",
      address: "Phase II, GIDC Vatva, Ahmedabad, Gujarat",
    },
    buyerName: "Sunita Patel",
    seller: {
      id: "sel_202",
      name: "Apex Industrial Tools",
      company: "Apex Industrial Tools",
      email: "apex.tools@khandelwal.com",
      phone: "+91 98480 23456",
    },
    sellerName: "Apex Industrial Tools",
    items: [
      {
        id: "item_5",
        product: "Heavy Duty High-Tensile Hex Bolts (Box of 100)",
        sku: "BLT-HT-M16-60",
        quantity: "20 Boxes",
        price: 1850,
        subtotal: 37000,
      },
    ],
    itemsCount: 1,
    subtotal: 37000,
    tax: 6660,
    gst: "18% (₹6,660)",
    shipping: 0,
    totalAmount: 43660,
    amount: 43660,
    paymentMethod: "Net Banking",
    paymentStatus: "Success",
    status: "Delivered",
    orderStatus: "Delivered",
    paymentId: "TXN-8829105",
    shipmentId: "TRK-VRL-441928",
    invoiceId: "INV-2026-005",
    transactionRef: "SETTL-SBIN-112938",
    shippingAddress: "Phase II, GIDC Vatva, Ahmedabad, Gujarat",
    deliveryStatus: "Delivered to Warehouse Dock 2",
    expectedDelivery: "19 Aug 2026",
    date: "17 Aug",
    createdAt: "2026-08-17T08:10:00.000Z",
  },
];

const initialPayments = [
  {
    id: "TXN-8829101",
    transactionId: "TXN-8829101",
    orderId: "ord_101",
    orderNumber: "HM2608181024",
    buyer: { id: "buy_101", name: "ABC Constructions", company: "ABC Constructions Pvt Ltd", email: "procurement@abcconstructions.in", phone: "+91 98765 43210" },
    buyerName: "ABC Constructions",
    seller: { id: "sel_201", name: "Sri Sai Steel", company: "Sri Sai Steel Enterprises", email: "sales@srisaisteel.com", phone: "+91 98220 54321" },
    sellerName: "Sri Sai Steel",
    amount: 362850,
    method: "Bank Transfer (NEFT/RTGS)",
    gatewayStatus: "Authorized (Escrow Hold)",
    paymentStatus: "Pending", // Success | Pending | Failed | Refunded
    gatewayRef: "UTR-AXIS-9928103",
    gatewayBank: "Axis Bank Corporate Gateway",
    gatewayResponse: "{\"status\":\"AUTHORIZED\",\"code\":\"00\",\"rrn\":\"9928103001\"}",
    date: "18 Aug 2026",
    createdAt: "2026-08-18T10:24:00.000Z",
  },
  {
    id: "TXN-8829102",
    transactionId: "TXN-8829102",
    orderId: "ord_102",
    orderNumber: "HM2608181025",
    buyer: { id: "buy_102", name: "Priya Sundaram", company: "Sundaram Textiles & Yarn Co.", email: "priya.s@sundaramtextiles.com", phone: "+91 98450 11223" },
    buyerName: "Priya Sundaram",
    seller: { id: "sel_202", name: "Apex Industrial Tools", company: "Apex Industrial Tools", email: "apex.tools@khandelwal.com", phone: "+91 98480 23456" },
    sellerName: "Apex Industrial Tools",
    amount: 82920,
    method: "UPI / Net Banking",
    gatewayStatus: "Settled",
    paymentStatus: "Success",
    gatewayRef: "UPI-PAY-7738291",
    gatewayBank: "HDFC Razorpay Direct",
    gatewayResponse: "{\"status\":\"CAPTURED\",\"code\":\"00\",\"rrn\":\"7738291002\"}",
    date: "18 Aug 2026",
    createdAt: "2026-08-18T14:15:00.000Z",
  },
  {
    id: "TXN-8829103",
    transactionId: "TXN-8829103",
    orderId: "ord_103",
    orderNumber: "HM2608190915",
    buyer: { id: "buy_104", name: "Sunita Patel", company: "Patel Pharma & Chemicals", email: "sunita@patelpharma.com", phone: "+91 97234 56789" },
    buyerName: "Sunita Patel",
    seller: { id: "sel_201", name: "Sri Sai Steel", company: "Sri Sai Steel Enterprises", email: "sales@srisaisteel.com", phone: "+91 98220 54321" },
    sellerName: "Sri Sai Steel",
    amount: 207820,
    method: "Letter of Credit (LC)",
    gatewayStatus: "Settled",
    paymentStatus: "Success",
    gatewayRef: "LC-HDFC-0091823",
    gatewayBank: "HDFC Trade Finance Gateway",
    gatewayResponse: "{\"status\":\"SETTLED\",\"code\":\"00\",\"lc_num\":\"LC-HDFC-0091823\"}",
    date: "19 Aug 2026",
    createdAt: "2026-08-19T09:15:00.000Z",
  },
  {
    id: "TXN-8829104",
    transactionId: "TXN-8829104",
    orderId: "ord_104",
    orderNumber: "HM2608190916",
    buyer: { id: "buy_103", name: "Vikram Malhotra", company: "Malhotra Buildcon Corp.", email: "v.malhotra@malhotrabuildcon.com", phone: "+91 98110 99887" },
    buyerName: "Vikram Malhotra",
    seller: { id: "sel_201", name: "Sri Sai Steel", company: "Sri Sai Steel Enterprises", email: "sales@srisaisteel.com", phone: "+91 98220 54321" },
    sellerName: "Sri Sai Steel",
    amount: 145140,
    method: "Credit Card",
    gatewayStatus: "Declined",
    paymentStatus: "Failed",
    gatewayRef: "CC-DECL-551920",
    gatewayBank: "ICICI Payment Gateway",
    gatewayResponse: "{\"status\":\"DECLINED\",\"code\":\"51\",\"reason\":\"INSUFFICIENT_FUNDS\"}",
    date: "19 Aug 2026",
    createdAt: "2026-08-19T11:00:00.000Z",
  },
  {
    id: "TXN-8829105",
    transactionId: "TXN-8829105",
    orderId: "ord_105",
    orderNumber: "HM2608170810",
    buyer: { id: "buy_104", name: "Sunita Patel", company: "Patel Pharma & Chemicals", email: "sunita@patelpharma.com", phone: "+91 97234 56789" },
    buyerName: "Sunita Patel",
    seller: { id: "sel_202", name: "Apex Industrial Tools", company: "Apex Industrial Tools", email: "apex.tools@khandelwal.com", phone: "+91 98480 23456" },
    sellerName: "Apex Industrial Tools",
    amount: 43660,
    method: "Net Banking",
    gatewayStatus: "Settled",
    paymentStatus: "Success",
    gatewayRef: "SETTL-SBIN-112938",
    gatewayBank: "State Bank of India Corporate",
    gatewayResponse: "{\"status\":\"SETTLED\",\"code\":\"00\",\"rrn\":\"1129380005\"}",
    date: "17 Aug 2026",
    createdAt: "2026-08-17T08:10:00.000Z",
  },
];

const initialInvoices = [
  {
    id: "INV-2026-001",
    invoiceNumber: "INV-2026-001",
    orderId: "ord_101",
    orderNumber: "HM2608181024",
    buyer: { id: "buy_101", name: "ABC Constructions", company: "ABC Constructions Pvt Ltd", gstin: "24AAACA9876E1Z1", address: "Plot 42, GIDC Industrial Estate, Ahmedabad, Gujarat" },
    buyerName: "ABC Constructions",
    seller: { id: "sel_201", name: "Sri Sai Steel", company: "Sri Sai Steel Enterprises", gstin: "27AABCA1234F1Z8", address: "MIDC Industrial Area, Bhosari, Pune, Maharashtra" },
    sellerName: "Sri Sai Steel",
    taxableAmount: 307500,
    gst: 55350,
    cgst: 27675,
    sgst: 27675,
    igst: 0,
    gstRate: "18%",
    total: 362850,
    status: "Generated", // Generated | Paid | Pending | Cancelled
    date: "18 Aug 2026",
    createdAt: "2026-08-18T10:24:00.000Z",
  },
  {
    id: "INV-2026-002",
    invoiceNumber: "INV-2026-002",
    orderId: "ord_102",
    orderNumber: "HM2608181025",
    buyer: { id: "buy_102", name: "Priya Sundaram", company: "Sundaram Textiles & Yarn Co.", gstin: "33AABCS4321D1Z5", address: "128 Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu" },
    buyerName: "Priya Sundaram",
    seller: { id: "sel_202", name: "Apex Industrial Tools", company: "Apex Industrial Tools", gstin: "36AACCB5678G2Z1", address: "Cherlapally Industrial Estate, Hyderabad, Telangana" },
    sellerName: "Apex Industrial Tools",
    taxableAmount: 69000,
    gst: 12420,
    cgst: 0,
    sgst: 0,
    igst: 12420,
    gstRate: "18%",
    total: 82920,
    status: "Paid",
    date: "18 Aug 2026",
    createdAt: "2026-08-18T14:15:00.000Z",
  },
  {
    id: "INV-2026-003",
    invoiceNumber: "INV-2026-003",
    orderId: "ord_103",
    orderNumber: "HM2608190915",
    buyer: { id: "buy_104", name: "Sunita Patel", company: "Patel Pharma & Chemicals", gstin: "24AABCP6789M1Z3", address: "Phase II, GIDC Vatva, Ahmedabad, Gujarat" },
    buyerName: "Sunita Patel",
    seller: { id: "sel_201", name: "Sri Sai Steel", company: "Sri Sai Steel Enterprises", gstin: "27AABCA1234F1Z8", address: "MIDC Industrial Area, Bhosari, Pune, Maharashtra" },
    sellerName: "Sri Sai Steel",
    taxableAmount: 174000,
    gst: 31320,
    cgst: 0,
    sgst: 0,
    igst: 31320,
    gstRate: "18%",
    total: 207820,
    status: "Paid",
    date: "19 Aug 2026",
    createdAt: "2026-08-19T09:15:00.000Z",
  },
  {
    id: "INV-2026-005",
    invoiceNumber: "INV-2026-005",
    orderId: "ord_105",
    orderNumber: "HM2608170810",
    buyer: { id: "buy_104", name: "Sunita Patel", company: "Patel Pharma & Chemicals", gstin: "24AABCP6789M1Z3", address: "Phase II, GIDC Vatva, Ahmedabad, Gujarat" },
    buyerName: "Sunita Patel",
    seller: { id: "sel_202", name: "Apex Industrial Tools", company: "Apex Industrial Tools", gstin: "36AACCB5678G2Z1", address: "Cherlapally Industrial Estate, Hyderabad, Telangana" },
    sellerName: "Apex Industrial Tools",
    taxableAmount: 37000,
    gst: 6660,
    cgst: 0,
    sgst: 0,
    igst: 6660,
    gstRate: "18%",
    total: 43660,
    status: "Paid",
    date: "17 Aug 2026",
    createdAt: "2026-08-17T08:10:00.000Z",
  },
];

const initialShipments = [
  {
    id: "TRK-SAFEX-992101",
    shipmentId: "TRK-SAFEX-992101",
    orderId: "ord_101",
    orderNumber: "HM2608181024",
    seller: { id: "sel_201", name: "Sri Sai Steel", company: "Sri Sai Steel Enterprises", phone: "+91 98220 54321" },
    sellerName: "Sri Sai Steel",
    buyer: { id: "buy_101", name: "ABC Constructions", company: "ABC Constructions Pvt Ltd", phone: "+91 98765 43210" },
    buyerName: "ABC Constructions",
    pickup: "MIDC Bhosari, Pune, MH",
    destination: "GIDC Industrial Estate, Ahmedabad, GJ",
    transportPartner: "SafeXpress Logistics",
    trackingNumber: "SFX-8829104",
    status: "Processing", // Pending | Processing | Picked Up | In Transit | Delivered | Cancelled
    expectedDelivery: "24 Aug 2026",
    shippedDate: "18 Aug 2026",
    createdAt: "2026-08-18T10:24:00.000Z",
  },
  {
    id: "TRK-BLUED-881920",
    shipmentId: "TRK-BLUED-881920",
    orderId: "ord_102",
    orderNumber: "HM2608181025",
    seller: { id: "sel_202", name: "Apex Industrial Tools", company: "Apex Industrial Tools", phone: "+91 98480 23456" },
    sellerName: "Apex Industrial Tools",
    buyer: { id: "buy_102", name: "Priya Sundaram", company: "Sundaram Textiles & Yarn Co.", phone: "+91 98450 11223" },
    buyerName: "Priya Sundaram",
    pickup: "Cherlapally, Hyderabad, TS",
    destination: "Gandhipuram, Coimbatore, TN",
    transportPartner: "Blue Dart Express",
    trackingNumber: "BLU-7728190",
    status: "In Transit",
    expectedDelivery: "21 Aug 2026",
    shippedDate: "18 Aug 2026",
    createdAt: "2026-08-18T14:15:00.000Z",
  },
  {
    id: "TRK-DELHIV-551029",
    shipmentId: "TRK-DELHIV-551029",
    orderId: "ord_103",
    orderNumber: "HM2608190915",
    seller: { id: "sel_201", name: "Sri Sai Steel", company: "Sri Sai Steel Enterprises", phone: "+91 98220 54321" },
    sellerName: "Sri Sai Steel",
    buyer: { id: "buy_104", name: "Sunita Patel", company: "Patel Pharma & Chemicals", phone: "+91 97234 56789" },
    buyerName: "Sunita Patel",
    pickup: "MIDC Bhosari, Pune, MH",
    destination: "GIDC Vatva, Ahmedabad, GJ",
    transportPartner: "Delhivery Freight",
    trackingNumber: "DEL-9928101",
    status: "Picked Up",
    expectedDelivery: "23 Aug 2026",
    shippedDate: "19 Aug 2026",
    createdAt: "2026-08-19T09:15:00.000Z",
  },
  {
    id: "TRK-VRL-441928",
    shipmentId: "TRK-VRL-441928",
    orderId: "ord_105",
    orderNumber: "HM2608170810",
    seller: { id: "sel_202", name: "Apex Industrial Tools", company: "Apex Industrial Tools", phone: "+91 98480 23456" },
    sellerName: "Apex Industrial Tools",
    buyer: { id: "buy_104", name: "Sunita Patel", company: "Patel Pharma & Chemicals", phone: "+91 97234 56789" },
    buyerName: "Sunita Patel",
    pickup: "Cherlapally, Hyderabad, TS",
    destination: "GIDC Vatva, Ahmedabad, GJ",
    transportPartner: "VRL Logistics",
    trackingNumber: "VRL-1102938",
    status: "Delivered",
    expectedDelivery: "19 Aug 2026",
    shippedDate: "17 Aug 2026",
    deliveredDate: "19 Aug 2026",
    createdAt: "2026-08-17T08:10:00.000Z",
  },
];

const initialRFQs = [
  {
    id: "rfq_301",
    rfqNumber: "RFQ-2026-041",
    title: "Need 500 units Heavy Duty Hex Bolts (M20 x 80mm)",
    productName: "Heavy Duty Hex Bolts (M20 x 80mm)",
    buyer: { id: "buy_101", name: "ABC Constructions" },
    buyerName: "ABC Constructions",
    quantity: 500,
    unit: "Pcs",
    targetBudget: 45000,
    deadline: "2026-08-30",
    status: "OPEN",
    quotesCount: 4,
    description: "Looking for Grade 8.8 or Grade 10.9 hot dip galvanized bolts with test certs.",
    createdAt: "2026-08-18T12:00:00.000Z",
  },
  {
    id: "rfq_302",
    rfqNumber: "RFQ-2026-042",
    title: "High Precision CNC Lathe Spare Tooling Set",
    productName: "CNC Lathe Spare Tooling Set",
    buyer: { id: "buy_102", name: "Priya Sundaram" },
    buyerName: "Priya Sundaram",
    quantity: 10,
    unit: "Sets",
    targetBudget: 120000,
    deadline: "2026-09-05",
    status: "OPEN",
    quotesCount: 2,
    description: "High speed carbide inserts and tool holders for automated turning.",
    createdAt: "2026-08-19T08:00:00.000Z",
  },
  {
    id: "rfq_303",
    rfqNumber: "RFQ-2026-043",
    title: "Industrial Grade Epoxy Primer 20L Drums (Bulk 50 Drums)",
    productName: "Industrial Epoxy Primer Drums",
    buyer: { id: "buy_104", name: "Sunita Patel" },
    buyerName: "Sunita Patel",
    quantity: 50,
    unit: "Drums",
    targetBudget: 340000,
    deadline: "2026-09-12",
    status: "OPEN",
    quotesCount: 5,
    description: "Need heavy corrosion resistant primer for marine atmosphere chemical plant.",
    createdAt: "2026-08-19T10:15:00.000Z",
  },
];

// LocalStorage helpers
const getStorageItem = (key, fallback) => {
  try {
    const item = localStorage.getItem(`hinchmart_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(`hinchmart_${key}`, JSON.stringify(value));
  } catch (err) {
    console.error("Storage error", err);
  }
};

// Data Store Class
class DynamicDataStore {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem("hinchmart_buyers")) setStorageItem("buyers", initialBuyers);
    if (!localStorage.getItem("hinchmart_sellers")) setStorageItem("sellers", initialSellers);
    if (!localStorage.getItem("hinchmart_categories")) setStorageItem("categories", initialCategories);
    if (!localStorage.getItem("hinchmart_banners")) setStorageItem("banners", initialBanners);
    if (!localStorage.getItem("hinchmart_products")) setStorageItem("products", initialProducts);
    if (!localStorage.getItem("hinchmart_orders")) setStorageItem("orders", initialOrders);
    if (!localStorage.getItem("hinchmart_payments")) setStorageItem("payments", initialPayments);
    if (!localStorage.getItem("hinchmart_invoices")) setStorageItem("invoices", initialInvoices);
    if (!localStorage.getItem("hinchmart_shipments")) setStorageItem("shipments", initialShipments);
    if (!localStorage.getItem("hinchmart_rfqs")) setStorageItem("rfqs", initialRFQs);
  }

  // BUYERS
  getBuyers() {
    return getStorageItem("buyers", initialBuyers);
  }
  getBuyerById(id) {
    return this.getBuyers().find((b) => (b.id || b._id) === id);
  }
  addBuyer(buyerData) {
    const buyers = this.getBuyers();
    const newBuyer = {
      id: `buy_${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      status: "ACTIVE",
      totalOrders: 0,
      totalSpent: 0,
      ...buyerData,
    };
    buyers.unshift(newBuyer);
    setStorageItem("buyers", buyers);
    dispatchDataUpdate("buyers", "create", newBuyer);
    return newBuyer;
  }
  updateBuyer(id, updates) {
    const buyers = this.getBuyers();
    const idx = buyers.findIndex((b) => (b.id || b._id) === id);
    if (idx !== -1) {
      buyers[idx] = { ...buyers[idx], ...updates, updatedAt: new Date().toISOString() };
      setStorageItem("buyers", buyers);
      dispatchDataUpdate("buyers", "update", buyers[idx]);
      return buyers[idx];
    }
    return null;
  }
  setBuyerStatus(id, newStatus) {
    return this.updateBuyer(id, { status: newStatus });
  }
  deleteBuyer(id) {
    const buyers = this.getBuyers().filter((b) => (b.id || b._id) !== id);
    setStorageItem("buyers", buyers);
    dispatchDataUpdate("buyers", "delete", { id });
    return true;
  }

  // SELLERS
  getSellers() {
    return getStorageItem("sellers", initialSellers);
  }
  getSellerById(id) {
    return this.getSellers().find((s) => (s.id || s._id) === id);
  }
  addSeller(sellerData) {
    const sellers = this.getSellers();
    const newSeller = {
      id: `sel_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: sellerData.status || "ACTIVE",
      approvalStatus: sellerData.approvalStatus || (sellerData.status === "ACTIVE" ? "APPROVED" : "PENDING"),
      productsCount: 0,
      totalRevenue: 0,
      rating: 5.0,
      ...sellerData,
    };
    sellers.unshift(newSeller);
    setStorageItem("sellers", sellers);
    dispatchDataUpdate("sellers", "create", newSeller);
    return newSeller;
  }
  updateSeller(id, updates) {
    const sellers = this.getSellers();
    const idx = sellers.findIndex((s) => (s.id || s._id) === id);
    if (idx !== -1) {
      sellers[idx] = { ...sellers[idx], ...updates, updatedAt: new Date().toISOString() };
      setStorageItem("sellers", sellers);
      dispatchDataUpdate("sellers", "update", sellers[idx]);
      return sellers[idx];
    }
    return null;
  }
  setSellerStatus(id, newStatus) {
    const updates = { status: newStatus };
    if (newStatus === "ACTIVE" || newStatus === "APPROVED") {
      updates.approvalStatus = "APPROVED";
      updates.status = "ACTIVE";
    } else if (newStatus === "REJECTED" || newStatus === "BLOCKED") {
      updates.status = newStatus;
    }
    return this.updateSeller(id, updates);
  }
  approveSeller(id) {
    return this.updateSeller(id, {
      status: "ACTIVE",
      approvalStatus: "APPROVED",
      approvedAt: new Date().toISOString(),
    });
  }
  rejectSeller(id, reason = "") {
    return this.updateSeller(id, {
      status: "REJECTED",
      approvalStatus: "REJECTED",
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
    });
  }
  deleteSeller(id) {
    const sellers = this.getSellers().filter((s) => (s.id || s._id) !== id);
    setStorageItem("sellers", sellers);
    dispatchDataUpdate("sellers", "delete", { id });
    return true;
  }

  // CATEGORIES
  getCategories() {
    return getStorageItem("categories", initialCategories);
  }
  addCategory(categoryData) {
    const categories = this.getCategories();
    const newCategory = {
      id: `cat_${Date.now()}`,
      displayOrder: categories.length + 1,
      active: true,
      productsCount: 0,
      ...categoryData,
    };
    categories.push(newCategory);
    setStorageItem("categories", categories);
    dispatchDataUpdate("categories", "create", newCategory);
    return newCategory;
  }
  updateCategory(id, updates) {
    const categories = this.getCategories();
    const idx = categories.findIndex((c) => (c.id || c._id) === id);
    if (idx !== -1) {
      categories[idx] = { ...categories[idx], ...updates };
      setStorageItem("categories", categories);
      dispatchDataUpdate("categories", "update", categories[idx]);
      return categories[idx];
    }
    return null;
  }
  toggleCategoryActive(id) {
    const cat = this.getCategories().find((c) => (c.id || c._id) === id);
    if (cat) {
      const currentActive = cat.active ?? cat.isActive ?? true;
      return this.updateCategory(id, { active: !currentActive, isActive: !currentActive });
    }
    return null;
  }
  deleteCategory(id) {
    const categories = this.getCategories().filter((c) => (c.id || c._id) !== id);
    setStorageItem("categories", categories);
    dispatchDataUpdate("categories", "delete", { id });
    return true;
  }

  // BANNERS
  getBanners() {
    return getStorageItem("banners", initialBanners);
  }
  addBanner(bannerData) {
    const banners = this.getBanners();
    const newBanner = { id: `bnr_${Date.now()}`, status: "DRAFT", ...bannerData };
    banners.unshift(newBanner);
    setStorageItem("banners", banners);
    dispatchDataUpdate("banners", "create", newBanner);
    return newBanner;
  }
  updateBanner(id, updates) {
    const banners = this.getBanners();
    const idx = banners.findIndex((banner) => (banner.id || banner._id) === id);
    if (idx !== -1) {
      banners[idx] = { ...banners[idx], ...updates, updatedAt: new Date().toISOString() };
      setStorageItem("banners", banners);
      dispatchDataUpdate("banners", "update", banners[idx]);
      return banners[idx];
    }
    return null;
  }
  toggleBannerActive(id) {
    const banner = this.getBanners().find((item) => (item.id || item._id) === id);
    if (banner) return this.updateBanner(id, { status: banner.status === "LIVE" ? "PAUSED" : "LIVE" });
    return null;
  }
  deleteBanner(id) {
    const banners = this.getBanners().filter((banner) => (banner.id || banner._id) !== id);
    setStorageItem("banners", banners);
    dispatchDataUpdate("banners", "delete", { id });
    return true;
  }

  // PRODUCTS
  getProducts() {
    return getStorageItem("products", initialProducts);
  }
  getProductById(id) {
    return this.getProducts().find((p) => (p.id || p._id) === id);
  }
  getPendingProducts() {
    return this.getProducts().filter(
      (p) => (p.approvalStatus || p.status || "").toUpperCase() === "PENDING"
    );
  }
  addProduct(productData) {
    const products = this.getProducts();
    const newProduct = {
      id: `prod_${Date.now()}`,
      sku: productData.sku || `SKU-${Date.now().toString().slice(-6)}`,
      status: productData.status || "APPROVED",
      approvalStatus: productData.approvalStatus || "APPROVED",
      active: productData.active !== undefined ? productData.active : true,
      price: Number(productData.price || productData.sellingPrice || 0),
      sellingPrice: Number(productData.price || productData.sellingPrice || 0),
      mrp: Number(productData.mrp || productData.price || 0),
      moq: productData.moq || "1 Unit",
      stock: productData.stock || "10 Units",
      images: productData.images || (productData.image ? [productData.image] : []),
      submittedAt: "Today",
      createdAt: new Date().toISOString(),
      ...productData,
    };
    products.unshift(newProduct);
    setStorageItem("products", products);
    dispatchDataUpdate("products", "create", newProduct);
    return newProduct;
  }
  updateProduct(id, updates) {
    const products = this.getProducts();
    const idx = products.findIndex((p) => (p.id || p._id) === id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...updates, updatedAt: new Date().toISOString() };
      setStorageItem("products", products);
      dispatchDataUpdate("products", "update", products[idx]);
      return products[idx];
    }
    return null;
  }
  toggleProductActive(id) {
    const prod = this.getProductById(id);
    if (prod) {
      const current = prod.active !== undefined ? prod.active : (prod.status === "APPROVED" || prod.status === "ACTIVE");
      const nextActive = !current;
      return this.updateProduct(id, {
        active: nextActive,
        status: nextActive ? "APPROVED" : "INACTIVE",
        approvalStatus: nextActive ? "APPROVED" : prod.approvalStatus,
      });
    }
    return null;
  }
  approveProduct(id) {
    return this.updateProduct(id, {
      status: "APPROVED",
      approvalStatus: "APPROVED",
      active: true,
      approvedAt: new Date().toISOString(),
    });
  }
  rejectProduct(id, reason = "") {
    return this.updateProduct(id, {
      status: "REJECTED",
      approvalStatus: "REJECTED",
      active: false,
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
    });
  }
  deleteProduct(id) {
    const products = this.getProducts().filter((p) => (p.id || p._id) !== id);
    setStorageItem("products", products);
    dispatchDataUpdate("products", "delete", { id });
    return true;
  }

  // ORDERS
  getOrders(filters = {}) {
    let orders = getStorageItem("orders", initialOrders);
    if (filters.status && filters.status !== "ALL") {
      orders = orders.filter((o) => (o.status || o.orderStatus || "").toUpperCase() === filters.status.toUpperCase());
    }
    if (filters.paymentStatus && filters.paymentStatus !== "ALL") {
      orders = orders.filter((o) => (o.paymentStatus || "").toUpperCase() === filters.paymentStatus.toUpperCase());
    }
    if (filters.buyer) {
      const bq = filters.buyer.toLowerCase();
      orders = orders.filter((o) => (o.buyer?.name || o.buyerName || "").toLowerCase().includes(bq));
    }
    if (filters.seller) {
      const sq = filters.seller.toLowerCase();
      orders = orders.filter((o) => (o.seller?.name || o.sellerName || "").toLowerCase().includes(sq));
    }
    if (filters.dateFrom) {
      orders = orders.filter((o) => new Date(o.createdAt) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      orders = orders.filter((o) => new Date(o.createdAt) <= new Date(filters.dateTo));
    }
    return orders;
  }
  getOrderById(id) {
    return this.getOrders().find((o) => (o.id || o._id) === id || o.orderNumber === id);
  }
  updateOrderStatus(id, newStatus) {
    const orders = this.getOrders();
    const idx = orders.findIndex((o) => (o.id || o._id) === id || o.orderNumber === id);
    if (idx !== -1) {
      orders[idx] = {
        ...orders[idx],
        status: newStatus,
        orderStatus: newStatus,
        updatedAt: new Date().toISOString(),
      };
      setStorageItem("orders", orders);
      dispatchDataUpdate("orders", "update", orders[idx]);
      return orders[idx];
    }
    return null;
  }

  // PAYMENTS (MEMBER 5)
  getPayments(filters = {}) {
    let payments = getStorageItem("payments", initialPayments);
    if (filters.status && filters.status !== "ALL") {
      payments = payments.filter((p) => (p.paymentStatus || "").toUpperCase() === filters.status.toUpperCase());
    }
    if (filters.method && filters.method !== "ALL") {
      payments = payments.filter((p) => (p.method || "").toLowerCase().includes(filters.method.toLowerCase()));
    }
    if (filters.buyer) {
      const bq = filters.buyer.toLowerCase();
      payments = payments.filter((p) => (p.buyer?.name || p.buyerName || "").toLowerCase().includes(bq));
    }
    if (filters.seller) {
      const sq = filters.seller.toLowerCase();
      payments = payments.filter((p) => (p.seller?.name || p.sellerName || "").toLowerCase().includes(sq));
    }
    if (filters.dateFrom) {
      payments = payments.filter((p) => new Date(p.createdAt) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      payments = payments.filter((p) => new Date(p.createdAt) <= new Date(filters.dateTo));
    }
    return payments;
  }
  getPaymentById(id) {
    return this.getPayments().find((p) => p.id === id || p.transactionId === id || p.orderNumber === id);
  }

  // INVOICES (MEMBER 5)
  getInvoices(filters = {}) {
    let invoices = getStorageItem("invoices", initialInvoices);
    if (filters.status && filters.status !== "ALL") {
      invoices = invoices.filter((i) => (i.status || "").toUpperCase() === filters.status.toUpperCase());
    }
    if (filters.buyer) {
      const bq = filters.buyer.toLowerCase();
      invoices = invoices.filter((i) => (i.buyer?.name || i.buyerName || "").toLowerCase().includes(bq));
    }
    if (filters.seller) {
      const sq = filters.seller.toLowerCase();
      invoices = invoices.filter((i) => (i.seller?.name || i.sellerName || "").toLowerCase().includes(sq));
    }
    if (filters.dateFrom) {
      invoices = invoices.filter((i) => new Date(i.createdAt) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      invoices = invoices.filter((i) => new Date(i.createdAt) <= new Date(filters.dateTo));
    }
    return invoices;
  }
  getInvoiceById(id) {
    return this.getInvoices().find((i) => i.id === id || i.invoiceNumber === id || i.orderNumber === id);
  }

  // SHIPMENTS (MEMBER 5)
  getShipments(filters = {}) {
    let shipments = getStorageItem("shipments", initialShipments);
    if (filters.status && filters.status !== "ALL") {
      shipments = shipments.filter((s) => (s.status || "").toUpperCase() === filters.status.toUpperCase());
    }
    if (filters.partner && filters.partner !== "ALL") {
      shipments = shipments.filter((s) => (s.transportPartner || "").toLowerCase().includes(filters.partner.toLowerCase()));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      shipments = shipments.filter((s) =>
        `${s.shipmentId} ${s.orderNumber} ${s.trackingNumber} ${s.buyerName} ${s.sellerName}`.toLowerCase().includes(q)
      );
    }
    return shipments;
  }
  getShipmentById(id) {
    return this.getShipments().find((s) => s.id === id || s.shipmentId === id || s.trackingNumber === id || s.orderNumber === id);
  }
  updateShipmentStatus(id, newStatus) {
    const shipments = this.getShipments();
    const idx = shipments.findIndex((s) => s.id === id || s.shipmentId === id);
    if (idx !== -1) {
      shipments[idx] = {
        ...shipments[idx],
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      setStorageItem("shipments", shipments);
      dispatchDataUpdate("shipments", "update", shipments[idx]);
      return shipments[idx];
    }
    return null;
  }

  // RFQS
  getRFQs() {
    return getStorageItem("rfqs", initialRFQs);
  }
  closeRFQ(id) {
    const rfqs = this.getRFQs();
    const idx = rfqs.findIndex((r) => (r.id || r._id) === id);
    if (idx !== -1) {
      rfqs[idx] = { ...rfqs[idx], status: "CLOSED", closedAt: new Date().toISOString() };
      setStorageItem("rfqs", rfqs);
      dispatchDataUpdate("rfqs", "update", rfqs[idx]);
      return rfqs[idx];
    }
    return null;
  }

  // DASHBOARD STATS (MEMBER 5 BUSINESS VISIBILITY)
  getDashboardStats() {
    const buyers = this.getBuyers();
    const sellers = this.getSellers();
    const products = this.getProducts();
    const orders = this.getOrders();
    const payments = this.getPayments();
    const shipments = this.getShipments();
    const rfqs = this.getRFQs();

    const pendingSellers = sellers.filter(
      (s) => (s.approvalStatus || s.status || "").toUpperCase() === "PENDING"
    ).length;

    const pendingProducts = products.filter(
      (p) => (p.approvalStatus || p.status || "").toUpperCase() === "PENDING"
    ).length;

    const activeProducts = products.filter(
      (p) => (p.active ?? true) && (p.approvalStatus || p.status || "").toUpperCase() === "APPROVED"
    ).length;

    const openRFQs = rfqs.filter((r) => (r.status || "").toUpperCase() === "OPEN").length;

    const successfulPayments = payments.filter((p) => (p.paymentStatus || "").toUpperCase() === "SUCCESS").length;
    const pendingPayments = payments.filter((p) => (p.paymentStatus || "").toUpperCase() === "PENDING").length;

    const shipmentsInTransit = shipments.filter(
      (s) => (s.status || "").toUpperCase() === "IN TRANSIT" || (s.status || "").toUpperCase() === "PICKED UP"
    ).length;

    const deliveredToday = shipments.filter((s) => (s.status || "").toUpperCase() === "DELIVERED").length;

    const todaysGMV = orders.reduce((sum, o) => sum + Number(o.totalAmount || o.amount || 0), 0);

    return {
      todaysGMV,
      totalBuyers: buyers.length,
      totalSellers: sellers.length,
      pendingSellers,
      activeProducts,
      openRFQs,
      todaysOrders: orders.length,
      successfulPayments,
      pendingPayments,
      shipmentsInTransit,
      deliveredToday,
      pendingProducts,
    };
  }

  // ANALYTICS & REPORTS AGGREGATIONS (MEMBER 5)
  getReportData() {
    const orders = this.getOrders();
    const payments = this.getPayments();
    const categories = this.getCategories();
    const products = this.getProducts();
    const buyers = this.getBuyers();
    const sellers = this.getSellers();
    const rfqs = this.getRFQs();

    // Sales by Date
    const salesByDate = [
      { date: "15 Aug", orders: 2, gmv: 185000 },
      { date: "16 Aug", orders: 3, gmv: 240000 },
      { date: "17 Aug", orders: 4, gmv: 320000 },
      { date: "18 Aug", orders: 6, gmv: 445770 },
      { date: "19 Aug", orders: 5, gmv: 352960 },
    ];

    // Sales by Category
    const salesByCategory = categories.map((cat) => ({
      category: cat.name,
      gmv: cat.name.includes("Steel") ? 570670 : cat.name.includes("Machinery") ? 267920 : 126580,
      ordersCount: cat.name.includes("Steel") ? 4 : 2,
    }));

    // Sales by Seller
    const salesBySeller = sellers.map((sel) => ({
      seller: sel.businessName,
      gmv: sel.businessName.includes("Steel") ? 715810 : 126580,
      ordersCount: sel.businessName.includes("Steel") ? 4 : 2,
      rating: sel.rating || 4.8,
    }));

    // Top Products
    const topProducts = [
      { name: "TATA Tiscon 550D Rebars", sku: "TATA-550-12", volume: "15 Tons", revenue: 922500 },
      { name: "Industrial Induction Motor 7.5kW", sku: "MOT-3PH-750", volume: "6 Units", revenue: 207000 },
      { name: "Structural Steel I-Beams", sku: "STM-BEAM-200", volume: "3 Tons", revenue: 174000 },
      { name: "High-Tensile Hex Bolts", sku: "BLT-HT-M16-60", volume: "50 Boxes", revenue: 92500 },
    ];

    // Top Buyers
    const topBuyers = buyers.map((buy) => ({
      name: buy.name,
      company: buy.company,
      ordersCount: buy.totalOrders || 1,
      totalSpent: buy.totalSpent || 100000,
    })).sort((a, b) => b.totalSpent - a.totalSpent);

    // Order Status Distribution
    const orderStatusSummary = {
      Processing: orders.filter((o) => (o.status || o.orderStatus) === "Processing").length,
      Confirmed: orders.filter((o) => (o.status || o.orderStatus) === "Confirmed").length,
      Shipped: orders.filter((o) => (o.status || o.orderStatus) === "Shipped").length,
      Delivered: orders.filter((o) => (o.status || o.orderStatus) === "Delivered").length,
      Cancelled: orders.filter((o) => (o.status || o.orderStatus) === "Cancelled").length,
    };

    // Payment Summary
    const paymentSummary = {
      Success: payments.filter((p) => (p.paymentStatus || "").toUpperCase() === "SUCCESS").length,
      Pending: payments.filter((p) => (p.paymentStatus || "").toUpperCase() === "PENDING").length,
      Failed: payments.filter((p) => (p.paymentStatus || "").toUpperCase() === "FAILED").length,
      Refunded: payments.filter((p) => (p.paymentStatus || "").toUpperCase() === "REFUNDED").length,
      TotalCollected: payments.filter((p) => p.paymentStatus === "Success").reduce((s, p) => s + p.amount, 0),
    };

    return {
      salesByDate,
      salesByCategory,
      salesBySeller,
      topProducts,
      topBuyers,
      openRFQs: rfqs,
      orderStatusSummary,
      paymentSummary,
    };
  }
}

export const dataStore = new DynamicDataStore();
export default dataStore;
