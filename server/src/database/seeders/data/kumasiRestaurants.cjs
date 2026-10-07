"use strict";

// Fictional demo data for Kumasi. Names, menus and people are made up. Prices are in pesewas.

// Every demo account uses this password (development only)
const DEMO_PASSWORD = "Demo2026";

// Builds 7 days of hours; closedDays uses 0 = Sunday ... 6 = Saturday
const week = (opensAt, closesAt, closedDays = []) => {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
    const isClosed = closedDays.includes(dayOfWeek);
    return {
      dayOfWeek,
      isClosed,
      opensAt: isClosed ? null : opensAt,
      closesAt: isClosed ? null : closesAt,
    };
  });
};

// ─────────────────────────────────────────────
// Reusable option groups
// ─────────────────────────────────────────────
const proteinChoice = {
  name: "Protein",
  minSelect: 1,
  maxSelect: 1,
  options: [
    { name: "Chicken", extraPricePesewas: 0 },
    { name: "Fried Fish", extraPricePesewas: 500 },
    { name: "Beef", extraPricePesewas: 700 },
  ],
};

const ghanaianExtras = {
  name: "Extras",
  minSelect: 0,
  maxSelect: 3,
  options: [
    { name: "Boiled Egg", extraPricePesewas: 300 },
    { name: "Shito", extraPricePesewas: 200 },
    { name: "Fried Plantain", extraPricePesewas: 500 },
    { name: "Wele", extraPricePesewas: 600 },
  ],
};

// ─────────────────────────────────────────────
// Demo people
// ─────────────────────────────────────────────
const users = [
  {
    key: "akua",
    fullName: "Akua Mensah",
    email: "akua.owner@example.com",
    phone: "+233240000001",
    role: "RESTAURANT_OWNER",
    status: "ACTIVE",
  },
  {
    key: "kwabena",
    fullName: "Kwabena Owusu",
    email: "kwabena.owner@example.com",
    phone: "+233240000002",
    role: "RESTAURANT_OWNER",
    status: "ACTIVE",
  },
  {
    key: "yaa",
    fullName: "Yaa Asantewaa Boateng",
    email: "yaa.owner@example.com",
    phone: "+233240000003",
    role: "RESTAURANT_OWNER",
    status: "PENDING_APPROVAL",
  },
  {
    key: "kofi",
    fullName: "Kofi Adjei",
    email: "kofi.customer@example.com",
    phone: "+233240000004",
    role: "CUSTOMER",
    status: "ACTIVE",
  },
];

