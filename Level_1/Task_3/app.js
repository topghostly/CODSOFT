let number1, number2, operator, newOperator;

const getNumber = (number) => {
  const displayScreen = document.querySelector(".display_screen");
  const keypadScreen = document.querySelector(".keypad_screen");
  let prevValue = keypadScreen.value;
  let newNumber = prevValue + number;
  keypadScreen.value = newNumber;
  displayScreen.value = newNumber;
};
const blinkAlert = () => {
  const ACbutton = document.querySelector(".AC");
  ACbutton.classList.add("blink");
};

const clearCharacters = () => {
  console.log("Doing this");
  const keypadScreen = document.querySelector(".keypad_screen");
  const displayScreen = document.querySelector(".display_screen");
  keypadScreen.value = "";
  displayScreen.value = "";
  number1 = null;
  number2 = null;
  operator = null;
  newOperator = null;

  const ACbutton = document.querySelector(".AC");
  ACbutton.classList.remove("blink");
};
const check = () => {
  if (number1 && number2 && operator) {
    calculate(operator, number1, number2);
  }
};

const performOperation = (op) => {
  const keypadScreen = document.querySelector(".keypad_screen");
  const number = keypadScreen.value;

  if (number1) {
    number2 = number;
  } else {
    number1 = number;
  }

  if (operator) {
    newOperator = op;
  } else {
    operator = op;
  }
  check();
  keypadScreen.value = "";
};

const calculate = (op, num1, num2) => {
  const keypadScreen = document.querySelector(".keypad_screen");
  const displayScreen = document.querySelector(".display_screen");
  switch (op) {
    case "+":
      var result = Number(num1) + Number(num2);
      keypadScreen.value = result;
      displayScreen.value = result;
      resetValue(result);
      break;
    case "-":
      var result = Number(num1) - Number(num2);
      keypadScreen.value = result;
      displayScreen.value = result;
      resetValue(result);
      break;
    case "*":
      var result = Number(num1) * Number(num2);
      keypadScreen.value = result;
      displayScreen.value = result;
      resetValue(result);
      break;
    case "/":
      var result = Number(num1) / Number(num2);
      keypadScreen.value = result;
      displayScreen.value = result;
      resetValue(result);
      break;
    default:
      keypadScreen.value = "";
      break;
  }
};
const resetValue = (result) => {
  console.log("Resetting values");
  number1 = result;
  number2 = null;
  operator = newOperator;
  newOperator = null;
  console.log(
    `number1: ${number1}, number2: ${number2}, operator: ${operator}, newOperatoe: ${newOperator}`
  );
};

const finalAnswer = () => {
  const keypadScreen = document.querySelector(".keypad_screen");
  const buttons = document.querySelectorAll(".button");
  let newNumber2 = keypadScreen.value;
  calculate(operator, number1, newNumber2);
  number1 = null;
  number2 = null;
  operator = null;
  newOperator = null;

  blinkAlert();
};
