const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

const code = `
const fn = (n) => {
  console.log(n*n);
}
`;

const ast = parse(code); //将原code转为AST

traverse(ast, {
  enter(path) {
    if (path.node.name === 'n') {
      path.node.name = 'x';
    }
  },
});

console.log('new ast', ast);

const newCode = generate(ast).code;

console.log(newCode);
