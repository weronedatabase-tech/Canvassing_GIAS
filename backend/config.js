const APP_ENV = "Exp"; // Manually set to "Prod" or "Exp"

const CONFIG = {
  Prod: {
    GAS_URL: "https://script.google.com/macros/s/AKfycbwAyvNvIrXnoBMDd3cyE7YW5CTdYrbNOYLYhngWu01o3yXjUszJWSHeEGVcNwhIYWnq/exec",
    ROOT_FOLDER_ID: "1A8jf8VQ7B5zAc7D4sEcW-Kr04V3XTKWT"
  },
  Exp: {
    GAS_URL: "https://script.google.com/macros/s/AKfycbwmZ6I25MVymTnT4eVDRDePB_55XspHCJGhi3birjKpDzMF91QUJ2MQWDPQw5StFPiYeA/exec",
    ROOT_FOLDER_ID: "1jxtNLplzC4NIjJ8xc2LHlxyTe_hbqTqM"
  }
};

const GAS_URL = CONFIG[APP_ENV].GAS_URL;
const ROOT_FOLDER_ID = CONFIG[APP_ENV].ROOT_FOLDER_ID;
