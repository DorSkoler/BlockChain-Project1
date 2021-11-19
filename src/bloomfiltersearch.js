const { BloomFilter } = require('bloom-filters');
const filter = new BloomFilter(40000, 6);

const readFromStorage = () => {
  var fs = require('fs-extra');
  var text = fs.readFileSync('./names.txt', 'utf8');
  const namesFromTxt = text.split('\r\n');
  namesFromTxt.forEach((name) => {
    filter.add(name);
  });
};

filter.add('bob');
readFromStorage();
console.log(filter.has('bob')); // output: true
console.log(filter.has('daniel')); // output: false
console.log(filter.rate());
