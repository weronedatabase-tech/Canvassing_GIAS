const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><p style="color: #1a1a1a">Hello world</p>`);
console.log(dom.window.document.querySelector("p").style.color);
