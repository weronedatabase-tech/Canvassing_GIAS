const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

code = code.replace(
  /\<img src="https:\/\/lh3\.googleusercontent\.com\/d\/\$\{p\.imageId\}" class="w-24 h-24 object-cover rounded-md"\>/g,
  '<img src="https://lh3.googleusercontent.com/d/${p.imageId}" class="w-24 h-24 shrink-0 self-start object-cover rounded-md">'
);

code = code.replace(
  /\<div class="w-24 h-24 bg-gray-200 rounded-md flex items-center justify-center text-gray-400"\>No Image\<\/div\>/g,
  '<div class="w-24 h-24 shrink-0 self-start bg-gray-200 rounded-md flex items-center justify-center text-gray-400">No Image</div>'
);

fs.writeFileSync('frontend/js/app.js', code);
