"use strict";

// Fictional demo data for Kumasi. Names, menus and people are made up. Prices are in pesewas.
// cover / photo: a file in data/photos (without .webp), credited in data/photos/credits.json

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
    cover: "cover-chop-bar",
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
            photo: "fufu-light-soup",
            description: "Pounded cassava and plantain in spicy tomato light soup.",
            pricePesewas: 6500,
            tags: ["spicy"],
          },
          {
            name: "Fufu with Groundnut Soup and Chicken",
            photo: "fufu-groundnut-soup",
            description: "Rich peanut soup with tender chicken.",
            pricePesewas: 6000,
            tags: ["contains_nuts"],
          },
          {
            name: "Banku with Okro Stew",
            photo: "banku-okro",
            description: "Fermented corn dough with okro and fish stew.",
            pricePesewas: 4500,
            tags: [],
          },
          {
            name: "Fufu with Palm Nut Soup",
            photo: "abenkwan",
            description: "Abenkwan with smoked fish and crab, pounded fresh.",
            pricePesewas: 6000,
            tags: [],
          },
          {
            name: "Omo Tuo with Groundnut Soup",
            photo: "omo-tuo",
            description: "Soft rice balls in rich peanut soup with chicken.",
            pricePesewas: 5000,
            tags: ["contains_nuts"],
          },
          {
            name: "Ampesi with Kontomire Stew",
            photo: "ampesi-kontomire",
            description: "Boiled yam and plantain with cocoyam-leaf stew and egg.",
            pricePesewas: 4000,
            tags: ["vegetarian"],
          },
        ],
      },
      {
        category: "Drinks",
        items: [
          {
            name: "Sobolo",
            photo: "sobolo",
            description: "Chilled hibiscus drink.",
            pricePesewas: 1000,
            tags: ["vegan"],
          },
          {
            name: "Asaana",
            photo: "asaana",
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
    cover: "cover-waakye",
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
            photo: "waakye-special",
            description: "Rice and beans with spaghetti, gari, egg and shito.",
            pricePesewas: 3500,
            tags: ["spicy"],
            dailyStock: 60,
            optionGroups: [ghanaianExtras],
          },
          {
            name: "Waakye with Wele and Fish",
            photo: "waakye-wele-fish",
            description: "Today's batch is finished.",
            pricePesewas: 4000,
            tags: ["spicy"],
            isAvailable: false,
          },
        ],
      },
      {
        category: "Breakfast",
        items: [
          {
            name: "Hausa Koko with Koose",
            photo: "hausa-koko",
            description: "Spiced millet porridge with bean fritters.",
            pricePesewas: 1500,
            tags: ["vegan", "spicy"],
          },
          {
            name: "Bofrot (5 pieces)",
            photo: "bofrot",
            description: "Sweet Ghanaian doughnuts, fried this morning.",
            pricePesewas: 1000,
            tags: ["vegetarian"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "akua",
    name: "Garden City Grills",
    cover: "cover-grills",
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
            photo: "tilapia-banku",
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
            photo: "chicken-kebab",
            description: "Spiced chicken skewers with onions.",
            pricePesewas: 3000,
            tags: ["spicy", "halal"],
          },
          {
            name: "Beef Suya",
            photo: "suya",
            description: "Thin-sliced beef with suya spice, onions and tomato.",
            pricePesewas: 4000,
            tags: ["spicy", "contains_nuts"],
          },
          {
            name: "Grilled Chicken with Fries",
            photo: "grilled-chicken-fries",
            description: "Quarter chicken, peri-peri glaze and crispy fries.",
            pricePesewas: 6500,
            tags: ["spicy"],
          },
          {
            name: "Kelewele",
            photo: "kelewele",
            description: "Ginger-spiced fried ripe plantain.",
            pricePesewas: 1500,
            tags: ["vegan", "spicy"],
          },
        ],
      },
      {
        category: "Drinks",
        items: [
          {
            name: "Fresh Coconut",
            photo: "coconut",
            description: "Cold coconut, opened for you.",
            pricePesewas: 1200,
            tags: ["vegan"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "akua",
    name: "Campus Bites",
    cover: "cover-burgers",
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
            photo: "beef-burger",
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
            photo: "veggie-burger",
            description: "Bean and vegetable patty.",
            pricePesewas: 4500,
            tags: ["vegetarian"],
          },
          {
            name: "Chicken Shawarma",
            photo: "shawarma",
            description: "Grilled chicken, cabbage and garlic sauce in pitta.",
            pricePesewas: 4500,
            tags: ["halal"],
          },
        ],
      },
      {
        category: "Sides",
        items: [
          {
            name: "Fries",
            photo: "fries",
            description: "Crispy potato fries.",
            pricePesewas: 1500,
            tags: ["vegan"],
          },
        ],
      },
      {
        category: "Shakes",
        items: [
          {
            name: "Chocolate Milkshake",
            photo: "milkshake",
            description: "Thick and cold, made with real ice cream.",
            pricePesewas: 3000,
            tags: ["vegetarian"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "akua",
    name: "Golden Pot Kitchen",
    cover: "cover-jollof",
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
            photo: "jollof",
            description: "Smoky party jollof with your choice of protein.",
            pricePesewas: 4500,
            tags: ["spicy"],
            optionGroups: [proteinChoice, ghanaianExtras],
          },
          {
            name: "Fried Rice with Protein",
            photo: "fried-rice",
            description: "Vegetable fried rice with your choice of protein.",
            pricePesewas: 4500,
            tags: [],
            optionGroups: [proteinChoice, ghanaianExtras],
          },
          {
            name: "Jollof Spaghetti",
            photo: "jollof-spaghetti",
            description: "Spaghetti cooked in spicy jollof sauce.",
            pricePesewas: 4000,
            tags: ["spicy"],
          },
          {
            name: "Gari Foto with Egg",
            photo: "gari-foto",
            description: "Gari soaked in tomato stew with scrambled egg.",
            pricePesewas: 2500,
            tags: ["vegetarian"],
          },
        ],
      },
      {
        category: "Beans",
        items: [
          {
            name: "Red Red with Plantain",
            photo: "red-red",
            description: "Bean stew in palm oil with fried ripe plantain.",
            pricePesewas: 3000,
            tags: ["vegan"],
          },
        ],
      },
      {
        category: "Drinks",
        items: [
          {
            name: "Pineapple Juice",
            photo: "pineapple-juice",
            description: "Freshly pressed, no sugar added.",
            pricePesewas: 1500,
            tags: ["vegan"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "kwabena",
    name: "Nhyiaeso Pizza Co.",
    cover: "cover-pizza",
    legalName: "Owusu Pizza Company Limited",
    description: "Wood-fired pizzas with Ghanaian twists, like our famous suya pizza.",
    phone: "+233240000201",
    cuisineTags: ["pizza", "italian"],
    addressLine: "Nhyiaeso Residential Area, off Hospital Road",
    area: "Nhyiaeso",
    latitude: 6.675,
    longitude: -1.635,
    status: "APPROVED",
    prepTimeMinutes: 25,
    minOrderPesewas: 5000,
    openingHours: week("11:00", "22:00"),
    menu: [
      {
        category: "Pizzas",
        items: [
          {
            name: "Margherita",
            photo: "margherita",
            description: "Tomato, mozzarella and basil.",
            pricePesewas: 9000,
            tags: ["vegetarian"],
          },
          {
            name: "Suya Pizza",
            photo: "suya-pizza",
            description: "Spicy suya beef with onions and peppers.",
            pricePesewas: 11000,
            tags: ["spicy", "contains_nuts"],
          },
          {
            name: "Pepperoni",
            photo: "pepperoni",
            description: "Pepperoni and mozzarella on tomato sauce.",
            pricePesewas: 10000,
            tags: [],
          },
          {
            name: "BBQ Chicken",
            photo: "bbq-chicken-pizza",
            description: "Smoky barbecue chicken, onions and peppers.",
            pricePesewas: 10500,
            tags: [],
          },
        ],
      },
      {
        category: "Sides",
        items: [
          {
            name: "Garlic Bread",
            photo: "garlic-bread",
            description: "Toasted with garlic butter and herbs.",
            pricePesewas: 2500,
            tags: ["vegetarian"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "akua",
    name: "Asafo Kenkey House",
    cover: "cover-asafo",
    legalName: "Maame Akua Foods Enterprise",
    description: "Fante and Ga kenkey with fried fish, hot pepper and shito, the Asafo way.",
    phone: "+233240000106",
    cuisineTags: ["ghanaian", "local"],
    addressLine: "Asafo Market Road, near the lorry station",
    area: "Asafo",
    latitude: 6.689,
    longitude: -1.613,
    status: "APPROVED",
    prepTimeMinutes: 15,
    minOrderPesewas: 2000,
    openingHours: week("07:00", "21:00"),
    menu: [
      {
        category: "Kenkey",
        items: [
          {
            name: "Fante Kenkey with Fried Fish",
            photo: "fante-kenkey-fried-fish",
            description: "Two balls of Fante kenkey, fried fish and fresh pepper.",
            pricePesewas: 3500,
            tags: ["spicy"],
          },
          {
            name: "Ga Kenkey with Shito",
            photo: "ga-kenkey-shito",
            description: "Ga kenkey with herrings, shito and ground pepper.",
            pricePesewas: 3000,
            tags: ["spicy"],
          },
          {
            name: "Kenkey with Grilled Tilapia",
            photo: "kenkey-tilapia",
            description: "Kenkey with a whole grilled tilapia and pepper sauce.",
            pricePesewas: 6000,
            tags: ["spicy"],
          },
          {
            name: "Extra Kenkey Ball",
            photo: "fante-kenkey",
            description: "One more ball of Fante kenkey.",
            pricePesewas: 800,
            tags: ["vegan"],
          },
        ],
      },
      {
        category: "Sides",
        items: [
          {
            name: "Fried Yam with Pepper",
            photo: "fried-yam-pepper",
            description: "Crispy yam chips with hot pepper sauce.",
            pricePesewas: 2000,
            tags: ["vegan", "spicy"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "akua",
    name: "Tafo Northern Flavours",
    cover: "cover-northern",
    legalName: "Maame Akua Foods Enterprise",
    description: "Tuo zaafi, ayoyo and the tastes of the north, cooked by a Tamale family.",
    phone: "+233240000107",
    cuisineTags: ["ghanaian", "local", "soups"],
    addressLine: "Tafo Nhyiaeso, opposite the mosque",
    area: "Tafo",
    latitude: 6.735,
    longitude: -1.611,
    status: "APPROVED",
    prepTimeMinutes: 20,
    minOrderPesewas: 2000,
    openingHours: week("09:00", "21:00", [5]),
    menu: [
      {
        category: "Tuo Zaafi",
        items: [
          {
            name: "Tuo Zaafi with Ayoyo Soup",
            photo: "tuo-zaafi-ayoyo",
            description: "Soft TZ with green ayoyo soup and wagashi.",
            pricePesewas: 3500,
            tags: [],
          },
          {
            name: "Tuo Zaafi with Light Soup",
            photo: "tuo-zaafi-soup",
            description: "TZ with spicy light soup and goat meat.",
            pricePesewas: 4000,
            tags: ["spicy"],
          },
        ],
      },
      {
        category: "Grills and Sides",
        items: [
          {
            name: "Fried Yam with Grilled Chicken",
            photo: "fried-yam-chicken",
            description: "Fried yam, grilled chicken and green chilli sauce.",
            pricePesewas: 5500,
            tags: ["spicy"],
          },
          {
            name: "Kosai (6 pieces)",
            photo: "kosai",
            description: "Bean fritters, crisp outside and soft inside.",
            pricePesewas: 1200,
            tags: ["vegan"],
          },
        ],
      },
      {
        category: "Drinks",
        items: [
          {
            name: "Fura de Nunu",
            photo: "fura",
            description: "Millet balls in cold fresh milk.",
            pricePesewas: 1500,
            tags: ["vegetarian"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "kwabena",
    name: "Amakom Asian Kitchen",
    cover: "cover-asian",
    legalName: "Owusu Pizza Company Limited",
    description: "Chinese-style stir fries, noodles and spring rolls, cooked to order.",
    phone: "+233240000203",
    cuisineTags: ["chinese", "rice"],
    addressLine: "Amakom Junction, upstairs from the pharmacy",
    area: "Amakom",
    latitude: 6.692,
    longitude: -1.605,
    status: "APPROVED",
    prepTimeMinutes: 20,
    minOrderPesewas: 3000,
    openingHours: week("11:00", "22:00"),
    menu: [
      {
        category: "Mains",
        items: [
          {
            name: "Stir-fried Noodles with Chicken",
            photo: "stir-fried-noodles",
            description: "Wok-tossed noodles with chicken and vegetables.",
            pricePesewas: 5000,
            tags: [],
          },
          {
            name: "Sweet and Sour Chicken",
            photo: "sweet-sour-chicken",
            description: "Crispy chicken in sweet and sour sauce, with rice.",
            pricePesewas: 5500,
            tags: [],
          },
          {
            name: "Chicken Stir Fry with Rice",
            photo: "chicken-stir-fry",
            description: "Chicken, peppers and onions on steamed rice.",
            pricePesewas: 5000,
            tags: ["spicy"],
          },
          {
            name: "Egg Fried Rice",
            photo: "egg-fried-rice",
            description: "Fried rice with a fried egg on top.",
            pricePesewas: 3500,
            tags: ["vegetarian"],
          },
        ],
      },
      {
        category: "Starters",
        items: [
          {
            name: "Spring Rolls (4 pieces)",
            photo: "spring-rolls",
            description: "Vegetable spring rolls with sweet chilli dip.",
            pricePesewas: 2500,
            tags: ["vegetarian"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "kwabena",
    name: "Patasi Pastries & Smoothies",
    cover: "cover-pastries",
    legalName: "Owusu Pizza Company Limited",
    description: "Fresh meat pies, sausage rolls, cakes and cold smoothies every day.",
    phone: "+233240000204",
    cuisineTags: ["pastries", "drinks", "breakfast"],
    addressLine: "Patasi Estate Road, near the junction",
    area: "Patasi",
    latitude: 6.676,
    longitude: -1.652,
    status: "APPROVED",
    prepTimeMinutes: 10,
    minOrderPesewas: 1500,
    openingHours: week("07:00", "20:00"),
    menu: [
      {
        category: "Pastries",
        items: [
          {
            name: "Meat Pie",
            photo: "meat-pie",
            description: "Flaky pastry filled with spiced minced beef.",
            pricePesewas: 1200,
            tags: [],
          },
          {
            name: "Sausage Roll",
            photo: "sausage-roll",
            description: "Golden puff pastry with a beef sausage.",
            pricePesewas: 1000,
            tags: [],
          },
          {
            name: "Sugar Doughnut",
            photo: "sugar-doughnut",
            description: "Soft doughnut rolled in sugar.",
            pricePesewas: 600,
            tags: ["vegetarian"],
          },
          {
            name: "Chocolate Cake Slice",
            photo: "chocolate-cake",
            description: "Rich chocolate cake with ganache.",
            pricePesewas: 2500,
            tags: ["vegetarian"],
          },
        ],
      },
      {
        category: "Smoothies and Juice",
        items: [
          {
            name: "Green Fruit Smoothie",
            photo: "fruit-smoothie",
            description: "Kiwi, banana and pineapple, blended cold.",
            pricePesewas: 2500,
            tags: ["vegan"],
          },
          {
            name: "Fresh Mango Juice",
            photo: "mango-juice",
            description: "Kumasi mangoes, pressed today.",
            pricePesewas: 1500,
            tags: ["vegan"],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "kwabena",
    name: "Suame Rice Bowl",
    cover: "cover-rice",
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
        items: [
          {
            name: "Plain Rice and Stew",
            photo: "rice-stew",
            description: "",
            pricePesewas: 2500,
            tags: [],
          },
        ],
      },
    ],
  },
  {
    ownerKey: "yaa",
    name: "Santasi Kenkey House",
    cover: "cover-kenkey",
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
    cover: "cover-kelewele",
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
