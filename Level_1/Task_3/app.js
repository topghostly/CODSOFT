//
//// Solution to task 3 of level 2
//

// Make variables 👷‍♂️
let number1, number2, operator, newOperator;
// The variable newOperator is so the user can perform multiple operations without having Clear the screen each time

//Function to get the number thats clicked on screen
const getNumber = (number) => {
  // Get the input element
  // The displayScreen displays the results and inputted digits, while the keypadScreen gets the inputed digits for calculation
  const displayScreen = document.querySelector(".display_screen");
  const keypadScreen = document.querySelector(".keypad_screen");
  let prevValue = keypadScreen.value;
  let newNumber = prevValue + number;
  keypadScreen.value = newNumber;
  displayScreen.value = newNumber;
};

// Function for the blinking alert for the need to cler the screen 🚨
const blinkAlert = () => {
  const ACbutton = document.querySelector(".AC");
  ACbutton.classList.add("blink");
};

// Function to clear the screen and calculation history 🚔
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

// Function to calculate the digits based on the operator (op) 👨‍🏭
const calculate = (op, num1, num2) => {
  const keypadScreen = document.querySelector(".keypad_screen");
  const displayScreen = document.querySelector(".display_screen");
  switch (op) {
    // If the operator is '+'
    case "+":
      var result = Number(num1) + Number(num2);
      keypadScreen.value = result;
      displayScreen.value = result;
      resetValue(result);
      break;

    // If the operator is '-'
    case "-":
      var result = Number(num1) - Number(num2);
      keypadScreen.value = result;
      displayScreen.value = result;
      resetValue(result);
      break;

    // If the operator is '*'
    case "*":
      var result = Number(num1) * Number(num2);
      keypadScreen.value = result;
      displayScreen.value = result;
      resetValue(result);
      break;

    // If the operator is '/'
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

// Fuction to perform multiple calculations at a time
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

// Fuction to display the final answer when the '=' is pressed
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
