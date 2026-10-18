"use strict";

// Fuller demo menus: Ghanaian food from the south and the north, and a drinks section in every
// restaurant. Added on top of each restaurant's menu in kumasiRestaurants.cjs (a dish that is
// already there, by name, is skipped). Prices are in pesewas.
// photo: a file in data/photos (without .webp), credited in data/photos/credits.json

const dish = (name, photo, description, pricePesewas, tags = []) => ({
  name,
  photo,
  description,
  pricePesewas,
  tags,
});

// The meat for fufu with bush meat: the customer picks one; the dearer meats cost a bit more
const bushMeatChoice = {
  name: "Bush meat",
  minSelect: 1,
  maxSelect: 1,
  options: [
    { name: "Grasscutter (Akrantie)", extraPricePesewas: 0 },
    { name: "Giant pouched rat (Kusie)", extraPricePesewas: 0 },
    { name: "Black duiker (Otwe)", extraPricePesewas: 1500 },
    { name: "Palm civet (Kankane)", extraPricePesewas: 1000 },
  ],
};

// ─────────────────────────────────────────────
// Dishes, written once and used by several restaurants
// ─────────────────────────────────────────────
const D = {
  // Southern soups and swallows
  fufuPalmnut: dish(
    "Fufu with Palm Nut Soup and Goat",
    "fufu-palmnut",
    "Abenkwan with goat meat, pounded fresh.",
    6500,
  ),
  fufuAbunu: dish(
    "Fufu with Abunuabunu",
    "abunuabunu",
    "Green kontomire and garden egg soup with smoked fish.",
    6000,
  ),
  fufuBushMeat: {
    ...dish(
      "Fufu with Light Soup and Bush Meat",
      "fufu-bush-meat",
      "Pounded fufu in spicy light soup with smoked bush meat. Choose your meat.",
      8000,
      ["spicy"],
    ),
    optionGroups: [bushMeatChoice],
  },
  fufuLightChicken: dish(
    "Fufu with Light Soup and Chicken",
    "light-soup-chicken",
    "Spicy tomato light soup with tender chicken.",
    6000,
    ["spicy"],
  ),
  ampesi: dish(
    "Ampesi with Kontomire Stew",
    "ampesi-kontomire",
    "Boiled yam and plantain with cocoyam-leaf stew and egg.",
    4000,
    ["vegetarian"],
  ),
  yamGardenEgg: dish(
    "Yam with Garden Egg Stew",
    "yam-garden-egg",
    "Boiled yam with garden egg and fish stew.",
    3800,
  ),
  plantainAvocado: dish(
    "Plantain, Stew and Avocado",
    "plantain-stew-avocado",
    "Boiled ripe plantain with tomato stew and fresh avocado.",
    3500,
    ["vegetarian"],
  ),
  oto: dish(
    "Oto with Boiled Eggs",
    "oto",
    "Mashed yam in palm oil with boiled eggs, for celebrations.",
    3500,
    ["vegetarian"],
  ),
  omoTuo: dish(
    "Omo Tuo with Groundnut Soup",
    "omo-tuo",
    "Soft rice balls in rich peanut soup with chicken.",
    5000,
    ["contains_nuts"],
  ),
  bankuOkro: dish(
    "Banku with Okro Stew",
    "banku-okro",
    "Fermented corn dough with okro and fish stew.",
    4500,
  ),
  bankuFriedFish: dish(
    "Banku with Fried Fish and Pepper",
    "banku-fried-fish",
    "Banku, crispy fried fish and fresh ground pepper.",
    4500,
    ["spicy"],
  ),
  kenkeyFish: dish(
    "Fante Kenkey with Fried Fish",
    "fante-kenkey-fried-fish",
    "Two balls of Fante kenkey, fried fish and fresh pepper.",
    3500,
    ["spicy"],
  ),
  akyeke: dish(
    "Akyeke with Fried Fish",
    "akyeke-fish",
    "Cassava couscous with fried fish and pepper sauce.",
    4000,
    ["spicy"],
  ),
  // Rice
  jollofGoat: dish(
    "Jollof with Goat Meat",
    "jollof-goat",
    "Smoky jollof with spiced goat meat and salad.",
    5500,
    ["spicy"],
  ),
  jollofFish: dish(
    "Jollof with Fried Fish and Plantain",
    "jollof-fish-plantain",
    "Jollof, fried fish and sweet fried plantain.",
    5000,
  ),
  jollofChicken: dish(
    "Jollof with Chicken",
    "jollof",
    "Party jollof with grilled chicken and salad.",
    4500,
    ["spicy"],
  ),
  friedRiceChicken: dish(
    "Fried Rice and Chicken",
    "fried-rice-and-chicken",
    "Vegetable fried rice with a fried chicken leg.",
    5000,
  ),
  riceBeef: dish(
    "Rice and Beef Stew",
    "rice-beef-stew",
    "Steamed rice with tender beef stew.",
    4000,
  ),
  riceStew: dish(
    "Plain Rice and Stew",
    "rice-stew",
    "Rice with tomato stew and a boiled egg.",
    2500,
  ),
  waakye: dish(
    "Waakye Special",
    "waakye-special",
    "Rice and beans with spaghetti, gari, egg and shito.",
    3500,
    ["spicy"],
  ),
  waakyeEgg: dish(
    "Waakye with Egg and Gari",
    "cover-waakye",
    "Waakye with boiled egg, gari, spaghetti and stew.",
    3000,
  ),
  gariFoto: dish(
    "Gari Foto with Egg",
    "gari-foto",
    "Gari soaked in tomato stew with scrambled egg.",
    2500,
    ["vegetarian"],
  ),
  // Northern
  tuoAyoyo: dish(
    "Tuo Zaafi with Ayoyo Soup",
    "tuo-zaafi-ayoyo",
    "Soft TZ with green ayoyo soup and wagashi.",
    3500,
  ),
  wasawasa: dish(
    "Wasawasa",
    "wasawasa",
    "Steamed yam-flour bites with shito, onions and pepper.",
    2500,
    ["vegan", "spicy"],
  ),
  maasa: dish("Maasa (5 pieces)", "maasa", "Soft rice and millet cakes, lightly fried.", 1500, [
    "vegetarian",
  ]),
  tubaani: dish("Tubaani", "tubaani", "Steamed bean cakes wrapped in leaves, with shito.", 2000, [
    "vegan",
    "spicy",
  ]),
  hausaKoko: dish(
    "Hausa Koko with Koose",
    "hausa-koko",
    "Spiced millet porridge with bean fritters.",
    1500,
    ["vegan", "spicy"],
  ),
  kosai: dish("Kosai (6 pieces)", "kosai", "Bean fritters, crisp outside and soft inside.", 1200, [
    "vegan",
  ]),
  riceWater: dish(
    "Rice Water",
    "rice-water",
    "Sweet rice porridge with milk, the comfort breakfast.",
    1500,
    ["vegetarian"],
  ),
  // Grills, snacks and sides
  chichinga: dish(
    "Chichinga (4 sticks)",
    "suya",
    "Spiced beef kebab, grilled over charcoal.",
    3000,
    ["spicy", "contains_nuts"],
  ),
  friedYam: dish(
    "Fried Yam with Pepper",
    "fried-yam-plain",
    "Crispy yam with hot shito pepper.",
    2000,
    ["vegan", "spicy"],
  ),
  kelewele: dish("Kelewele", "kelewele", "Ginger-spiced fried ripe plantain.", 1500, [
    "vegan",
    "spicy",
  ]),
  plantainChips: dish("Plantain Chips", "plantain-chips", "Thin, crunchy plantain chips.", 1000, [
    "vegan",
  ]),
  agbeliKaklo: dish(
    "Agbeli Kaklo (4 pieces)",
    "agbeli-kaklo",
    "Fried cassava balls, crisp and chewy.",
    1200,
    ["vegan"],
  ),
  bofrot: dish(
    "Bofrot (5 pieces)",
    "bofrot",
    "Sweet Ghanaian doughnuts, fried this morning.",
    1000,
    ["vegetarian"],
  ),
  friedPlantain: dish(
    "Fried Plantain",
    "fried-plantain",
    "Sweet ripe plantain, fried golden.",
    1500,
    ["vegan"],
  ),
  wings: dish(
    "Spicy Chicken Wings (6)",
    "spicy-chicken-wings",
    "Wings tossed in hot sauce, with a cooling dip.",
    4500,
    ["spicy"],
  ),
  friedChicken: dish(
    "Crispy Fried Chicken (2 pieces)",
    "crispy-fried-chicken",
    "Golden, crunchy chicken with a little pepper.",
    4000,
    ["spicy"],
  ),
  loadedFries: dish(
    "Loaded Fries",
    "loaded-fries",
    "Fries with spicy beef, cheese and sauce.",
    3500,
    ["spicy"],
  ),
  chickenWrap: dish(
    "Grilled Chicken Wrap",
    "chicken-wrap",
    "Grilled chicken, salad and garlic sauce in a tortilla.",
    4000,
  ),
  grilledChickenFries: dish(
    "Grilled Chicken with Fries",
    "grilled-chicken-fries",
    "Quarter chicken, peri-peri glaze and crispy fries.",
    6500,
    ["spicy"],
  ),
  caesar: dish(
    "Chicken Caesar Salad",
    "caesar-salad",
    "Romaine, croutons, parmesan and Caesar dressing.",
    6000,
  ),
  pancakes: dish(
    "Pancakes with Syrup",
    "pancakes",
    "A stack of fluffy pancakes with syrup.",
    3000,
    ["vegetarian"],
  ),
  cake: dish("Chocolate Cake Slice", "chocolate-cake", "Rich chocolate cake with ganache.", 2500, [
    "vegetarian",
  ]),
  doughnut: dish("Sugar Doughnut", "sugar-doughnut", "Soft doughnut rolled in sugar.", 600, [
    "vegetarian",
  ]),
  teaBread: dish("Tea and Bread", "tea-and-bread", "Hot milky tea with buttered tea bread.", 1200, [
    "vegetarian",
  ]),
};

