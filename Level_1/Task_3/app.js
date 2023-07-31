const getNumber = (number)=>{
    const displayScreen = document.querySelector('.display_screen')
    let prevValue = displayScreen.value
    displayScreen.value = prevValue+=number
}

const clearCharacters = ()=>{
    const displayScreen = document.querySelector('.display_screen')
    displayScreen.value = ""
}

const performOperation=(op)=>{
    const firstNumber = 
}