// ─────────────────────────────────────────────
// Restaurants with their menus
// ─────────────────────────────────────────────
const restaurants = [
  {
    ownerKey: "akua",
    name: "Maame Akua's Chop Bar",
    legalName: "Maame Akua Foods Enterprise",
    description: "Traditional Asante cooking: fufu, light soup and banku, served hot every day.",
    phone: "+233240000101",
    cuisineTags: ["ghanaian", "soups", "local"],
    addressLine: "14 Prempeh II Street",
    area: "Adum",
    latitude: 6.6885,
    longitude: -1.6244,
    status: "APPROVED",
    prepTimeMinutes: 25,
    minOrderPesewas: 2000,
    openingHours: week("07:00", "21:00", [0]),
    menu: [
      {
        category: "Soups and Fufu",
        items: [
          {
            name: "Fufu with Light Soup and Goat",
            description: "Pounded cassava and plantain in spicy tomato light soup.",
            pricePesewas: 6500,
            tags: ["spicy"],
          },
          {
            name: "Fufu with Groundnut Soup and Chicken",
            description: "Rich peanut soup with tender chicken.",
            pricePesewas: 6000,
            tags: ["contains_nuts"],
          },
          {
            name: "Banku with Okro Stew",
            description: "Fermented corn dough with okro and fish stew.",
            pricePesewas: 4500,
            tags: [],
          },
        ],
      },
      {
        category: "Drinks",
        items: [
          {
            name: "Sobolo",
            description: "Chilled hibiscus drink.",
            pricePesewas: 1000,
            tags: ["vegan"],
          },
          {
            name: "Asaana",
            description: "Caramelised corn drink.",
            pricePesewas: 1000,
            tags: ["vegan"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "akua",
    name: "Bantama Waakye Joint",
    legalName: "Maame Akua Foods Enterprise",
    description: "Morning waakye with all the sides. Come early, it finishes fast!",
    phone: "+233240000102",
    cuisineTags: ["ghanaian", "breakfast"],
    addressLine: "Bantama High Street, near the market",
    area: "Bantama",
    latitude: 6.703,
    longitude: -1.634,
    status: "APPROVED",
    prepTimeMinutes: 10,
    minOrderPesewas: 1500,
    openingHours: week("06:00", "14:00"),
    menu: [
      {
        category: "Waakye",
        items: [
          {
            name: "Waakye Special",
            description: "Rice and beans with spaghetti, gari, egg and shito.",
            pricePesewas: 3500,
            tags: ["spicy"],
            dailyStock: 60,
            optionGroups: [ghanaianExtras],
          },
          {
            name: "Waakye with Wele and Fish",
            description: "Today's batch is finished.",
            pricePesewas: 4000,
            tags: ["spicy"],
            isAvailable: false,
          },
        ],
      },
    ],
  },
  {
    ownerKey: "akua",
    name: "Garden City Grills",
    legalName: "Garden City Grills Limited",
    description: "Late-night grilled tilapia, chicken and kebabs.",
    phone: "+233240000103",
    cuisineTags: ["grills", "ghanaian"],
    addressLine: "Ahodwo Roundabout, opposite the filling station",
    area: "Ahodwo",
    latitude: 6.665,
    longitude: -1.62,
    status: "APPROVED",
    prepTimeMinutes: 30,
    minOrderPesewas: 3000,
    deliveryRadiusKm: 7,
    // Crosses midnight: open 18:00 until 02:00 the next morning
    openingHours: week("18:00", "02:00", [1]),
    menu: [
      {
        category: "Grills",
        items: [
          {
            name: "Grilled Tilapia with Banku",
            description: "Whole tilapia, pepper sauce and banku.",
            pricePesewas: 8500,
            tags: ["spicy"],
            optionGroups: [
              {
                name: "Fish Size",
                minSelect: 1,
                maxSelect: 1,
                options: [
                  { name: "Medium", extraPricePesewas: 0 },
                  { name: "Large", extraPricePesewas: 2000 },
                ],
              },
            ],
          },
          {
            name: "Chicken Kebab (3 sticks)",
            description: "Spiced chicken skewers with onions.",
            pricePesewas: 3000,
            tags: ["spicy", "halal"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "akua",
    name: "Campus Bites",
    legalName: "Campus Bites Ventures",
    description: "Burgers, fries and shakes for hungry students near KNUST.",
    phone: "+233240000104",
    cuisineTags: ["fast food", "burgers"],
    addressLine: "Ayeduase Road, near the hostels",
    area: "Ayeduase",
    latitude: 6.67,
    longitude: -1.56,
    status: "APPROVED",
    prepTimeMinutes: 15,
    minOrderPesewas: 2500,
    openingHours: week("10:00", "23:00"),
    menu: [
      {
        category: "Burgers",
        items: [
          {
            name: "Classic Beef Burger",
            description: "Beef patty, lettuce, tomato and house sauce.",
            pricePesewas: 5500,
            tags: [],
            optionGroups: [
              {
                name: "Make it a combo",
                minSelect: 0,
                maxSelect: 1,
                options: [
                  { name: "Fries and Soft Drink", extraPricePesewas: 2500 },
                  { name: "Yam Chips and Sobolo", extraPricePesewas: 2500 },
                ],
              },
            ],
          },
          {
            name: "Veggie Burger",
            description: "Bean and vegetable patty.",
            pricePesewas: 4500,
            tags: ["vegetarian"],
          },
        ],
      },
      {
        category: "Sides",
        items: [
          {
            name: "Fries",
            description: "Crispy potato fries.",
            pricePesewas: 1500,
            tags: ["vegan"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "akua",
    name: "Golden Pot Kitchen",
    legalName: "Golden Pot Catering Services",
    description: "Party-style jollof, fried rice and red red.",
    phone: "+233240000105",
    cuisineTags: ["ghanaian", "rice"],
    addressLine: "Asokwa Industrial Area, Gate 2",
    area: "Asokwa",
    latitude: 6.667,
    longitude: -1.6,
    status: "APPROVED",
    prepTimeMinutes: 20,
    minOrderPesewas: 2500,
    openingHours: week("09:00", "22:00"),
    menu: [
      {
        category: "Rice Dishes",
        items: [
          {
            name: "Jollof with Protein",
            description: "Smoky party jollof with your choice of protein.",
            pricePesewas: 4500,
            tags: ["spicy"],
            optionGroups: [proteinChoice, ghanaianExtras],
          },
          {
            name: "Fried Rice with Protein",
            description: "Vegetable fried rice with your choice of protein.",
            pricePesewas: 4500,
            tags: [],
            optionGroups: [proteinChoice, ghanaianExtras],
          },
        ],
      },
      {
        category: "Beans",
        items: [
          {
            name: "Red Red with Plantain",
            description: "Bean stew in palm oil with fried ripe plantain.",
            pricePesewas: 3000,
            tags: ["vegan"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "kwabena",
    name: "Nhyiaeso Pizza Co.",
    legalName: "Owusu Pizza Company Limited",
    description: "Wood-fired pizzas. Temporarily closed for repairs.",
    phone: "+233240000201",
    cuisineTags: ["pizza", "italian"],
    addressLine: "Nhyiaeso Residential Area, off Hospital Road",
    area: "Nhyiaeso",
    latitude: 6.675,
    longitude: -1.635,
    status: "APPROVED",
    // The owner switched off orders: always shows as closed
    isAcceptingOrders: false,
    prepTimeMinutes: 25,
    minOrderPesewas: 5000,
    openingHours: week("11:00", "22:00"),
    menu: [
      {
        category: "Pizzas",
        items: [
          {
            name: "Margherita",
            description: "Tomato, mozzarella and basil.",
            pricePesewas: 9000,
            tags: ["vegetarian"],
          },
          {
            name: "Suya Pizza",
            description: "Spicy suya beef with onions and peppers.",
            pricePesewas: 11000,
            tags: ["spicy", "contains_nuts"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "kwabena",
    name: "Suame Rice Bowl",
    legalName: "Owusu Rice Bowl Enterprise",
    description: "Suspended: hidden from customers.",
    phone: "+233240000202",
    cuisineTags: ["rice"],
    addressLine: "Suame Magazine Road",
    area: "Suame",
    latitude: 6.725,
    longitude: -1.63,
    status: "SUSPENDED",
    openingHours: week("08:00", "20:00"),
    menu: [
      {
        category: "Rice",
        items: [{ name: "Plain Rice and Stew", description: "", pricePesewas: 2500, tags: [] }],
      },
    ],
  },
  {
    ownerKey: "yaa",
    name: "Santasi Kenkey House",
    legalName: "Yaa Boateng Kenkey Enterprise",
    description: "Waiting for admin approval: hidden from customers.",
    phone: "+233240000301",
    cuisineTags: ["ghanaian"],
    addressLine: "Santasi Roundabout",
    area: "Santasi",
    latitude: 6.665,
    longitude: -1.655,
    status: "PENDING_APPROVAL",
    openingHours: week("07:00", "19:00", [0]),
    menu: [],
  },
  {
    ownerKey: "yaa",
    name: "Kejetia Kelewele Corner",
    legalName: "Yaa Boateng Snacks",
    description: "Rejected: shows the owner why.",
    phone: "+233240000302",
    cuisineTags: ["snacks"],
    addressLine: "Kejetia Market, Block C",
    area: "Kejetia",
    latitude: 6.696,
    longitude: -1.623,
    status: "REJECTED",
    rejectionReason: "The FDA certificate photo is blurry. Please upload a clear copy.",
    openingHours: week("16:00", "23:00"),
    menu: [],
  },
];

module.exports = { DEMO_PASSWORD, users, restaurants };
