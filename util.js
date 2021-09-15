export const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
};

export const floatToBigInt = (num) => {
  let string = num.toString();
  let exploded = string.split(".");
  if (exploded[1].length > 10) {
    exploded[1] = exploded[1].substr(0, 10);
  }
  if (exploded[1].length < 10) {
    exploded[1] = exploded[1].padEnd(10, "0");
  }
  return BigInt(`${exploded[0]}${exploded[1]}`);
};