// ─────────────────────────────────────────────
// Drinks: local, juices, soft drinks and water, hot drinks, smoothies and shakes
// ─────────────────────────────────────────────
const DRINK = {
  sobolo: dish("Sobolo", "sobolo", "Chilled hibiscus drink with ginger.", 1000, ["vegan"]),
  asaana: dish("Asaana", "asaana", "Caramelised corn drink.", 1000, ["vegan"]),
  brukina: dish("Brukina", "brukina", "Millet and fresh milk, served cold.", 1500, ["vegetarian"]),
  lamugin: dish("Lamugin (Ginger Drink)", "lamugin", "Spicy ginger and pineapple drink.", 1000, [
    "vegan",
    "spicy",
  ]),
  coconut: dish("Fresh Coconut", "coconut", "Cold coconut, opened for you.", 1200, ["vegan"]),
  pineapple: dish("Pineapple Juice", "pineapple-juice", "Freshly pressed, no sugar added.", 1500, [
    "vegan",
  ]),
  mango: dish("Fresh Mango Juice", "mango-juice", "Kumasi mangoes, pressed today.", 1500, [
    "vegan",
  ]),
  orange: dish("Fresh Orange Juice", "orange-juice", "Squeezed this morning.", 1200, ["vegan"]),
  watermelon: dish(
    "Watermelon Juice",
    "watermelon-juice",
    "Fresh watermelon, blended cold.",
    1200,
    ["vegan"],
  ),
  water: dish("Bottled Water (750ml)", "bottled-water", "Chilled mineral water.", 500, ["vegan"]),
  soda: dish(
    "Chilled Soft Drink",
    "soft-drink",
    "Cola, orange or lemon-lime soda, ice cold.",
    800,
    ["vegan"],
  ),
  tea: dish("Hot Tea", "hot-tea", "Black tea with milk and sugar on the side.", 800, [
    "vegetarian",
  ]),
  coffee: dish("Coffee", "coffee", "Hot coffee, black or with milk.", 1500, ["vegetarian"]),
  hotChocolate: dish("Hot Chocolate", "hot-chocolate", "Rich hot chocolate made with milk.", 1500, [
    "vegetarian",
  ]),
  smoothie: dish(
    "Green Fruit Smoothie",
    "fruit-smoothie",
    "Kiwi, banana and pineapple, blended cold.",
    2500,
    ["vegan"],
  ),
  milkshake: dish(
    "Chocolate Milkshake",
    "milkshake",
    "Thick and cold, made with real ice cream.",
    3000,
    ["vegetarian"],
  ),
};

