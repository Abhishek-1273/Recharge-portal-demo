// Indian Telecom Operator Real Plans Catalog (Airtel, Jio, Vi, BSNL)
// Used by both Web Portal and Future Mobile Android APK

const PLANS_DATA = {
  Airtel: [
    {
      id: 'airtel_299',
      category: 'Popular',
      amountInr: 299,
      validity: '28 Days',
      data: '1.5 GB/day',
      calls: 'Truly Unlimited',
      sms: '100 SMS/day',
      perks: 'Apollo 24|7 Circle, Free Hellotunes, Wynk Music',
      popular: true
    },
    {
      id: 'airtel_349',
      category: 'Popular',
      amountInr: 349,
      validity: '28 Days',
      data: '2 GB/day',
      calls: 'Truly Unlimited',
      sms: '100 SMS/day',
      perks: 'Unlimited 5G Data, Xstream Play, Wynk Music',
      popular: true
    },
    {
      id: 'airtel_666',
      category: 'Popular',
      amountInr: 666,
      validity: '84 Days',
      data: '1.5 GB/day',
      calls: 'Truly Unlimited',
      sms: '100 SMS/day',
      perks: 'RewardMini Subscription, Wynk Music, Hellotunes',
      popular: true
    },
    {
      id: 'airtel_979',
      category: 'Popular',
      amountInr: 979,
      validity: '84 Days',
      data: '2 GB/day',
      calls: 'Truly Unlimited',
      sms: '100 SMS/day',
      perks: 'Unlimited 5G + Airtel Xstream Play (22+ Premium OTTs)',
      popular: false
    },
    {
      id: 'airtel_3599',
      category: 'Annual',
      amountInr: 3599,
      validity: '365 Days',
      data: '2 GB/day',
      calls: 'Truly Unlimited',
      sms: '100 SMS/day',
      perks: 'Unlimited 5G, Full Year Peace of Mind, Xstream Play',
      popular: false
    },
    {
      id: 'airtel_19',
      category: 'Data',
      amountInr: 19,
      validity: '1 Day',
      data: '1 GB',
      calls: 'No Calls',
      sms: 'No SMS',
      perks: 'High-speed Booster Data for Urgent Usage',
      popular: false
    },
    {
      id: 'airtel_29',
      category: 'Data',
      amountInr: 29,
      validity: '1 Day',
      data: '2 GB',
      calls: 'No Calls',
      sms: 'No SMS',
      perks: 'Super Booster 4G/5G Add-on Data',
      popular: false
    },
    {
      id: 'airtel_65',
      category: 'Data',
      amountInr: 65,
      validity: 'Active Plan',
      data: '4 GB',
      calls: 'No Calls',
      sms: 'No SMS',
      perks: 'Valid till your existing recharge validity',
      popular: false
    },
    {
      id: 'airtel_179',
      category: 'Voice',
      amountInr: 179,
      validity: '28 Days',
      data: '2 GB total',
      calls: 'Truly Unlimited',
      sms: '300 SMS total',
      perks: 'Budget Calling Pack + Free Hellotunes',
      popular: false
    },
    {
      id: 'airtel_459',
      category: 'Voice',
      amountInr: 459,
      validity: '84 Days',
      data: '6 GB total',
      calls: 'Truly Unlimited',
      sms: '900 SMS total',
      perks: 'Long Validity Value Pack for Non-Heavy Internet Users',
      popular: false
    }
  ],

  Jio: [
    {
      id: 'jio_299',
      category: 'Popular',
      amountInr: 299,
      validity: '28 Days',
      data: '1.5 GB/day',
      calls: 'Unlimited Voice',
      sms: '100 SMS/day',
      perks: 'JioCinema, JioTV, JioCloud complimentary access',
      popular: true
    },
    {
      id: 'jio_349',
      category: 'Popular',
      amountInr: 349,
      validity: '28 Days',
      data: '2 GB/day',
      calls: 'Unlimited Voice',
      sms: '100 SMS/day',
      perks: 'True 5G Unlimited Data with Welcome Offer',
      popular: true
    },
    {
      id: 'jio_666',
      category: 'Popular',
      amountInr: 666,
      validity: '70 Days',
      data: '1.5 GB/day',
      calls: 'Unlimited Voice',
      sms: '100 SMS/day',
      perks: 'Popular 70-day Hero Pack + Jio Apps suite',
      popular: true
    },
    {
      id: 'jio_899',
      category: 'Popular',
      amountInr: 899,
      validity: '90 Days',
      data: '2 GB/day + 20 GB extra',
      calls: 'Unlimited Voice',
      sms: '100 SMS/day',
      perks: 'Unlimited True 5G + Extra 20GB High-Speed Data Voucher',
      popular: false
    },
    {
      id: 'jio_3599',
      category: 'Annual',
      amountInr: 3599,
      validity: '365 Days',
      data: '2.5 GB/day',
      calls: 'Unlimited Voice',
      sms: '100 SMS/day',
      perks: 'Unlimited True 5G Data All Year, JioCinema Premium',
      popular: false
    },
    {
      id: 'jio_19',
      category: 'Data',
      amountInr: 19,
      validity: 'Active Plan',
      data: '1.5 GB',
      calls: 'No Calls',
      sms: 'No SMS',
      perks: 'Instant Jio 4G/5G High Speed Data Booster',
      popular: false
    },
    {
      id: 'jio_29',
      category: 'Data',
      amountInr: 29,
      validity: 'Active Plan',
      data: '2.5 GB',
      calls: 'No Calls',
      sms: 'No SMS',
      perks: 'Super Top-up Booster Voucher',
      popular: false
    },
    {
      id: 'jio_69',
      category: 'Data',
      amountInr: 69,
      validity: 'Active Plan',
      data: '6 GB',
      calls: 'No Calls',
      sms: 'No SMS',
      perks: 'Bulk Add-on Data without daily limit',
      popular: false
    },
    {
      id: 'jio_189',
      category: 'Voice',
      amountInr: 189,
      validity: '28 Days',
      data: '2 GB total',
      calls: 'Unlimited Voice',
      sms: '300 SMS total',
      perks: 'Jio Value Pack for Essential Calling',
      popular: false
    },
    {
      id: 'jio_479',
      category: 'Voice',
      amountInr: 479,
      validity: '84 Days',
      data: '6 GB total',
      calls: 'Unlimited Voice',
      sms: '900 SMS total',
      perks: '84 Days Budget Calling Pack with Jio Apps',
      popular: false
    }
  ],

  Vi: [
    {
      id: 'vi_299',
      category: 'Popular',
      amountInr: 299,
      validity: '28 Days',
      data: '1.5 GB/day',
      calls: 'Truly Unlimited',
      sms: '100 SMS/day',
      perks: 'Binge All Night (12 AM - 6 AM Free Data) + Data Delight',
      popular: true
    },
    {
      id: 'vi_349',
      category: 'Popular',
      amountInr: 349,
      validity: '28 Days',
      data: '1.5 GB/day',
      calls: 'Truly Unlimited',
      sms: '100 SMS/day',
      perks: 'Weekend Data Rollover + Binge All Night Unlimited',
      popular: true
    },
    {
      id: 'vi_719',
      category: 'Popular',
      amountInr: 719,
      validity: '84 Days',
      data: '1.5 GB/day',
      calls: 'Truly Unlimited',
      sms: '100 SMS/day',
      perks: 'Hero Unlimited: All Night Free Data + Rollover',
      popular: true
    },
    {
      id: 'vi_22',
      category: 'Data',
      amountInr: 22,
      validity: '1 Day',
      data: '1 GB',
      calls: 'No Calls',
      sms: 'No SMS',
      perks: 'Instant Data Pack',
      popular: false
    },
    {
      id: 'vi_49',
      category: 'Data',
      amountInr: 49,
      validity: '1 Day (24 hrs)',
      data: '20 GB',
      calls: 'No Calls',
      sms: 'No SMS',
      perks: 'Super Unlimited High-Speed Cinema Night Pack',
      popular: false
    },
    {
      id: 'vi_179',
      category: 'Voice',
      amountInr: 179,
      validity: '28 Days',
      data: '2 GB total',
      calls: 'Truly Unlimited',
      sms: '300 SMS total',
      perks: 'Unlimited Calling Value Pack',
      popular: false
    }
  ],

  BSNL: [
    {
      id: 'bsnl_147',
      category: 'Popular',
      amountInr: 147,
      validity: '30 Days',
      data: '10 GB total',
      calls: 'Unlimited Calls',
      sms: 'No SMS',
      perks: 'BSNL Tunes + Full 30 Days Calendar Validity',
      popular: true
    },
    {
      id: 'bsnl_199',
      category: 'Popular',
      amountInr: 199,
      validity: '30 Days',
      data: '2 GB/day',
      calls: 'Unlimited Calls',
      sms: '100 SMS/day',
      perks: 'Affordable 2GB/day High Speed Data Pack',
      popular: true
    },
    {
      id: 'bsnl_397',
      category: 'Voice',
      amountInr: 397,
      validity: '150 Days',
      data: '2 GB/day (first 30 days)',
      calls: 'Unlimited (first 30 days)',
      sms: '100 SMS/day',
      perks: 'Super Long 150 Days SIM Active Validity',
      popular: true
    },
    {
      id: 'bsnl_1999',
      category: 'Annual',
      amountInr: 1999,
      validity: '365 Days',
      data: '600 GB total',
      calls: 'Unlimited Calls',
      sms: '100 SMS/day',
      perks: 'Full 1-Year Validity with Bulk 600 GB Data',
      popular: false
    }
  ]
};

function getPlans(operator) {
  const op = operator || 'Airtel';
  return PLANS_DATA[op] || PLANS_DATA['Airtel'];
}

module.exports = {
  PLANS_DATA,
  getPlans
};

