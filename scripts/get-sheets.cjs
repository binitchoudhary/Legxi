const fs = require('fs');
fetch('https://docs.google.com/spreadsheets/d/1A6vK2Sv-7oWCq9Mr8IO6bnEqhONqLC8Xt6HCoF8aAx0/edit')
  .then(res => res.text())
  .then(html => {
    const matches = [...html.matchAll(/"name":"(.*?)","gid":(\d+)/g)];
    matches.forEach(m => console.log(m[1], m[2]));
  });
