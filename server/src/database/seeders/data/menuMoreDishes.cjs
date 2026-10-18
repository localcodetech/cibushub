"use strict";

// Even fuller demo menus: about 20 foods (drinks not counted) in every approved restaurant,
// so visitors have plenty to choose from. Added after data/menuAdditions.cjs.
//
// The extra dishes are ones another demo restaurant already sells (in Kumasi many kitchens
// sell jollof, kelewele or banku), so each one comes with its photo, description, price and
// options. Only dishes that suit the kind of kitchen are listed: no pizza at the chop bar.
// A name that isn't on any menu stops the seeder with an error, so a typo can't slip by.

// restaurant name -> [[category, [dish names]]]
const moreDishes = {
  "Maame Akua's Chop Bar": [
    [
      "Soups and Fufu",
      [
        "Mpotompoto",
        "Yam with Kontomire Stew",
        "Boiled Yam with Egg Stew",
        "Oto with Boiled Eggs",
        "Plantain, Stew and Avocado",
        "Red Red with Plantain",
      ],
    ],
    ["Sides", ["Kelewele", "Fried Plantain"]],
  ],
  "Bantama Waakye Joint": [
    [
      "Rice",
      [
        "Jollof with Chicken",
        "Jollof Spaghetti",
        "Rice and Beef Stew",
        "Plain Rice and Stew",
        "Red Red with Plantain",
      ],
    ],
    ["Breakfast", ["Sugar Doughnut", "Egg Sandwich", "Oats Porridge", "Agbeli Kaklo (4 pieces)"]],
    ["Sides", ["Fried Plantain", "Kelewele", "Fried Yam with Pepper"]],
  ],
  "Garden City Grills": [
    [
      "Grills",
      [
        "Grilled Whole Fish",
        "Grilled Prawns",
        "Grilled Steak with Vegetables",
        "Grilled Sausages with Fries",
        "Fried Yam with Grilled Chicken",
        "Spicy Chicken Wings (6)",
        "Kenkey with Grilled Tilapia",
        "Banku with Grilled Tilapia",
      ],
    ],
    ["Sides", ["Fries", "Loaded Fries", "Agbeli Kaklo (4 pieces)"]],
  ],
  "Campus Bites": [
    ["Burgers", ["Grilled Sausages with Fries"]],
    ["Sides", ["Kelewele"]],
    [
      "Rice",
      [
        "Jollof Spaghetti",
        "Egg Fried Rice",
        "Waakye Special",
        "Jollof with Fried Fish and Plantain",
      ],
    ],
    ["Snacks", ["Meat Pie", "Sausage Roll", "Plantain Chips", "Spring Rolls (4 pieces)"]],
  ],
  "Golden Pot Kitchen": [
    ["Rice Dishes", ["Waakye Special", "Egg Fried Rice", "Jollof with Chicken"]],
    [
      "Local Dishes",
      [
        "Banku with Okro Stew",
        "Ampesi with Kontomire Stew",
        "Omo Tuo with Groundnut Soup",
        "Yam with Garden Egg Stew",
      ],
    ],
    ["Beans", ["Gob3 Special"]],
    ["Sides", ["Fried Yam with Pepper"]],
  ],
  "Nhyiaeso Pizza Co.": [
    ["Pasta", ["Spaghetti Bolognese", "Beef Lasagna"]],
    [
      "Mains",
      ["Grilled Chicken with Fries", "Chicken Shawarma", "Classic Beef Burger", "Veggie Burger"],
    ],
    [
      "Sides",
      ["Fries", "Crispy Fried Chicken (2 pieces)", "Chicken Kebab (3 sticks)", "Fried Calamari"],
    ],
    ["Desserts", ["Ice Cream Cone", "Chocolate Cake Slice"]],
  ],
  "Asafo Kenkey House": [
    [
      "Kenkey",
      [
        "Banku with Grilled Tilapia",
        "Banku with Okro Stew",
        "Okro Soup with Fish",
        "Grilled Whole Fish",
        "Crab Stew with Banku",
      ],
    ],
    [
      "Rice",
      ["Jollof with Fried Fish and Plantain", "Waakye with Wele and Fish", "Gari Foto with Egg"],
    ],
    ["Sides", ["Fried Plantain", "Plantain Chips", "Kosai (6 pieces)", "Bofrot (5 pieces)"]],
  ],
  "Tafo Northern Flavours": [
    ["Tuo Zaafi", ["Omo Tuo with Groundnut Soup", "Banku with Okro Stew"]],
    [
      "Grills and Sides",
      [
        "Beef Suya",
        "Chicken Kebab (3 sticks)",
        "Fried Yam with Pepper",
        "Kelewele",
        "Fried Plantain",
      ],
    ],
    ["Morning Bowls", ["Rice Water", "Red Red with Plantain", "Waakye with Wele and Fish"]],
  ],
  "Amakom Asian Kitchen": [
    ["Mains", ["Fried Rice with Protein", "Grilled Prawns", "Grilled Whole Fish"]],
    [
      "Starters",
      [
        "Fried Calamari",
        "Chicken Kebab (3 sticks)",
        "Crispy Fried Chicken (2 pieces)",
        "Chicken Shawarma",
      ],
    ],
    ["Sides", ["Fries", "Loaded Fries", "Plantain Chips", "Chicken Caesar Salad"]],
    ["Desserts", ["Fresh Fruit Salad", "Ice Cream Cone"]],
  ],
  "Patasi Pastries & Smoothies": [
    [
      "Pastries",
      ["Waffles with Strawberries", "Garlic Bread", "Spring Rolls (4 pieces)", "Kosai (6 pieces)"],
    ],
    ["Breakfast", ["Egg Sandwich", "Tea and Bread", "Oats Porridge"]],
    ["Bowls and Treats", ["Yoghurt Parfait", "Fresh Fruit Salad", "Ice Cream Cone"]],
    ["Wraps", ["Chicken Shawarma", "Grilled Chicken Wrap"]],
  ],
  "Ayigya Crispy Chicken": [
    [
      "Chicken",
      [
        "Chicken Kebab (3 sticks)",
        "Chicken Shawarma",
        "Fried Yam with Grilled Chicken",
        "Sweet and Sour Chicken",
        "Chicken Stir Fry with Rice",
        "Stir-fried Noodles with Chicken",
      ],
    ],
    ["Rice", ["Egg Fried Rice", "Jollof Spaghetti", "Waakye Special"]],
    [
      "Sides",
      [
        "Fries",
        "Kelewele",
        "Fried Plantain",
        "Chicken Caesar Salad",
        "Grilled Sausages with Fries",
      ],
    ],
  ],
  "Oforikrom Gob3 Joint": [
    [
      "Gob3",
      [
        "Waakye with Wele and Fish",
        "Waakye with Egg and Gari",
        "Gari Foto with Egg",
        "Ampesi with Kontomire Stew",
        "Yam with Kontomire Stew",
        "Boiled Yam with Egg Stew",
        "Yam with Garden Egg Stew",
      ],
    ],
    ["Sides", ["Fried Yam with Pepper", "Bofrot (5 pieces)", "Kosai (6 pieces)", "Tubaani"]],
  ],
  "Ahinsan Seafood Grill": [
    [
      "From the Grill",
      ["Kenkey with Grilled Tilapia", "Banku with Grilled Tilapia", "Grilled Tilapia with Banku"],
    ],
    [
      "Stews",
      [
        "Jollof with Fried Fish and Plantain",
        "Waakye with Wele and Fish",
        "Ga Kenkey with Shito",
        "Banku with Okro Stew",
      ],
    ],
    ["Sides", ["Fries", "Fried Yam with Pepper", "Kelewele", "Fried Plantain"]],
  ],
  "Manhyia Royal Kitchen": [
    [
      "Traditional",
      [
        "Fufu with Groundnut Soup and Chicken",
        "Fufu with Palm Nut Soup",
        "Fufu with Light Soup and Chicken",
        "Banku with Okro Stew",
        "Okro Soup with Fish",
        "Red Red with Plantain",
        "Jollof with Goat Meat",
      ],
    ],
    ["Sides", ["Kelewele", "Fried Plantain"]],
  ],
  "Danyame Continental Grill": [
    [
      "Mains",
      [
        "Grilled Whole Fish",
        "Grilled Prawns",
        "Fried Calamari",
        "Classic Beef Burger",
        "Chicken Shawarma",
        "Grilled Sausages with Fries",
        "Sweet and Sour Chicken",
        "Chicken Stir Fry with Rice",
        "Margherita",
      ],
    ],
    ["Starters", ["Garlic Bread", "Spring Rolls (4 pieces)"]],
    ["Salads", ["Fresh Fruit Salad"]],
    ["Desserts", ["Chocolate Cake Slice"]],
  ],
  "Atonsu Breakfast Hub": [
    [
      "Breakfast",
      [
        "Waffles with Strawberries",
        "Yoghurt Parfait",
        "Fresh Fruit Salad",
        "Meat Pie",
        "Sausage Roll",
        "Agbeli Kaklo (4 pieces)",
      ],
    ],
    ["Hot Bowls", ["Waakye Special", "Red Red with Plantain", "Tubaani", "Maasa (5 pieces)"]],
  ],
  "Krofrom Sweet Treats": [
    [
      "Snacks",
      [
        "Meat Pie",
        "Sausage Roll",
        "Agbeli Kaklo (4 pieces)",
        "Plantain Chips",
        "Kelewele",
        "Spring Rolls (4 pieces)",
        "Kosai (6 pieces)",
        "Maasa (5 pieces)",
      ],
    ],
    ["Light Bites", ["Egg Sandwich", "Garlic Bread", "Fried Plantain", "Fries", "Loaded Fries"]],
  ],
  "Airport Roundabout Wraps": [
    [
      "Wraps",
      [
        "Chicken Kebab (3 sticks)",
        "Beef Suya",
        "Classic Beef Burger",
        "Veggie Burger",
        "Egg Sandwich",
      ],
    ],
    [
      "Sides",
      [
        "Fries",
        "Kelewele",
        "Fried Yam with Pepper",
        "Garlic Bread",
        "Chicken Caesar Salad",
        "Spring Rolls (4 pieces)",
      ],
    ],
    ["Rice", ["Jollof with Chicken", "Fried Rice and Chicken"]],
  ],
  "Bomso Banku & Tilapia": [
    [
      "Banku",
      [
        "Kenkey with Grilled Tilapia",
        "Grilled Whole Fish",
        "Crab Stew with Banku",
        "Okro Soup with Fish",
        "Ga Kenkey with Shito",
        "Akyeke with Fried Fish",
        "Fufu with Light Soup and Chicken",
      ],
    ],
    [
      "Sides",
      [
        "Fried Plantain",
        "Agbeli Kaklo (4 pieces)",
        "Plantain Chips",
        "Fried Calamari",
        "Grilled Prawns",
      ],
    ],
  ],
  "Kwadaso Rice & Stew Corner": [
    [
      "Rice",
      [
        "Fried Rice with Protein",
        "Jollof with Protein",
        "Egg Fried Rice",
        "Jollof Spaghetti",
        "Waakye with Wele and Fish",
        "Waakye with Egg and Gari",
        "Chicken Stir Fry with Rice",
        "Omo Tuo with Groundnut Soup",
      ],
    ],
    ["Sides", ["Fried Yam with Pepper", "Red Red with Plantain", "Plantain Chips"]],
  ],
};

