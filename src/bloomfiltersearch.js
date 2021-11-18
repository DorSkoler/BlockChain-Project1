const names = ['Abhin', 'Pai', 'dor', 'meirav', 'chair', 'table', 'Achilles', 'Abubakar', 'Absalon', 'Abie', 'Abdullatif', 'Abdulla', 'Abbye', 'Abbagail', 'Abayomi', 'Aarthi', 'Aarik', 'Aamil', 'Aamanda']; // n names
const noOfHashFunction = 6; // number of hash functions

const storage = Array(Math.pow(2, 22) - 1).fill(0); // Bllom filter bit

const hash = (key) => {
  const hashNumbers = [];
  for (let i = 1; i <= noOfHashFunction; i++) {
    hashNumbers.push(
      Math.abs(
        key.split('').reduce((a, b) => ((a << i) - a + b.charCodeAt(0)) | 0, 0)
      )
    );
  }
  return hashNumbers;
};

// Initilizing bloom filter bit for a hash index
names.forEach((name) => {
  const indexes = hash(name);
  indexes.forEach((index) => (storage[index] = 1));
});

const result = [];
const isValueContainInBloom = (searchString) => {
  const hashes = hash(searchString);
  const result = hashes.filter((index) => !storage[index]);
  return !(result.length > 0);
};


console.log(isValueContainInBloom('Pai'));
console.log(isValueContainInBloom('dor'));
console.log(isValueContainInBloom('ariel'));