const localDrinks = [DRINK.sobolo, DRINK.asaana, DRINK.brukina, DRINK.lamugin, DRINK.coconut];
const juices = [DRINK.pineapple, DRINK.mango, DRINK.orange, DRINK.watermelon];
const softDrinks = [DRINK.soda, DRINK.water];
const hotDrinks = [DRINK.tea, DRINK.coffee, DRINK.hotChocolate];
const shakes = [DRINK.smoothie, DRINK.milkshake];

const cat = (category, items) => ({ category, items });

// ─────────────────────────────────────────────
// What each restaurant adds (by restaurant name)
// ─────────────────────────────────────────────
const additions = {
  "Maame Akua's Chop Bar": [
    cat("Soups and Fufu", [
      D.fufuBushMeat,
      D.fufuPalmnut,
      D.fufuAbunu,
      D.fufuLightChicken,
      D.yamGardenEgg,
      D.bankuFriedFish,
    ]),
    cat("Sides", [D.agbeliKaklo, D.plantainChips]),
    cat("Drinks", [...localDrinks, ...softDrinks]),
  ],
  "Bantama Waakye Joint": [
    cat("Waakye", [D.waakyeEgg, D.gariFoto]),
    cat("Breakfast", [D.riceWater, D.kosai, D.teaBread]),
    cat("Drinks", [DRINK.sobolo, DRINK.lamugin, DRINK.tea, ...softDrinks]),
  ],
  "Garden City Grills": [
    cat("Grills", [D.chichinga, D.bankuFriedFish]),
    cat("Sides", [D.friedYam, D.plantainChips, D.friedPlantain]),
    cat("Drinks", [...juices, ...softDrinks, DRINK.sobolo]),
  ],
  "Campus Bites": [
    cat("Burgers", [D.chickenWrap]),
    cat("Sides", [D.loadedFries, D.friedChicken, D.wings]),
    cat("Rice", [D.jollofChicken, D.friedRiceChicken]),
    cat("Drinks", [...softDrinks, DRINK.smoothie, DRINK.sobolo]),
  ],
  "Golden Pot Kitchen": [
    cat("Rice Dishes", [D.jollofGoat, D.jollofFish, D.friedRiceChicken, D.riceBeef, D.riceStew]),
    cat("Sides", [D.friedPlantain, D.kelewele]),
    cat("Drinks", [DRINK.sobolo, DRINK.mango, ...softDrinks]),
  ],
  "Nhyiaeso Pizza Co.": [
    cat("Sides", [D.wings, D.loadedFries, D.caesar]),
    cat("Drinks", [...softDrinks, ...juices, DRINK.milkshake]),
  ],
  "Asafo Kenkey House": [
    cat("Kenkey", [D.bankuFriedFish, D.akyeke]),
    cat("Sides", [D.agbeliKaklo, D.kelewele]),
    cat("Drinks", [DRINK.sobolo, DRINK.asaana, DRINK.lamugin, ...softDrinks]),
  ],
  "Tafo Northern Flavours": [
    cat("Tuo Zaafi", [D.wasawasa, D.tubaani, D.maasa]),
    cat("Grills and Sides", [D.chichinga, D.hausaKoko, D.waakye]),
    cat("Drinks", [DRINK.brukina, DRINK.lamugin, DRINK.sobolo, DRINK.water]),
  ],
  "Amakom Asian Kitchen": [
    cat("Mains", [D.friedRiceChicken]),
    cat("Starters", [D.wings]),
    cat("Drinks", [...softDrinks, DRINK.tea, DRINK.watermelon, DRINK.orange]),
  ],
  "Patasi Pastries & Smoothies": [
    cat("Pastries", [D.bofrot, D.pancakes, D.agbeliKaklo, D.plantainChips]),
    cat("Smoothies and Juice", [DRINK.milkshake, DRINK.orange, DRINK.watermelon, DRINK.pineapple]),
    cat("Hot Drinks", hotDrinks),
  ],
  "Ayigya Crispy Chicken": [
    cat("Chicken", [D.chickenWrap, D.jollofChicken, D.grilledChickenFries]),
    cat("Sides and Drinks", [D.loadedFries, D.plantainChips, ...softDrinks, DRINK.sobolo]),
  ],
  "Oforikrom Gob3 Joint": [
    cat("Gob3", [D.plantainAvocado, D.akyeke]),
    cat("Sides", [D.agbeliKaklo, D.friedPlantain, D.plantainChips]),
    cat("Drinks", [...localDrinks, DRINK.water]),
  ],
  "Ahinsan Seafood Grill": [
    cat("From the Grill", [D.bankuFriedFish, D.kenkeyFish]),
    cat("Stews", [D.akyeke, D.fufuLightChicken]),
    cat("Drinks", [...juices, ...softDrinks, DRINK.coconut]),
  ],
  "Manhyia Royal Kitchen": [
    cat("Traditional", [
      D.fufuBushMeat,
      D.oto,
      D.fufuPalmnut,
      D.fufuAbunu,
      D.ampesi,
      D.yamGardenEgg,
      D.omoTuo,
      D.plantainAvocado,
    ]),
    cat("Drinks", [DRINK.sobolo, DRINK.brukina, DRINK.lamugin, DRINK.coconut, DRINK.water]),
  ],
  "Danyame Continental Grill": [
    cat("Mains", [D.grilledChickenFries, D.jollofGoat, D.friedRiceChicken]),
    cat("Salads", [D.wings]),
    cat("Drinks", [...juices, ...softDrinks, DRINK.coffee, DRINK.milkshake]),
  ],
  "Atonsu Breakfast Hub": [
    cat("Breakfast", [D.riceWater, D.bofrot, D.doughnut, D.gariFoto]),
    cat("Hot Bowls", [D.kosai, D.waakyeEgg]),
    cat("Drinks", [...hotDrinks, DRINK.orange, DRINK.water]),
  ],
  "Krofrom Sweet Treats": [
    cat("Desserts", [D.pancakes, D.cake, D.doughnut, D.bofrot]),
    cat("Drinks", [...shakes, ...juices, DRINK.hotChocolate]),
  ],
  "Airport Roundabout Wraps": [
    cat("Wraps", [D.friedChicken]),
    cat("Sides", [D.wings, D.plantainChips, D.friedPlantain]),
    cat("Drinks", [...softDrinks, DRINK.milkshake, DRINK.sobolo]),
  ],
  "Bomso Banku & Tilapia": [
    cat("Banku", [D.bankuFriedFish, D.kenkeyFish]),
    cat("Sides", [D.kelewele, D.friedYam, D.chichinga]),
    cat("Drinks", [DRINK.sobolo, DRINK.coconut, ...softDrinks]),
  ],
  "Kwadaso Rice & Stew Corner": [
    cat("Rice", [D.jollofGoat, D.jollofFish, D.friedRiceChicken, D.waakye, D.gariFoto]),
    cat("Sides", [D.friedPlantain, D.kelewele]),
    cat("Drinks", [DRINK.sobolo, DRINK.asaana, ...softDrinks]),
  ],
};

// Adds each restaurant's extra categories and dishes to its menu. A category that already
// exists gets the new dishes at its end; a dish already on the menu (by name) is skipped.
const withAdditions = (restaurants) =>
  restaurants.map((restaurant) => {
    const extra = additions[restaurant.name];
    if (!extra) {
      return restaurant;
    }
    const menu = restaurant.menu.map((category) => ({ ...category, items: [...category.items] }));
    const names = new Set(menu.flatMap((category) => category.items.map((item) => item.name)));
    for (const { category, items } of extra) {
      let target = menu.find((existing) => existing.category === category);
      if (!target) {
        target = { category, items: [] };
        menu.push(target);
      }
      for (const item of items) {
        if (!names.has(item.name)) {
          target.items.push(item);
          names.add(item.name);
        }
      }
    }
    return { ...restaurant, menu };
  });

module.exports = { withAdditions };
