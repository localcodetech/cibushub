"use strict";

module.exports = {
  // One Ghana Card, one rider account: someone suspended can't simply sign up again
  async up(queryInterface) {
    await queryInterface.addIndex("rider_profiles", ["ghana_card_number"], {
      unique: true,
      name: "rider_profiles_ghana_card_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("rider_profiles", "rider_profiles_ghana_card_unique");
  },
};
