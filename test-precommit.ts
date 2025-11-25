// Test file with bad formatting
const badFormatting = {
  name: 'test',
  value: 123,
  nested: {
    deep: true,
  },
};

function poorlyFormatted(arg1: string, arg2: number) {
  return arg1 + arg2;
}

export { badFormatting, poorlyFormatted };