// Adds the dishes above to each restaurant's menu, copied from wherever they are sold first.
// A category that already exists gets them at its end; a dish already on the menu is skipped.
const withMoreDishes = (restaurants) => {
  // Every dish on any demo menu, by name (the first one found is the one copied)
  const catalogue = new Map();
  for (const restaurant of restaurants) {
    for (const category of restaurant.menu) {
      for (const item of category.items) {
        if (!catalogue.has(item.name)) {
          catalogue.set(item.name, item);
        }
      }
    }
  }

  return restaurants.map((restaurant) => {
    const extra = moreDishes[restaurant.name];
    if (!extra) {
      return restaurant;
    }
    const menu = restaurant.menu.map((category) => ({ ...category, items: [...category.items] }));
    const names = new Set(menu.flatMap((category) => category.items.map((item) => item.name)));
    for (const [categoryName, dishNames] of extra) {
      let target = menu.find((existing) => existing.category === categoryName);
      if (!target) {
        target = { category: categoryName, items: [] };
        menu.push(target);
      }
      for (const name of dishNames) {
        if (!catalogue.has(name)) {
          throw new Error(`menuMoreDishes: "${name}" (${restaurant.name}) isn't on any demo menu`);
        }
        if (!names.has(name)) {
          target.items.push(catalogue.get(name));
          names.add(name);
        }
      }
    }
    return { ...restaurant, menu };
  });
};

module.exports = { withMoreDishes };
