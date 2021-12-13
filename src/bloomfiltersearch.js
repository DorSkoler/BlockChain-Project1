const { BloomFilter } = require('bloom-filters');
const filter = new BloomFilter(10000, 6);

const readFromStorage = () => {
  var fs = require('fs-extra');
  var text = fs.readFileSync('./names.txt', 'utf8');
  const namesFromTxt = text.split('\r\n');
  console.log(namesFromTxt);
  namesFromTxt.forEach((name) => {
    filter.add(name);
  });
};

readFromStorage();
console.log(filter.has('Daniel')); // output: true
console.log(filter.has('ascii')); // output: false
console.log(filter.rate());
