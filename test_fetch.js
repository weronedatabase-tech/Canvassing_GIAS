const url = "https://script.google.com/macros/s/AKfycbxpgGDFHHhENaWSd50Vm70C5kioPu9nba89QDN4dJ8W-JsHsQfMZNJpIH_YqnlwROmf/exec";
fetch(url, { method: 'POST', body: JSON.stringify({action: 'INIT'}) })
  .then(res => res.text())
  .then(console.log)
  .catch(console.error);
