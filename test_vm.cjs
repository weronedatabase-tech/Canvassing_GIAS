const vm = require('vm');
const code = `
const APP_ENV = "Exp";
const CONFIG = { Prod: { GAS_URL: "prod_url" }, Exp: { GAS_URL: "exp_url" } };
const GAS_URL = CONFIG[APP_ENV].GAS_URL;
`;
const script = new vm.Script(code + '\n;({GAS_URL, APP_ENV})');
const result = script.runInNewContext({});
console.log(result);
