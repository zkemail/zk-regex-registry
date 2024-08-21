window = self;
const { generateCircuitInputs } = require("./lib/generate_inputs");

onmessage = (event) => {
  let rawEmail = "";
  let externalInputs = {};
  if (typeof event.data  === 'string') {
    rawEmail = event.data;
  } else {
    rawEmail = event.data.rawEmail;
    externalInputs = event.data.inputs;
  }
  generateCircuitInputs(rawEmail, externalInputs).then(inputs => {
    postMessage(inputs);
  }).catch((err) => {
    console.error(err);
    postMessage({ error: err });
  })
};
